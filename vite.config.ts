import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import * as XLSX from 'xlsx'
import type {
  NewsClassificationRun,
  NewsClassificationStore,
  NewsRiskGroup,
  NewsRiskGroupRecord,
  NewsRiskGroupRevision,
  NewsSourceRecord,
} from './src/domain/risk/newsSignal'
import type { NewsManualTestRun, NewsManualTestStore } from './src/features/news-intake/types'

type LlmApiOptions = {
  apiKey: string
  model: string
  provider: 'gemini' | 'potens'
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

type PotensResponse = {
  text?: unknown
  response?: unknown
  content?: unknown
  choices?: Array<{ message?: { content?: unknown }; text?: unknown }>
  error?: { message?: string } | string
}

function extractProviderText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(extractProviderText).filter(Boolean).join('')
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const key of ['text', 'content', 'response', 'output', 'result', 'message', 'data', 'choices', 'candidates', 'parts']) {
    const text = extractProviderText(record[key])
    if (text) return text
  }
  return ''
}

async function readPotensStream(response: Response): Promise<string> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result = ''
  const consume = (line: string) => {
    const value = line.trim().replace(/^data:\s*/, '')
    if (!value || value === '[DONE]') return
    try { result += extractProviderText(JSON.parse(value)) } catch { result += value }
  }
  while (true) {
    const chunk = await reader.read()
    buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    lines.forEach(consume)
    if (chunk.done) break
  }
  consume(buffer)
  return result
}

const systemPromptFiles = {
  'util-0': resolve(process.cwd(), 'data/system-prompts/util-0/system-prompt.md'),
  'util-1': resolve(process.cwd(), 'data/system-prompts/util-1/system-prompt.md'),
  'util-2': resolve(process.cwd(), 'data/system-prompts/util-2/system-prompt.md'),
  'util-3': resolve(process.cwd(), 'data/system-prompts/util-3/system-prompt.md'),
  'util-4': resolve(process.cwd(), 'data/system-prompts/util-4/system-prompt.md'),
} as const

type SystemPromptUtilityId = keyof typeof systemPromptFiles
type SharedPromptRecord = { text: string; updatedAt: string }
type SharedPromptStore = {
  version: 1
  prompts: Partial<Record<SystemPromptUtilityId, SharedPromptRecord>>
}

const sharedPromptDataFile = resolve(process.cwd(), 'data/llm-system-prompts.json')
const developerPromptDataRoot = resolve(process.cwd(), 'data/system-prompts')
const developerPromptFiles = new Set([
  'util-0/system-prompt.md', 'util-1/system-prompt.md', 'util-2/system-prompt.md', 'util-3/system-prompt.md', 'util-4/system-prompt.md',
  'step2/01-risk-candidate-card.md', 'step2/02-screening-metrics-card.md', 'step2/03-law-regulation-card.md', 'step2/04-case-loss-market-card.md', 'step2/05-article-analysis-queue-card.md', 'step2/06-candidate-review-card.md', 'step2/07-signal-trend-card.md',
  'step3/01-risk-context-and-input.md', 'step3/02-risk-summary.md', 'step3/03-assessment-scores.md', 'step3/04-signal-trend.md', 'step3/05-evidence-ledger.md', 'step3/06-decision-brief.md', 'step3/07-productization-review.md', 'step3/08-human-review-handoff.md',
  'step4/01-productization-review-summary.md', 'step4/02-coverage-gap.md', 'step4/03-wording-review.md', 'step4/04-productization-assessment.md', 'step4/05-product-structure.md', 'step4/06-executive-briefing.md', 'step4/07-evidence-and-follow-up.md',
])
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
const newsManualTestRunDataFile = resolve(process.cwd(), 'data/news-manual-test-runs.json')
let newsManualTestRunWriteQueue = Promise.resolve()
const util0WorkbookDataFile = resolve(process.cwd(), 'data/util-0-risk-discovery.xlsx')
let util0WorkbookWriteQueue = Promise.resolve()
const step2WorkbookDataFile = resolve(process.cwd(), 'data/developer-step2-analysis.xlsx')
let step2WorkbookWriteQueue = Promise.resolve()
const step4WorkbookDataFile = resolve(process.cwd(), 'data/developer-step4-analysis.xlsx')
let step4WorkbookWriteQueue = Promise.resolve()

