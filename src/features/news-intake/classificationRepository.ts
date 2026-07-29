import type {
  NewsClassificationRun,
  NewsClassificationStore,
  NewsRiskGroupAction,
  NewsRiskGroup,
  NewsRiskGroupRecord,
  NewsSourceRecord,
} from '../../domain/risk/newsSignal'
import type { NaverNewsItem } from './types'

type NewsClassificationApiResponse = {
  store?: unknown
  run?: unknown
  error?: unknown
}

const classificationVersion = 'dynamic-news-cluster-v1'
let cachedStore: NewsClassificationStore | null = null

export function createNewsSourceRecords(items: NaverNewsItem[], collectedAt = new Date().toISOString()): NewsSourceRecord[] {
  return items.map((item, index) => ({
    id: createSourceId(item, index),
    title: stripNaverMarkup(item.title),
    sourceName: getSourceName(item.originallink || item.link),
    sourceUrl: item.originallink || item.link,
    excerpt: stripNaverMarkup(item.description),
    publishedAt: item.pubDate,
    collectedAt,
    ...(item.query ? { query: item.query } : {}),
  }))
}

export function buildNewsClassificationPrompt(
  items: NewsSourceRecord[],
  existingGroups: NewsRiskGroupRecord[] = [],
) {
  const groupContext = existingGroups.length
    ? existingGroups.slice(0, 80).map((group) => ({
      group_key: group.groupKey,
      title: group.title,
      summary: group.summary,
      labels: group.labels,
      source_count: group.sourceCount,
      last_observed_at: group.lastObservedAt,
    }))
    : []

  return [
    '[분류 대상 뉴스]',
    JSON.stringify(items.map((item) => ({
      source_id: item.id,
      title: item.title,
      source_name: item.sourceName,
      source_url: item.sourceUrl,
      excerpt: item.excerpt,
      published_at: item.publishedAt,
      collected_at: item.collectedAt,
      query: item.query,
    })), null, 2),
    '',
    '[기존 위험 묶음. 같은 위험이면 group_key를 재사용하고, 다르면 새로 만드세요.]',
    JSON.stringify(groupContext, null, 2),
    '',
    '[저장 기준] source_items는 위 입력 뉴스의 구조화 데이터를 그대로 사용합니다. risk_groups의 source_ids에는 위 입력에 존재하는 source_id만 넣으세요.',
  ].join('\n')
}

export function createMockNewsClassification(
  sourceItems: NewsSourceRecord[],
  existingGroups: NewsRiskGroupRecord[] = [],
) {
  const groups: NewsRiskGroup[] = []

  for (const source of sourceItems) {
    const tokens = extractTopicTokens(`${source.title} ${source.excerpt}`)
    const matched = groups.find((group) => overlapCount(group.labels, tokens) >= 2)
      ?? existingGroups.find((group) => overlapCount(group.labels, tokens) >= 2)
    const groupKey = matched?.groupKey ?? `sample-${tokens.slice(0, 3).join('-') || hashString(source.id)}`
    const current = groups.find((group) => group.groupKey === groupKey)

    if (current) {
      current.sourceIds = [...new Set([...current.sourceIds, source.id])]
      current.observedFacts = [...new Set([...current.observedFacts, source.title])]
      continue
    }

    groups.push({
      groupKey,
      title: matched?.title ?? (tokens.slice(0, 4).join(' ') || source.title),
      summary: `SAMPLE · 기사 제목과 요약에서 반복된 주제: ${tokens.join(', ') || '추가 확인 필요'}`,
      labels: tokens,
      riskObject: tokens[0] ?? '확인 필요',
      observedFacts: [source.title],
      changeDirection: 'unclear',
      exposedGroups: [],
      potentialLoss: [],
      sourceIds: [source.id],
      confidence: 'low',
      needsReview: ['Mock 결과입니다. 원문과 독립 출처를 확인해 주세요.'],
      groupingReason: 'SAMPLE · 제목·요약의 반복 단어를 기준으로 임시 묶음으로 만들었습니다.',
      action: matched ? 'matched' : 'new',
    })
  }

  return {
    sourceItems,
    groups,
    storageHint: 'SAMPLE · Mock 분류 결과이며 실제 위험 판단이 아닙니다.',
  }
}

export function parseNewsClassificationOutput(text: string): {
  sourceItems: NewsSourceRecord[]
  groups: NewsRiskGroup[]
  storageHint: string
} {
  const parsed = JSON.parse(extractJson(text)) as unknown
  if (!isRecord(parsed)) throw new Error('AI 결과가 JSON 객체가 아닙니다.')

  const sourceItems = Array.isArray(parsed.source_items)
    ? parsed.source_items.map(normalizeSourceItem).filter((item): item is NewsSourceRecord => item !== null)
    : []
  const groups = Array.isArray(parsed.risk_groups)
    ? parsed.risk_groups.map(normalizeRiskGroup).filter((group): group is NewsRiskGroup => group !== null)
    : []

  if (!groups.length) throw new Error('AI 결과에 위험 묶음이 없습니다.')

  return {
    sourceItems,
    groups,
    storageHint: typeof parsed.storage_hint === 'string' ? parsed.storage_hint : '',
  }
}

