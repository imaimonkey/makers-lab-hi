import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type {
  NewsClassificationRun,
  NewsClassificationStore,
  NewsRiskGroup,
  NewsRiskGroupRecord,
  NewsRiskGroupRevision,
  NewsSourceRecord,
} from './src/domain/risk/newsSignal'

type LlmApiOptions = {
  apiKey: string
  model: string
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  error?: {
    message?: string
  }
}

const systemPromptFiles = {
  'util-1': resolve(process.cwd(), 'src/features/llm-util/util-1/system-prompt.md'),
  'util-2': resolve(process.cwd(), 'src/features/llm-util/util-2/system-prompt.md'),
  'util-3': resolve(process.cwd(), 'src/features/llm-util/util-3/system-prompt.md'),
  'util-4': resolve(process.cwd(), 'src/features/llm-util/util-4/system-prompt.md'),
} as const

type SystemPromptUtilityId = keyof typeof systemPromptFiles
type SharedPromptRecord = { text: string; updatedAt: string }
type SharedPromptStore = {
  version: 1
  prompts: Partial<Record<SystemPromptUtilityId, SharedPromptRecord>>
}

const sharedPromptDataFile = resolve(process.cwd(), 'data/llm-system-prompts.json')
let sharedPromptWriteQueue = Promise.resolve()

const defaultNaverNewsSearchKeywords = [
  '생성형 AI 업무 오류',
  'AI 배상책임',
  '가정용 ESS 화재',
  '전기차 배터리 화재',
  '충전시설 화재',
  '생활로봇 오작동',
  '드론 배송 사고',
  '플랫폼 노동 소득 공백',
  '소상공인 영업중단',
]

type NewsSearchConfigStore = {
  version: 1
  keywords: string[]
  updatedAt: string | null
}

const newsSearchConfigDataFile = resolve(process.cwd(), 'data/naver-news-search-config.json')
let newsSearchConfigWriteQueue = Promise.resolve()

const newsClassificationDataFile = resolve(process.cwd(), 'data/news-classifications.json')
let newsClassificationWriteQueue = Promise.resolve()

async function readSharedPromptStore(): Promise<SharedPromptStore> {
  try {
    const raw = await readFile(sharedPromptDataFile, 'utf8')
    const parsed = JSON.parse(raw) as Partial<SharedPromptStore>
    if (parsed.prompts && typeof parsed.prompts === 'object') {
      return { version: 1, prompts: parsed.prompts }
    }
  } catch {
    // The first read falls back to the Markdown defaults.
  }

  return { version: 1, prompts: {} }
}

async function readSharedPromptSnapshot() {
  const store = await readSharedPromptStore()
  const utilityIds = Object.keys(systemPromptFiles) as SystemPromptUtilityId[]
  const entries = await Promise.all(utilityIds.map(async (utilityId) => {
    const shared = store.prompts[utilityId]
    if (shared?.text?.trim()) {
      return [utilityId, { text: shared.text, updatedAt: shared.updatedAt, source: 'shared' as const }]
    }

    const defaultText = await readFile(systemPromptFiles[utilityId], 'utf8')
    return [utilityId, { text: defaultText.trim(), updatedAt: null, source: 'markdown' as const }]
  }))

  return Object.fromEntries(entries)
}