async function saveStep2AnalysisResults(body: unknown) {
  if (!isRecord(body) || typeof body.articleId !== 'string' || typeof body.fileName !== 'string' || !isRecord(body.results)) throw new Error('Step 2 분석 결과 형식이 올바르지 않습니다.')
  const existing = await readStep2Workbook()
  const rows = Object.entries(body.results).map(([step, value]) => ({
    articleId: body.articleId,
    fileName: body.fileName,
    step,
    mode: isRecord(value) ? String(value.mode ?? '') : '',
    generatedAt: isRecord(value) ? String(value.generatedAt ?? '') : '',
    resultJson: isRecord(value) ? String(value.text ?? '') : JSON.stringify(value),
  }))
  const workbook = XLSX.utils.book_new()
  const merged = [...existing, ...rows]
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(merged), 'step2_analysis')
  const operation = step2WorkbookWriteQueue.then(async () => {
    await mkdir(resolve(process.cwd(), 'data'), { recursive: true })
    await writeFile(step2WorkbookDataFile, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
    return { file: 'data/developer-step2-analysis.xlsx', savedAt: new Date().toISOString(), sheets: workbook.SheetNames }
  })
  step2WorkbookWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

async function readStep2Workbook(): Promise<unknown[]> {
  try {
    const workbook = XLSX.read(await readFile(step2WorkbookDataFile), { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    return sheet ? XLSX.utils.sheet_to_json(sheet) as unknown[] : []
  } catch {
    return []
  }
}

async function saveStep4AnalysisResults(body: unknown) {
  if (!isRecord(body) || typeof body.articleId !== 'string' || typeof body.fileName !== 'string' || !isRecord(body.results)) throw new Error('Step 4 결과 형식이 올바르지 않습니다.')
  const existing = await readStep4Workbook()
  const incoming = Object.entries(body.results).map(([step, value]) => ({ articleId: body.articleId, fileName: body.fileName, step, mode: isRecord(value) ? String(value.mode ?? '') : '', model: isRecord(value) ? String(value.model ?? '') : '', generatedAt: isRecord(value) ? String(value.generatedAt ?? '') : '', resultJson: isRecord(value) ? String(value.text ?? '') : JSON.stringify(value), savedAt: new Date().toISOString() }))
  const latest = new Map<string, unknown>()
  for (const row of [...existing, ...incoming]) { if (isRecord(row)) latest.set(`${String(row.articleId)}:${String(row.step)}`, row) }
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([...latest.values()]), 'step4_analysis')
  const operation = step4WorkbookWriteQueue.then(async () => { await mkdir(resolve(process.cwd(), 'data'), { recursive: true }); await writeFile(step4WorkbookDataFile, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })); return { file: 'data/developer-step4-analysis.xlsx', savedAt: new Date().toISOString(), sheets: workbook.SheetNames } })
  step4WorkbookWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

async function readStep4Workbook(): Promise<unknown[]> {
  try { const workbook = XLSX.read(await readFile(step4WorkbookDataFile), { type: 'buffer' }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; return sheet ? XLSX.utils.sheet_to_json(sheet) as unknown[] : [] } catch { return [] }
}

async function saveUtil0RiskDiscovery(body: unknown) {
  if (!isRecord(body) || !isRecord(body.result)) throw new Error('util-0 결과가 없습니다.')
  const existing = await readUtil0Workbook()
  const merged: Record<string, unknown[]> = {}
  for (const [key, value] of Object.entries(body.result)) {
    const incoming = Array.isArray(value) ? value : [{ value }]
    const previous = existing[key] ?? []
    const identityField = ['source_documents', 'risk_types', 'entities', 'evidence', 'dashboard_fields', 'exploration_filters', 'detail_fields', 'report_sections', 'quality_checks'].includes(key)
      ? ({ source_documents: 'document_id', risk_types: 'risk_type_id', entities: 'entity_id', evidence: 'evidence_id', dashboard_fields: 'field', exploration_filters: 'field', detail_fields: 'field', report_sections: 'section_id', quality_checks: 'check' } as Record<string, string>)[key]
      : undefined
    const byIdentity = new Map<string, unknown>()
    for (const item of previous) byIdentity.set(identityField && isRecord(item) && item[identityField] ? String(item[identityField]) : JSON.stringify(item), item)
    for (const item of incoming) {
      const identity = identityField && isRecord(item) && item[identityField] ? String(item[identityField]) : JSON.stringify(item)
      const old = byIdentity.get(identity)
      byIdentity.set(identity, isRecord(old) && isRecord(item) ? { ...old, ...item } : item)
    }
    merged[key] = [...byIdentity.values()]
  }
  for (const [key, rows] of Object.entries(existing)) if (!merged[key]) merged[key] = rows
  const workbook = XLSX.utils.book_new()
  for (const [key, rows] of Object.entries(merged)) {
    const normalizedRows = rows.map((item) => isRecord(item) ? Object.fromEntries(Object.entries(item).map(([field, entry]) => [field, Array.isArray(entry) || isRecord(entry) ? JSON.stringify(entry) : entry])) : { value: item })
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(normalizedRows), key.slice(0, 31) || 'data')
  }
  const operation = util0WorkbookWriteQueue.then(async () => {
    await mkdir(resolve(process.cwd(), 'data'), { recursive: true })
    await writeFile(util0WorkbookDataFile, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
    return { file: 'data/util-0-risk-discovery.xlsx', savedAt: new Date().toISOString(), sheets: workbook.SheetNames }
  })
  util0WorkbookWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

async function readUtil0Workbook(): Promise<Record<string, unknown[]>> {
  try {
    const workbook = XLSX.read(await readFile(util0WorkbookDataFile), { type: 'buffer' })
    return Object.fromEntries(workbook.SheetNames.map((name) => [name, XLSX.utils.sheet_to_json(workbook.Sheets[name]) as unknown[]]))
  } catch {
    return {}
  }
}

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

async function readNewsManualTestStore(): Promise<NewsManualTestStore> {
  try {
    const raw = await readFile(newsManualTestRunDataFile, 'utf8')
    const parsed = JSON.parse(raw) as Partial<NewsManualTestStore>
    if (parsed.version === 1 && Array.isArray(parsed.runs)) {
      return {
        version: 1,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
        runs: parsed.runs as NewsManualTestRun[],
      }
    }
  } catch {
    // The first read starts with an empty development store.
  }

  return { version: 1, updatedAt: null, runs: [] }
}

function normalizeNewsManualTestResult(value: unknown) {
  if (!isRecord(value)) return null
  const text = readStringField(value, 'text')
  const mode = readStringField(value, 'mode')
  const generatedAt = readStringField(value, 'generatedAt')
  if (!text || !generatedAt || (mode !== 'mock' && mode !== 'gemini')) return null

  const model = readStringField(value, 'model')
  return {
    text,
    mode,
    generatedAt,
    ...(model ? { model } : {}),
  } as NewsManualTestRun['result']
}

async function saveNewsManualTestRun(body: unknown) {
  if (!isRecord(body)) throw new Error('저장할 기능 1번 수동 입력이 없습니다.')

  const utilityId = readStringField(body, 'utilityId')
  const systemPrompt = readStringField(body, 'systemPrompt')
  const prompt = readStringField(body, 'prompt')
  const result = normalizeNewsManualTestResult(body.result)

  if (utilityId !== 'util-1') throw new Error('기능 1번 수동 입력만 저장할 수 있습니다.')
  if (!systemPrompt || !prompt || !result) {
    throw new Error('시스템 프롬프트, 입력, AI 응답이 모두 필요합니다.')
  }
  if (systemPrompt.length > 100_000 || prompt.length > 100_000 || result.text.length > 200_000) {
    throw new Error('저장할 수동 입력 데이터가 너무 깁니다.')
  }

  const operation = newsManualTestRunWriteQueue.then(async () => {
    const store = await readNewsManualTestStore()
    const savedAt = new Date().toISOString()
    const run: NewsManualTestRun = {
      id: `news-manual-run-${Date.now().toString(36)}`,
      utilityId: 'util-1',
      systemPrompt,
      prompt,
      result,
      savedAt,
    }
    const nextStore: NewsManualTestStore = {
      version: 1,
      updatedAt: savedAt,
      runs: [run, ...store.runs].slice(0, 200),
    }
    await mkdir(resolve(process.cwd(), 'data'), { recursive: true })
    await writeFile(newsManualTestRunDataFile, `${JSON.stringify(nextStore, null, 2)}\n`, 'utf8')
    return { store: nextStore, run }
  })
  newsManualTestRunWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
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
  if (groups.some((group) => !group.sourceIds.length)) {
    throw new Error('모든 AI 위험 묶음은 구조화된 뉴스 source_id를 하나 이상 참조해야 합니다.')
  }

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

        if (pathname === '/api/news/manual-test-runs') {
          if (request.method === 'GET') {
            try {
              writeJson(response, 200, { store: await readNewsManualTestStore() })
            } catch (error) {
              console.error('News manual test store read failed.', error)
              writeJson(response, 500, { error: '기능 1번 수동 입력 저장소를 불러오지 못했습니다.' })
            }
            return
          }

          if (request.method === 'POST') {
            try {
              writeJson(response, 200, await saveNewsManualTestRun(await readJsonBody(request)))
            } catch (error) {
              const message = error instanceof Error ? error.message : '기능 1번 수동 입력 저장에 실패했습니다.'
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

        if (pathname === '/api/llm/prompt-files') {
          if (request.method !== 'GET') {
            writeJson(response, 405, { error: 'Only GET is supported.' })
            return
          }
          const query = new URL(request.url ?? '/', 'http://localhost').searchParams
          const step = query.get('step') ?? ''
          const fileName = query.get('fileName') ?? 'system-prompt.md'
          const relativePath = `${step}/${fileName}`
          if (!developerPromptFiles.has(relativePath)) {
            writeJson(response, 404, { error: '요청한 개발자 모드 시스템 프롬프트 파일을 찾을 수 없습니다.' })
            return
          }
          try {
            const filePath = resolve(developerPromptDataRoot, relativePath)
            writeJson(response, 200, { text: await readFile(filePath, 'utf8'), fileName, path: `data/system-prompts/${relativePath}` })
          } catch (error) {
            console.error('Developer prompt file read failed.', error)
            writeJson(response, 500, { error: '개발자 모드 시스템 프롬프트를 읽지 못했습니다.' })
          }
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

        if (pathname === '/api/llm/util-0/risk-discovery') {
          if (request.method !== 'POST') {
            writeJson(response, 405, { error: 'Only POST is supported.' })
            return
          }
          try {
            writeJson(response, 200, await saveUtil0RiskDiscovery(await readJsonBody(request)))
          } catch (error) {
            writeJson(response, 400, { error: error instanceof Error ? error.message : 'util-0 엑셀 저장에 실패했습니다.' })
          }
          return
        }

        if (pathname === '/api/llm/util-2/step2-analysis') {
          if (request.method === 'GET') {
            writeJson(response, 200, { rows: await readStep2Workbook() })
            return
          }
          if (request.method !== 'POST') {
            writeJson(response, 405, { error: 'Only POST is supported.' })
            return
          }
          try {
            writeJson(response, 200, await saveStep2AnalysisResults(await readJsonBody(request)))
          } catch (error) {
            writeJson(response, 400, { error: error instanceof Error ? error.message : 'Step 2 분석 결과 저장에 실패했습니다.' })
          }
          return
        }

        if (pathname === '/api/llm/util-4/step4-analysis') {
          if (request.method === 'GET') { writeJson(response, 200, { rows: await readStep4Workbook() }); return }
          if (request.method !== 'POST') { writeJson(response, 405, { error: 'Only GET and POST are supported.' }); return }
          try { writeJson(response, 200, await saveStep4AnalysisResults(await readJsonBody(request))) } catch (error) { writeJson(response, 400, { error: error instanceof Error ? error.message : 'Step 4 결과 저장에 실패했습니다.' }) }
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
          writeJson(response, 503, { error: `${options.provider.toUpperCase()} API key is not configured.` })
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

          const upstreamResponse = options.provider === 'potens'
            ? await fetch('https://ai.potens.ai/api/chat-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options.apiKey}` },
                body: JSON.stringify({ prompt: `${systemPrompt}\n\n${prompt}`, model: options.model }),
              })
            : await fetch(
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
          if (options.provider === 'potens' && !upstreamResponse.ok) {
            const errorBody = await upstreamResponse.text()
            const preview = errorBody.replace(/\s+/g, ' ').trim().slice(0, 180)
            writeJson(response, upstreamResponse.status, { error: preview ? `${options.provider} API request failed (HTTP ${upstreamResponse.status}): ${preview}` : `${options.provider} API request failed (HTTP ${upstreamResponse.status}).` })
            return
          }
          const isPotensStream = options.provider === 'potens' && upstreamResponse.headers.get('content-type')?.includes('text/event-stream')
          const rawResponse = isPotensStream
            ? await readPotensStream(upstreamResponse)
            : await upstreamResponse.text()
          let payload: GeminiResponse & PotensResponse = {}
          if (!isPotensStream) try {
            payload = JSON.parse(rawResponse) as GeminiResponse & PotensResponse
          } catch {
            const preview = rawResponse.replace(/\s+/g, ' ').trim().slice(0, 180)
            writeJson(response, 502, { error: `${options.provider} returned non-JSON response (HTTP ${upstreamResponse.status}): ${preview}` })
            return
          }

          if (!upstreamResponse.ok) {
            const providerError = typeof payload.error === 'string' ? payload.error : payload.error?.message
            writeJson(response, upstreamResponse.status, {
              error: providerError ?? `${options.provider} API request failed.`,
            })
            return
          }

          const text = options.provider === 'potens'
            ? extractProviderText(payload) || rawResponse
            : payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('')
          const normalizedText = (text ?? '').trim()

          if (!normalizedText) {
            writeJson(response, 502, { error: `${options.provider} returned an empty response.` })
            return
          }

          writeJson(response, 200, {
            text: normalizedText,
            provider: options.provider,
            model: options.model,
            generatedAt: new Date().toISOString(),
          })
        } catch (error) {
          console.error('LLM development proxy failed.', error)
          writeJson(response, 502, { error: error instanceof Error ? `LLM provider request failed: ${error.message}` : 'LLM provider request failed.' })
        }
      })
    },
  }
}

const REPORT_ASSISTANT_PATH = '/api/report-assistant'
const MAX_REPORT_BODY_BYTES = 100 * 1024

function readReportBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []
    let size = 0

    request.on('data', (chunk: Buffer | string) => {
      const value = String(chunk)
      size += Buffer.byteLength(value)
      if (size > MAX_REPORT_BODY_BYTES) {
        reject(new Error('REQUEST_TOO_LARGE'))
        request.destroy()
        return
      }
      chunks.push(value)
    })
    request.on('end', () => {
      try {
        const parsed: unknown = JSON.parse(chunks.join('') || '{}')
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_JSON')
        resolve(parsed as Record<string, unknown>)
      } catch (error) {
        reject(error instanceof Error ? error : new Error('INVALID_JSON'))
      }
    })
    request.on('error', reject)
  })
}

