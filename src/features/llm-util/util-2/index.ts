import { runLlmUtility } from '../llmService'
import riskCandidatePrompt from '../systemprompting-base-key-value-docs/step2/01-risk-candidate-card.md?raw'
import screeningMetricsPrompt from '../systemprompting-base-key-value-docs/step2/02-screening-metrics-card.md?raw'
import lawRegulationPrompt from '../systemprompting-base-key-value-docs/step2/03-law-regulation-card.md?raw'
import caseLossMarketPrompt from '../systemprompting-base-key-value-docs/step2/04-case-loss-market-card.md?raw'
import articleQueuePrompt from '../systemprompting-base-key-value-docs/step2/05-article-analysis-queue-card.md?raw'
import candidateReviewPrompt from '../systemprompting-base-key-value-docs/step2/06-candidate-review-card.md?raw'
import signalTrendPrompt from '../systemprompting-base-key-value-docs/step2/07-signal-trend-card.md?raw'
export { llmUtilityDefinition } from './systemPrompt'

const step2PromptFiles: Record<string, string> = {
  '01-risk-candidate-card.md': riskCandidatePrompt,
  '02-screening-metrics-card.md': screeningMetricsPrompt,
  '03-law-regulation-card.md': lawRegulationPrompt,
  '04-case-loss-market-card.md': caseLossMarketPrompt,
  '05-article-analysis-queue-card.md': articleQueuePrompt,
  '06-candidate-review-card.md': candidateReviewPrompt,
  '07-signal-trend-card.md': signalTrendPrompt,
}

export const step2PromptDefinitions = [
  ['01-risk-candidate-card.md', 'candidate'],
  ['02-screening-metrics-card.md', 'metrics'],
  ['03-law-regulation-card.md', 'law'],
  ['04-case-loss-market-card.md', 'caseLossMarket'],
  ['05-article-analysis-queue-card.md', 'articleQueue'],
  ['06-candidate-review-card.md', 'candidateReview'],
  ['07-signal-trend-card.md', 'signalTrend'],
] as const

export type Step2AnalysisKey = typeof step2PromptDefinitions[number][1]

export type Step2ArticleInput = {
  articleId: string
  title: string
  body: string
  sourceName: string
  sourceUrl?: string
  publishedAt?: string
  collectedAt: string
  knownEvidenceIds: string[]
  priorArticles: string[]
}

export function runUtil2(prompt: string, systemPrompt?: string) {
  return runLlmUtility({ utilityId: 'util-2', systemPrompt, prompt })
}

export function runStep2Analysis(key: Step2AnalysisKey, article: Step2ArticleInput) {
  const definition = step2PromptDefinitions.find((item) => item[1] === key)
  if (!definition) throw new Error(`알 수 없는 Step 2 분석 유형입니다: ${key}`)
  const [fileName] = definition
  const systemPrompt = step2PromptFiles[fileName]
  if (!systemPrompt) throw new Error(`${fileName} 프롬프트를 찾지 못했습니다.`)
  return runUtil2(JSON.stringify(article, null, 2), systemPrompt)
}

export async function saveStep2AnalysisResults(input: {
  articleId: string
  fileName: string
  results: Record<string, { text: string; mode: string; generatedAt: string }>
}) {
  const response = await fetch('/api/llm/util-2/step2-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const payload = await response.json() as { error?: unknown; file?: string; savedAt?: string; sheets?: string[] }
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Step 2 분석 결과 저장에 실패했습니다.')
  return payload
}

export type SavedStep2AnalysisRow = {
  articleId: string
  fileName: string
  step: Step2AnalysisKey
  mode: string
  generatedAt: string
  resultJson: string
}

export async function readStep2AnalysisResults(): Promise<SavedStep2AnalysisRow[]> {
  const response = await fetch('/api/llm/util-2/step2-analysis')
  const payload = await response.json() as { rows?: unknown[] }
  if (!response.ok || !Array.isArray(payload.rows)) return []
  return payload.rows.filter((row): row is SavedStep2AnalysisRow => Boolean(row && typeof row === 'object' && typeof (row as SavedStep2AnalysisRow).articleId === 'string' && typeof (row as SavedStep2AnalysisRow).step === 'string' && typeof (row as SavedStep2AnalysisRow).resultJson === 'string'))
}