export function bindNewsGroupsToSourceItems(
  groups: NewsRiskGroup[],
  sourceItems: NewsSourceRecord[],
) {
  const sourceIds = new Set(sourceItems.map((item) => item.id))
  const unboundGroup = groups.find((group) => !group.sourceIds.some((sourceId) => sourceIds.has(sourceId)))

  if (unboundGroup) {
    throw new Error(`AI 위험 묶음 "${unboundGroup.title}"이 구조화된 뉴스 source_id를 참조하지 않아 저장할 수 없습니다.`)
  }

  return groups.map((group) => ({
    ...group,
    sourceIds: [...new Set(group.sourceIds.filter((sourceId) => sourceIds.has(sourceId)))],
  }))
}

export async function readNewsClassificationStore(force = false): Promise<NewsClassificationStore> {
  if (!force && cachedStore) return cachedStore

  const response = await fetch('/api/news/classifications')
  const payload = await response.json() as NewsClassificationApiResponse
  if (!response.ok || !isNewsClassificationStore(payload.store)) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'AI 뉴스 분류 저장소를 불러오지 못했습니다.')
  }

  cachedStore = payload.store
  return cachedStore
}

export async function saveNewsClassification({
  sourceItems,
  groups,
  rawOutput,
  generatedAt,
  mode,
  model,
}: {
  sourceItems: NewsSourceRecord[]
  groups: NewsRiskGroup[]
  rawOutput: string
  generatedAt: string
  mode: 'mock' | 'gemini' | 'potens'
  model?: string
}) {
  const response = await fetch('/api/news/classifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      classificationVersion,
      sourceItems,
      groups,
      rawOutput,
      generatedAt,
      mode,
      model,
    }),
  })
  const payload = await response.json() as NewsClassificationApiResponse
  if (!response.ok || !isNewsClassificationStore(payload.store)) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'AI 뉴스 분류 결과 저장에 실패했습니다.')
  }

  cachedStore = payload.store
  return {
    store: payload.store,
    run: isRecord(payload.run) ? payload.run as unknown as NewsClassificationRun : null,
  }
}

function createSourceId(item: NaverNewsItem, index: number) {
  const sourceUrl = item.originallink || item.link
  if (sourceUrl) return `news-${hashString(sourceUrl)}`
  return `news-${hashString(`${item.title}-${item.pubDate}-${index}`)}`
}

function getSourceName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || '출처 확인 필요'
  } catch {
    return '출처 확인 필요'
  }
}

function stripNaverMarkup(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function hashString(value: string) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function extractJson(text: string) {
  const unfenced = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = unfenced.indexOf('{')
  const end = unfenced.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('AI 결과에서 JSON을 찾지 못했습니다.')
  return unfenced.slice(start, end + 1)
}

function normalizeSourceItem(value: unknown): NewsSourceRecord | null {
  if (!isRecord(value)) return null
  const id = readString(value.source_id)
  const title = readString(value.title)
  if (!id || !title) return null
  return {
    id,
    title,
    sourceName: readString(value.source_name) || '출처 확인 필요',
    sourceUrl: readString(value.source_url) || '확인 필요',
    excerpt: readString(value.excerpt),
    publishedAt: readString(value.published_at) || '확인 필요',
    collectedAt: readString(value.collected_at) || '확인 필요',
  }
}

function normalizeRiskGroup(value: unknown): NewsRiskGroup | null {
  if (!isRecord(value)) return null
  const groupKey = readString(value.group_key)
  const title = readString(value.title)
  if (!groupKey || !title) return null
  return {
    groupKey,
    title,
    summary: readString(value.summary),
    labels: readStringArray(value.labels),
    riskObject: readString(value.risk_object),
    observedFacts: readStringArray(value.observed_facts),
    changeDirection: normalizeChangeDirection(value.change_direction),
    exposedGroups: readStringArray(value.exposed_groups),
    potentialLoss: readStringArray(value.potential_loss),
    sourceIds: readStringArray(value.source_ids),
    confidence: normalizeConfidence(value.confidence),
    needsReview: readStringArray(value.needs_review),
    groupingReason: readString(value.grouping_reason),
    action: normalizeGroupAction(value.action),
  }
}

function isNewsClassificationStore(value: unknown): value is NewsClassificationStore {
  if (!isRecord(value)) return false
  return value.version === 1 && Array.isArray(value.runs) && Array.isArray(value.groups)
}

function normalizeChangeDirection(value: unknown): NewsRiskGroup['changeDirection'] {
  if (value === 'increase' || value === 'decrease' || value === 'new') return value
  return 'unclear'
}

function normalizeConfidence(value: unknown): NewsRiskGroup['confidence'] {
  if (value === 'high' || value === 'medium') return value
  return 'low'
}

function normalizeGroupAction(value: unknown): NewsRiskGroupAction {
  if (value === 'matched' || value === 'new') return value
  return 'uncertain'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))]
    : []
}

function extractTopicTokens(value: string) {
  const stopWords = new Set(['그리고', '관련', '대한', '통해', '최근', '뉴스', '사고', '가능성', '확인', '필요'])
  return [...new Set(
    value
      .replace(/[^0-9A-Za-z가-힣\s]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !stopWords.has(token)),
  )].slice(0, 6)
}

function overlapCount(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter((item) => rightSet.has(item)).length
}