function reportAssistantProxy(gasUrl: string): Plugin {
  const install = (server: { middlewares: { use: (path: string, handler: (request: IncomingMessage, response: ServerResponse) => void) => void } }) => {
    server.middlewares.use(REPORT_ASSISTANT_PATH, (request, response) => {
      void (async () => {
        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST')
          writeJson(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only.' } })
          return
        }
        if (!gasUrl) {
          writeJson(response, 503, { ok: false, error: { code: 'PROXY_URL_MISSING', message: 'VITE_POTENS_PROXY_URL is not configured.' } })
          return
        }

        try {
          const body = await readReportBody(request)
          const action = String(body.action ?? '')
          const allowedActions = ['generateReport', 'generatePolicyDraft', 'askReportQuestion', 'getReportContent', 'saveReportContent']
          if (!allowedActions.includes(action)) {
            writeJson(response, 400, { ok: false, error: { code: 'INVALID_ACTION', message: 'Unsupported report action.' } })
            return
          }

          const upstreamBody = action === 'generateReport'
            ? { action, riskInput: body.riskInput }
            : action === 'generatePolicyDraft'
              ? { action, reportContext: body.reportContext }
              : action === 'askReportQuestion'
                ? { action, reportContext: body.reportContext, question: body.question, recentConversation: body.recentConversation }
                : action === 'getReportContent'
                  ? { action, reportId: body.reportId }
                  : { action, reportId: body.reportId, content: body.content }
          const upstream = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: JSON.stringify(upstreamBody),
            redirect: 'follow',
          })
          const upstreamText = await upstream.text()
          let upstreamJson: unknown
          try {
            upstreamJson = JSON.parse(upstreamText)
          } catch {
            writeJson(response, 502, { ok: false, error: { code: 'UPSTREAM_RESPONSE_INVALID', message: 'The report service did not return JSON.' } })
            return
          }
          if (!upstream.ok) {
            writeJson(response, 502, { ok: false, error: { code: 'UPSTREAM_HTTP_ERROR', message: `Report service request failed (HTTP ${upstream.status}).` } })
            return
          }
          writeJson(response, 200, upstreamJson)
        } catch (error) {
          const code = error instanceof Error && error.message === 'REQUEST_TOO_LARGE' ? 'REQUEST_TOO_LARGE' : 'VITE_PROXY_ERROR'
          writeJson(response, code === 'REQUEST_TOO_LARGE' ? 413 : 502, { ok: false, error: { code, message: 'Report assistant proxy request failed.' } })
        }
      })()
    })
  }

  return {
    name: 'report-assistant-gas-proxy',
    configureServer(server) { install(server as unknown as Parameters<typeof install>[0]) },
    configurePreviewServer(server) { install(server as unknown as Parameters<typeof install>[0]) },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      createLlmApiPlugin({
        apiKey: env.POTENS_API_KEY || env.VITE_POTENS_PROXY_URL || env.GEMINI_API_KEY || '',
        model: env.POTENS_MODEL || (env.POTENS_API_KEY || env.VITE_POTENS_PROXY_URL ? 'claude-4-6-sonnet' : env.GEMINI_MODEL || 'gemini-3.6-flash'),
        provider: env.POTENS_API_KEY || env.VITE_POTENS_PROXY_URL ? 'potens' : 'gemini',
      }),
      reportAssistantProxy(env.VITE_POTENS_PROXY_URL?.trim() ?? ''),
    ],
    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
          introduction: 'project-introduction.html',
        },
      },
    },
  }
})