async function saveSharedPrompt(utilityId: SystemPromptUtilityId, text: string) {
  const operation = sharedPromptWriteQueue.then(async () => {
    const store = await readSharedPromptStore()
    const record = { text, updatedAt: new Date().toISOString() }
    store.prompts[utilityId] = record
    await mkdir(resolve(process.cwd(), 'data'), { recursive: true })
    await writeFile(sharedPromptDataFile, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
    return record
  })
  sharedPromptWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

async function readNewsSearchConfigStore(): Promise<NewsSearchConfigStore> {
  try {
    const raw = await readFile(newsSearchConfigDataFile, 'utf8')
    const parsed = JSON.parse(raw) as Partial<NewsSearchConfigStore>
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((keyword): keyword is string => typeof keyword === 'string').map((keyword) => keyword.trim()).filter(Boolean)
      : []

    if (keywords.length) {
      return {
        version: 1,
        keywords: [...new Set(keywords)],
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      }
    }
  } catch {
    // The first read falls back to the built-in keyword list.
  }

  return { version: 1, keywords: [...defaultNaverNewsSearchKeywords], updatedAt: null }
}

async function readNewsSearchConfigSnapshot() {
  const store = await readNewsSearchConfigStore()
  return {
    keywords: store.keywords.length ? store.keywords : [...defaultNaverNewsSearchKeywords],
    updatedAt: store.updatedAt,
    source: store.updatedAt ? 'shared' as const : 'default' as const,
  }
}

async function saveNewsSearchConfig(keywords: string[]) {
  const operation = newsSearchConfigWriteQueue.then(async () => {
    const normalizedKeywords = [...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))]
    const record: NewsSearchConfigStore = {
      version: 1,
      keywords: normalizedKeywords,
      updatedAt: new Date().toISOString(),
    }
    await mkdir(resolve(process.cwd(), 'data'), { recursive: true })
    await writeFile(newsSearchConfigDataFile, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
    return record
  })
  newsSearchConfigWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

async function readNewsClassificationStore(): Promise<NewsClassificationStore> {
  try {
    const raw = await readFile(newsClassificationDataFile, 'utf8')
    const parsed = JSON.parse(raw) as Partial<NewsClassificationStore>
    if (parsed.version === 1 && Array.isArray(parsed.runs) && Array.isArray(parsed.groups)) {
      return {
        version: 1,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
        runs: parsed.runs as NewsClassificationRun[],
        groups: parsed.groups as NewsRiskGroupRecord[],
      }
    }
  } catch {
    // The first read starts with an empty development store.
  }

  return { version: 1, updatedAt: null, runs: [], groups: [] }
}

function normalizeNewsSourceItems(value: unknown): NewsSourceRecord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const id = readStringField(item, 'id')
    const title = readStringField(item, 'title')
    if (!id || !title) return []
    return [{
      id,
      title,
      sourceName: readStringField(item, 'sourceName') || '출처 확인 필요',
      sourceUrl: readStringField(item, 'sourceUrl') || '확인 필요',
      excerpt: readStringField(item, 'excerpt'),
      publishedAt: readStringField(item, 'publishedAt') || '확인 필요',
      collectedAt: readStringField(item, 'collectedAt') || new Date().toISOString(),
      ...(readStringField(item, 'query') ? { query: readStringField(item, 'query') } : {}),
    } satisfies NewsSourceRecord]
  })
}

function normalizeNewsGroups(value: unknown, sourceItems: NewsSourceRecord[]): NewsRiskGroup[] {
  if (!Array.isArray(value)) return []
  const sourceIds = new Set(sourceItems.map((item) => item.id))
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const groupKey = readStringField(item, 'groupKey')
    const title = readStringField(item, 'title')
    if (!groupKey || !title) return []
    const action = readStringField(item, 'action')
    const changeDirection = readStringField(item, 'changeDirection')
    const confidence = readStringField(item, 'confidence')
    return [{
      groupKey,
      title,
      summary: readStringField(item, 'summary'),
      labels: readStringArrayField(item, 'labels'),
      riskObject: readStringField(item, 'riskObject'),
      observedFacts: readStringArrayField(item, 'observedFacts'),
      changeDirection: changeDirection === 'increase' || changeDirection === 'decrease' || changeDirection === 'new'
        ? changeDirection
        : 'unclear',
      exposedGroups: readStringArrayField(item, 'exposedGroups'),
      potentialLoss: readStringArrayField(item, 'potentialLoss'),
      sourceIds: readStringArrayField(item, 'sourceIds').filter((id) => sourceIds.has(id)),
      confidence: confidence === 'high' || confidence === 'medium' ? confidence : 'low',
      needsReview: readStringArrayField(item, 'needsReview'),
      groupingReason: readStringField(item, 'groupingReason'),
      action: action === 'matched' || action === 'new' ? action : 'uncertain',
    } satisfies NewsRiskGroup]
  })
}

