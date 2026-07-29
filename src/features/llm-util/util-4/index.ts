import { runLlmUtility } from '../llmService'
import summaryPrompt from '../systemprompting-base-key-value-docs/step4/01-productization-review-summary.md?raw'
import gapPrompt from '../systemprompting-base-key-value-docs/step4/02-coverage-gap.md?raw'
import wordingPrompt from '../systemprompting-base-key-value-docs/step4/03-wording-review.md?raw'
import assessmentPrompt from '../systemprompting-base-key-value-docs/step4/04-productization-assessment.md?raw'
import structurePrompt from '../systemprompting-base-key-value-docs/step4/05-product-structure.md?raw'
import briefingPrompt from '../systemprompting-base-key-value-docs/step4/06-executive-briefing.md?raw'
import evidencePrompt from '../systemprompting-base-key-value-docs/step4/07-evidence-and-follow-up.md?raw'
export { llmUtilityDefinition } from './systemPrompt'

const step4Prompts = {
  summary: summaryPrompt,
  gap: gapPrompt,
  wording: wordingPrompt,
  assessment: assessmentPrompt,
  structure: structurePrompt,
  briefing: briefingPrompt,
  evidence: evidencePrompt,
} as const

export const step4PromptDefinitions = Object.keys(step4Prompts) as Array<keyof typeof step4Prompts>
export type Step4AnalysisKey = keyof typeof step4Prompts

export type Step4ArticleInput = {
  articleId: string
  title: string
  body: string
  sourceName: string
  collectedAt: string
  knownEvidenceIds: string[]
  priorArticles: string[]
}

export function runUtil4(prompt: string, systemPrompt?: string) {
  return runLlmUtility({ utilityId: 'util-4', systemPrompt, prompt })
}

export function runStep4Analysis(key: Step4AnalysisKey, input: Step4ArticleInput) {
  const systemPrompt = step4Prompts[key]
  if (!systemPrompt) throw new Error(`알 수 없는 Step 4 분석 유형입니다: ${key}`)
  return runUtil4(JSON.stringify(input, null, 2), systemPrompt)
}

export type SavedStep4AnalysisRow = { articleId: string; fileName: string; step: Step4AnalysisKey; mode: string; model?: string; generatedAt: string; resultJson: string; savedAt?: string }

export async function saveStep4AnalysisResults(input: { articleId: string; fileName: string; results: Record<string, { text: string; mode: string; model?: string; generatedAt: string }> }) {
  const response = await fetch('/api/llm/util-4/step4-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  const payload = await response.json() as { error?: unknown; file?: string; savedAt?: string }
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Step 4 결과 저장에 실패했습니다.')
  return payload
}

export async function readStep4AnalysisResults(): Promise<SavedStep4AnalysisRow[]> {
  const response = await fetch('/api/llm/util-4/step4-analysis')
  const payload = await response.json() as { rows?: unknown[] }
  if (!response.ok || !Array.isArray(payload.rows)) return []
  return payload.rows.filter((row): row is SavedStep4AnalysisRow => Boolean(row && typeof row === 'object' && typeof (row as SavedStep4AnalysisRow).articleId === 'string' && typeof (row as SavedStep4AnalysisRow).step === 'string' && typeof (row as SavedStep4AnalysisRow).resultJson === 'string'))
}
