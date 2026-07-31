import type { SavedStep3AnalysisRow, Step3AnalysisKey } from '../llm-util/util-3'

export type Step3ResultMap = Partial<Record<Step3AnalysisKey, SavedStep3AnalysisRow>>

/**
 * LLM 응답은 프롬프트 계약상 JSON이어야 하지만, 실제 공급자 응답에는
 * Markdown 설명과 코드 펜스가 함께 저장될 수 있습니다. 첫 번째 완결된
 * JSON 객체만 추출해 화면과 후속 단계가 같은 저장 결과를 사용하도록 합니다.
 */
export function parseStep3Json(text: string): Record<string, unknown> {
  const source = text.trim().replace(/^```(?:json)?\s*/i, '')
  const start = source.indexOf('{')
  if (start < 0) return {}

  let depth = 0
  let quoted = false
  let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          const value: unknown = JSON.parse(source.slice(start, index + 1))
          return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
        } catch {
          return {}
        }
      }
    }
  }
  return {}
}

export function makeStep3ResultMap(rows: SavedStep3AnalysisRow[] = []): Step3ResultMap {
  return Object.fromEntries(rows.map((row) => [row.step, row])) as Step3ResultMap
}

export function step3Root(rows: SavedStep3AnalysisRow[] | Step3ResultMap, step: Step3AnalysisKey): Record<string, unknown> {
  const row = Array.isArray(rows) ? rows.find((item) => item.step === step) : rows[step]
  return row ? parseStep3Json(row.resultJson) : {}
}

export function step3Nested(rows: SavedStep3AnalysisRow[] | Step3ResultMap, step: Step3AnalysisKey, key: string): Record<string, unknown> {
  const root = step3Root(rows, step)
  const value = root[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function step3Text(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

export function step3TextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => step3Text(item)).filter(Boolean)
  const text = step3Text(value)
  return text ? [text] : []
}

export function step3HasResults(rows: SavedStep3AnalysisRow[] = []): boolean {
  return rows.some((row) => row.mode !== 'mock' && Boolean(parseStep3Json(row.resultJson)))
}

export function step3ResultMeta(rows: SavedStep3AnalysisRow[] | Step3ResultMap, step: Step3AnalysisKey) {
  const row = Array.isArray(rows) ? rows.find((item) => item.step === step) : rows[step]
  return row ? { mode: row.mode, model: row.model, generatedAt: row.generatedAt } : null
}