async function saveNewsClassification(body: unknown) {
  const sourceItems = normalizeNewsSourceItems(isRecord(body) ? body.sourceItems : null)
  const groups = normalizeNewsGroups(isRecord(body) ? body.groups : null, sourceItems)
  const rawOutput = isRecord(body) ? readStringField(body, 'rawOutput') : ''
  if (!sourceItems.length || !groups.length || !rawOutput) throw new Error('저장할 뉴스 원문과 AI 위험 묶음이 필요합니다.')

  const now = new Date().toISOString()
  const generatedAt = isRecord(body) && readStringField(body, 'generatedAt')
    ? readStringField(body, 'generatedAt')
    : now
  const mode = isRecord(body) && readStringField(body, 'mode') === 'gemini' ? 'gemini' as const : 'mock' as const
  const dataQuality = mode === 'gemini' ? 'actual' as const : 'sample' as const
  const model = isRecord(body) ? readStringField(body, 'model') : ''
  const runId = `news-run-${Date.now().toString(36)}`
  const run: NewsClassificationRun = {
    id: runId,
    utilityId: 'util-1',
    classificationVersion: isRecord(body) && readStringField(body, 'classificationVersion')
      ? readStringField(body, 'classificationVersion')
      : 'dynamic-news-cluster-v1',
    createdAt: generatedAt,
    mode,
    dataQuality,
    ...(model ? { model } : {}),
    sourceItems,
    sourceIds: sourceItems.map((item) => item.id),
    sourceItemCount: sourceItems.length,
    groups,
    rawOutput,
  }

  const operation = newsClassificationWriteQueue.then(async () => {
    const store = await readNewsClassificationStore()
    const nextGroups = [...store.groups]
    for (const incoming of groups) {
      const existingIndex = nextGroups.findIndex((group) => group.groupKey === incoming.groupKey)
      const existing = existingIndex >= 0 ? nextGroups[existingIndex] : null
      const mergedSourceIds = uniqueStrings([...(existing?.sourceIds ?? []), ...incoming.sourceIds])
      const linkedSources = sourceItems.filter((item) => mergedSourceIds.includes(item.id))
      const revision: NewsRiskGroupRevision = {
        runId,
        changedAt: now,
        title: incoming.title,
        action: incoming.action,
        sourceIds: incoming.sourceIds,
      }
      const nextRecord: NewsRiskGroupRecord = {
        ...incoming,
        sourceIds: mergedSourceIds,
        labels: uniqueStrings([...(existing?.labels ?? []), ...incoming.labels]),
        observedFacts: uniqueStrings([...(existing?.observedFacts ?? []), ...incoming.observedFacts]),
        exposedGroups: uniqueStrings([...(existing?.exposedGroups ?? []), ...incoming.exposedGroups]),
        potentialLoss: uniqueStrings([...(existing?.potentialLoss ?? []), ...incoming.potentialLoss]),
        needsReview: uniqueStrings([...(existing?.needsReview ?? []), ...incoming.needsReview]),
        firstObservedAt: earliestDate(existing?.firstObservedAt ?? null, linkedSources.map((source) => source.publishedAt)),
        lastObservedAt: latestDate(existing?.lastObservedAt ?? null, linkedSources.map((source) => source.publishedAt)),
        articleCount: mergedSourceIds.length,
        sourceNames: uniqueStrings([...(existing?.sourceNames ?? []), ...linkedSources.map((source) => source.sourceName)]),
        sourceCount: uniqueStrings([...(existing?.sourceNames ?? []), ...linkedSources.map((source) => source.sourceName)]).length,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        dataQuality: existing?.dataQuality === 'actual' || dataQuality === 'actual' ? 'actual' : 'sample',
        status: existing?.status ?? 'new',
        history: [...(existing?.history ?? []), revision].slice(-50),
      }
      if (existingIndex >= 0) nextGroups[existingIndex] = nextRecord
      else nextGroups.unshift(nextRecord)
    }

    const nextStore: NewsClassificationStore = {
      version: 1,
      updatedAt: now,
      runs: [run, ...store.runs].slice(0, 200),
      groups: nextGroups,
    }
    await mkdir(resolve(process.cwd(), 'data'), { recursive: true })
    await writeFile(newsClassificationDataFile, `${JSON.stringify(nextStore, null, 2)}\n`, 'utf8')
    return nextStore
  })
  newsClassificationWriteQueue = operation.then(() => undefined, () => undefined)
  return { store: await operation, run }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function parseDate(value: string | null) {
  if (!value || value === '확인 필요') return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function earliestDate(current: string | null, candidates: string[]) {
  const values = [current, ...candidates].filter((value): value is string => Boolean(value && parseDate(value) !== null))
  if (!values.length) return current
  return values.sort((a, b) => (parseDate(a) ?? 0) - (parseDate(b) ?? 0))[0] ?? current
}

function latestDate(current: string | null, candidates: string[]) {
  const values = [current, ...candidates].filter((value): value is string => Boolean(value && parseDate(value) !== null))
  if (!values.length) return current
  return values.sort((a, b) => (parseDate(b) ?? 0) - (parseDate(a) ?? 0))[0] ?? current
}

function writeJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []

    request.on('data', (chunk) => chunks.push(String(chunk)))
    request.on('end', () => {
      try {
        resolve(JSON.parse(chunks.join('') || '{}'))
      } catch {
        reject(new Error('Request body must be valid JSON.'))
      }
    })
    request.on('error', reject)
  })
}

