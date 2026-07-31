import { runLlmUtility } from '../llmService'
import { readDeveloperPromptFile } from '../developerPromptFileRepository'
export { llmUtilityDefinition } from './systemPrompt'

export function runUtil3(prompt: string, systemPrompt?: string) {
  return runLlmUtility({ utilityId: 'util-3', systemPrompt, prompt })
}

export const step3PromptDefinitions = [
  ['01-risk-context-and-input.md', 'context'],
  ['02-risk-summary.md', 'summary'],
  ['03-assessment-scores.md', 'assessment'],
  ['04-signal-trend.md', 'trend'],
  ['05-evidence-ledger.md', 'evidence'],
  ['06-decision-brief.md', 'decisionBrief'],
  ['07-productization-review.md', 'productization'],
  ['08-human-review-handoff.md', 'handoff'],
] as const

export type Step3AnalysisKey = typeof step3PromptDefinitions[number][1]
export type Step3RiskInput = { riskId: string; articleId: string; article: unknown; risk: unknown; detail: unknown }

export async function runStep3Analysis(key: Step3AnalysisKey, input: Step3RiskInput) {
  const definition = step3PromptDefinitions.find((item) => item[1] === key)
  if (!definition) throw new Error(`알 수 없는 Step 3 분석 유형입니다: ${key}`)
  const prompt = await readDeveloperPromptFile('step3', definition[0])
  return runUtil3(JSON.stringify(input, null, 2), prompt.text)
}

export type SavedStep3AnalysisRow = { riskId: string; articleId: string; step: Step3AnalysisKey; mode: string; model?: string; generatedAt: string; resultJson: string; savedAt?: string }

export async function saveStep3AnalysisResults(input: { riskId: string; articleId: string; results: Record<string, { text: string; mode: string; model?: string; generatedAt: string }> }) {
  const response = await fetch('/api/llm/util-3/step3-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  const payload = await response.json() as { error?: unknown; file?: string; savedAt?: string }
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Step 3 분석 결과 저장에 실패했습니다.')
  return payload
}

export async function readStep3AnalysisResults(): Promise<SavedStep3AnalysisRow[]> {
  const response = await fetch('/api/llm/util-3/step3-analysis')
  const payload = await response.json() as { rows?: unknown[] }
  if (!response.ok || !Array.isArray(payload.rows)) return []
  return payload.rows.filter((row): row is SavedStep3AnalysisRow => Boolean(row && typeof row === 'object' && typeof (row as SavedStep3AnalysisRow).riskId === 'string' && typeof (row as SavedStep3AnalysisRow).step === 'string' && typeof (row as SavedStep3AnalysisRow).resultJson === 'string'))
}
