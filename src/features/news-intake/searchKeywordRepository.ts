import {
  defaultNaverNewsSearchKeywords,
  type NaverNewsItem,
  type NaverNewsCollectionResponse,
  type NaverNewsSearchConfig,
  type NaverNewsSearchResponse,
} from './types'

type NewsSearchConfigApiResponse = {
  keywords?: unknown
  updatedAt?: unknown
  source?: unknown
  error?: unknown
}

type NaverNewsSearchApiResponse = Partial<NaverNewsSearchResponse> & {
  error?: unknown
}

type NaverNewsCollectionApiResponse = Partial<NaverNewsCollectionResponse> & {
  error?: unknown
}

let cachedConfig: NaverNewsSearchConfig | null = null

function normalizeKeywords(value: unknown) {
  if (!Array.isArray(value)) return [...defaultNaverNewsSearchKeywords]

  const keywords = value
    .filter((keyword): keyword is string => typeof keyword === 'string')
    .map((keyword) => keyword.trim())
    .filter(Boolean)

  return [...new Set(keywords)]
}

function normalizeConfig(payload: NewsSearchConfigApiResponse): NaverNewsSearchConfig {
  const keywords = normalizeKeywords(payload.keywords)

  return {
    keywords: keywords.length ? keywords : [...defaultNaverNewsSearchKeywords],
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null,
    source: payload.source === 'shared' ? 'shared' : 'default',
  }
}

export async function readNaverNewsSearchConfig(force = false) {
  if (!force && cachedConfig) return cachedConfig

  const response = await fetch('/api/news/search-config')
  const payload = await response.json() as NewsSearchConfigApiResponse

  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : '네이버 뉴스 검색어를 불러오지 못했습니다.')
  }

  cachedConfig = normalizeConfig(payload)
  return cachedConfig
}

export async function saveNaverNewsSearchConfig(keywords: string[]) {
  const response = await fetch('/api/news/search-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords }),
  })
  const payload = await response.json() as NewsSearchConfigApiResponse

  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : '네이버 뉴스 검색어 저장에 실패했습니다.')
  }

  cachedConfig = normalizeConfig(payload)
  return cachedConfig
}

export async function searchNaverNews({
  clientId,
  clientSecret,
  query,
  display = 20,
}: {
  clientId: string
  clientSecret: string
  query: string
  display?: number
}): Promise<NaverNewsSearchResponse> {
  const response = await fetch('/api/news/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret, query, display }),
  })
  const payload = await response.json() as NaverNewsSearchApiResponse

  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : '네이버 뉴스 검색에 실패했습니다.')
  }

  return {
    total: typeof payload.total === 'number' ? payload.total : 0,
    start: typeof payload.start === 'number' ? payload.start : 1,
    display: typeof payload.display === 'number' ? payload.display : 0,
    items: Array.isArray(payload.items) ? payload.items.filter(isNaverNewsItem) : [],
  }
}

export async function collectNaverNews({
  clientId,
  clientSecret,
  keywords,
  display = 10,
}: {
  clientId: string
  clientSecret: string
  keywords: string[]
  display?: number
}): Promise<NaverNewsCollectionResponse> {
  const response = await fetch('/api/news/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret, keywords, display }),
  })
  const payload = await response.json() as NaverNewsCollectionApiResponse

  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : '네이버 뉴스 정보 수집에 실패했습니다.')
  }

  return {
    keywordCount: typeof payload.keywordCount === 'number' ? payload.keywordCount : keywords.length,
    articleCount: typeof payload.articleCount === 'number' ? payload.articleCount : 0,
    items: Array.isArray(payload.items) ? payload.items.filter(isNaverNewsItem) : [],
    failures: Array.isArray(payload.failures)
      ? payload.failures.filter((failure): failure is { query: string; message: string } => (
        typeof failure === 'object'
        && failure !== null
        && typeof (failure as Record<string, unknown>).query === 'string'
        && typeof (failure as Record<string, unknown>).message === 'string'
      ))
      : [],
  }
}

function isNaverNewsItem(item: unknown): item is NaverNewsItem {
  if (typeof item !== 'object' || item === null) return false
  const value = item as Record<string, unknown>
  return ['title', 'originallink', 'link', 'description', 'pubDate']
    .every((field) => typeof value[field] === 'string')
}