function readStringField(body: unknown, field: string) {
  if (typeof body !== 'object' || body === null || !(field in body)) return ''
  const value = (body as Record<string, unknown>)[field]
  return typeof value === 'string' ? value.trim() : ''
}

function readStringArrayField(body: unknown, field: string) {
  if (typeof body !== 'object' || body === null || !(field in body)) return []
  const value = (body as Record<string, unknown>)[field]
  if (!Array.isArray(value)) return []
  return [...new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean),
  )]
}

function createLlmApiPlugin(options: LlmApiOptions): Plugin {
  return {
    name: 'hi-emerging-risk-llm-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = request.url?.split('?')[0]

        if (pathname === '/api/news/classifications') {
          if (request.method === 'GET') {
            try {
              writeJson(response, 200, { store: await readNewsClassificationStore() })
            } catch (error) {
              console.error('News classification store read failed.', error)
              writeJson(response, 500, { error: 'AI 뉴스 분류 저장소를 불러오지 못했습니다.' })
            }
            return
          }

          if (request.method === 'POST') {
            try {
              const saved = await saveNewsClassification(await readJsonBody(request))
              writeJson(response, 200, saved)
            } catch (error) {
              const message = error instanceof Error ? error.message : 'AI 뉴스 분류 결과 저장에 실패했습니다.'
              writeJson(response, 400, { error: message })
            }
            return
          }

          writeJson(response, 405, { error: 'Only GET and POST are supported.' })
          return
        }

        if (pathname === '/api/news/search') {
          if (request.method !== 'POST') {
            writeJson(response, 405, { error: 'Only POST is supported.' })
            return
          }

          try {
            const body = await readJsonBody(request)
            const clientId = readStringField(body, 'clientId')
            const clientSecret = readStringField(body, 'clientSecret')
            const query = readStringField(body, 'query')
            const rawDisplay = typeof body === 'object' && body !== null && 'display' in body
              ? Number((body as Record<string, unknown>).display)
              : 20
            const display = Number.isFinite(rawDisplay) ? Math.min(Math.max(Math.trunc(rawDisplay), 1), 100) : 20

            if (!clientId || !clientSecret) {
              writeJson(response, 400, { error: '네이버 Client ID와 Client Secret을 입력해 주세요.' })
              return
            }

            if (!query) {
              writeJson(response, 400, { error: '검색어를 선택해 주세요.' })
              return
            }

            const params = new URLSearchParams({
              query,
              display: String(display),
              start: '1',
              sort: 'date',
            })
            const naverResponse = await fetch(`https://openapi.naver.com/v1/search/news.json?${params.toString()}`, {
              headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
              },
            })
            const payload = await naverResponse.json() as {
              errorCode?: string
              message?: string
              total?: number
              start?: number
              display?: number
              items?: unknown[]
            }

            if (!naverResponse.ok) {
              writeJson(response, naverResponse.status, {
                error: `네이버 뉴스 API 오류: ${payload.message ?? payload.errorCode ?? '요청을 처리하지 못했습니다.'}`,
              })
              return
            }

            writeJson(response, 200, payload)
          } catch (error) {
            console.error('Naver news search failed.', error)
            writeJson(response, 502, { error: '네이버 뉴스 API에 연결하지 못했습니다.' })
          }
          return
        }

        if (pathname === '/api/news/collect') {
          if (request.method !== 'POST') {
            writeJson(response, 405, { error: 'Only POST is supported.' })
            return
          }

          try {
            const body = await readJsonBody(request)
            const clientId = readStringField(body, 'clientId')
            const clientSecret = readStringField(body, 'clientSecret')
            const keywords = readStringArrayField(body, 'keywords')
            const rawDisplay = typeof body === 'object' && body !== null && 'display' in body
              ? Number((body as Record<string, unknown>).display)
              : 10
            const display = Number.isFinite(rawDisplay) ? Math.min(Math.max(Math.trunc(rawDisplay), 1), 100) : 10

            if (!clientId || !clientSecret) {
              writeJson(response, 400, { error: '네이버 Client ID와 Client Secret을 입력해 주세요.' })
              return
            }

            if (!keywords.length) {
              writeJson(response, 400, { error: '수집할 검색어가 없습니다.' })
              return
            }

            if (keywords.length > 50 || keywords.some((keyword) => keyword.length > 100)) {
              writeJson(response, 413, { error: '검색어는 최대 50개, 각 검색어는 100자까지 수집할 수 있습니다.' })
              return
            }

            const collectedItems = [] as Array<Record<string, unknown> & { query: string }>
            const seenItems = new Set<string>()
            const failures: Array<{ query: string; message: string }> = []

            for (const query of keywords) {
              const params = new URLSearchParams({
                query,
                display: String(display),
                start: '1',
                sort: 'date',
              })
              const naverResponse = await fetch(`https://openapi.naver.com/v1/search/news.json?${params.toString()}`, {
                headers: {
                  'X-Naver-Client-Id': clientId,
                  'X-Naver-Client-Secret': clientSecret,
                },
              })
              const payload = await naverResponse.json() as {
                errorCode?: string
                message?: string
                items?: unknown[]
              }

              if (!naverResponse.ok) {
                failures.push({ query, message: payload.message ?? payload.errorCode ?? '요청을 처리하지 못했습니다.' })
                continue
              }

              for (const item of payload.items ?? []) {
                if (typeof item !== 'object' || item === null) continue
                const value = item as Record<string, unknown>
                const title = typeof value.title === 'string' ? value.title : ''
                const link = typeof value.originallink === 'string' && value.originallink
                  ? value.originallink
                  : typeof value.link === 'string' ? value.link : ''
                const dedupeKey = link || title
                if (!dedupeKey || seenItems.has(dedupeKey)) continue
                seenItems.add(dedupeKey)
                collectedItems.push({ ...value, query })
              }
            }

            writeJson(response, 200, {
              keywordCount: keywords.length,
              articleCount: collectedItems.length,
              items: collectedItems,
              failures,
            })
          } catch (error) {
            console.error('Naver news collection failed.', error)
            writeJson(response, 502, { error: '네이버 뉴스 정보 수집에 실패했습니다.' })
          }
          return
        }

        if (pathname === '/api/news/search-config') {
          if (request.method === 'GET') {
            try {
              writeJson(response, 200, await readNewsSearchConfigSnapshot())
            } catch (error) {
              console.error('Naver news search config read failed.', error)
              writeJson(response, 500, { error: '네이버 뉴스 검색어를 불러오지 못했습니다.' })
            }
            return
          }

          if (request.method === 'PUT') {
            try {
              const body = await readJsonBody(request)
              const keywords = readStringArrayField(body, 'keywords')

              if (!keywords.length) {
                writeJson(response, 400, { error: '검색어를 하나 이상 입력해 주세요.' })
                return
              }

              if (keywords.length > 50 || keywords.some((keyword) => keyword.length > 100)) {
                writeJson(response, 413, { error: '검색어는 최대 50개, 각 검색어는 100자까지 저장할 수 있습니다.' })
                return
              }

              const saved = await saveNewsSearchConfig(keywords)
              writeJson(response, 200, { ...saved, source: 'shared' })
            } catch (error) {
              console.error('Naver news search config save failed.', error)
              writeJson(response, 500, { error: '네이버 뉴스 검색어 저장에 실패했습니다.' })
            }
            return
          }

          writeJson(response, 405, { error: 'Only GET and PUT are supported.' })
          return
        }

        if (pathname === '/api/llm/system-prompts') {
          if (request.method === 'GET') {
            try {
              writeJson(response, 200, {
                prompts: await readSharedPromptSnapshot(),
                generatedAt: new Date().toISOString(),
              })
            } catch (error) {
              console.error('Shared system prompt read failed.', error)
              writeJson(response, 500, { error: '공유 시스템 프롬프트를 불러오지 못했습니다.' })
            }
            return
          }

          if (request.method === 'PUT') {
            try {
              const body = await readJsonBody(request)
              const utilityId = readStringField(body, 'utilityId')
              const text = readStringField(body, 'text')
              const isSupportedUtility = Object.prototype.hasOwnProperty.call(systemPromptFiles, utilityId)

              if (!isSupportedUtility) {
                writeJson(response, 400, { error: '지원하지 않는 LLM 유틸리티입니다.' })
                return
              }

              if (!text) {
                writeJson(response, 400, { error: '시스템 프롬프트를 입력해 주세요.' })
                return
              }

              if (text.length > 100_000) {
                writeJson(response, 413, { error: '시스템 프롬프트가 너무 깁니다.' })
                return
              }

              const saved = await saveSharedPrompt(utilityId as SystemPromptUtilityId, text)
              writeJson(response, 200, {
                prompts: {
                  [utilityId]: { ...saved, source: 'shared' },
                },
                savedAt: saved.updatedAt,
              })
            } catch (error) {
              console.error('Shared system prompt save failed.', error)
              writeJson(response, 500, { error: '공유 시스템 프롬프트 저장에 실패했습니다.' })
            }
            return
          }

          writeJson(response, 405, { error: 'Only GET and PUT are supported.' })
          return
        }

        if (pathname !== '/api/llm/generate') {
          next()
          return
        }

        if (request.method !== 'POST') {
          writeJson(response, 405, { error: 'Only POST is supported.' })
          return
        }

        if (!options.apiKey) {
          writeJson(response, 503, { error: 'GEMINI_API_KEY is not configured.' })
          return
        }

        try {
          const body = await readJsonBody(request)
          const systemPrompt = readStringField(body, 'systemPrompt')
          const prompt = readStringField(body, 'prompt')

          if (!prompt) {
            writeJson(response, 400, { error: 'A prompt is required.' })
            return
          }

          if (!systemPrompt) {
            writeJson(response, 400, { error: 'A system prompt is required.' })
            return
          }

          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent?key=${encodeURIComponent(options.apiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: {
                  parts: [{ text: systemPrompt }],
                },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
              }),
            },
          )
          const payload = await geminiResponse.json() as GeminiResponse

          if (!geminiResponse.ok) {
            writeJson(response, geminiResponse.status, {
              error: payload.error?.message ?? 'Gemini API request failed.',
            })
            return
          }

          const text = payload.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? '')
            .join('')
            .trim()

          if (!text) {
            writeJson(response, 502, { error: 'Gemini returned an empty response.' })
            return
          }

          writeJson(response, 200, {
            text,
            provider: 'gemini',
            model: options.model,
            generatedAt: new Date().toISOString(),
          })
        } catch (error) {
          console.error('LLM development proxy failed.', error)
          writeJson(response, 500, { error: 'The LLM development proxy failed.' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      createLlmApiPlugin({
        apiKey: env.GEMINI_API_KEY ?? '',
        model: env.GEMINI_MODEL || 'gemini-3.6-flash',
      }),
    ],
  }
})
