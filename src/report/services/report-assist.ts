import { normalizePotensResponse } from '../api/normalize-response'
import type { ReportProxy } from '../api/report-proxy'
import type {
  JsonObject,
  PolicyDraftResult,
  ReportQuestionAnswer,
  ReportResult,
  RiskSourceData,
} from '../types'
import { createMockPolicyDraft } from './mock-policy-draft'
import { createMockReportQuestionAnswer } from './mock-qna-responses'
import { buildReportAiContext, isReportAiContext } from './report-ai-context'
import { ReportProxyError } from '../api/report-proxy'

export type AiFeatureMode = 'mock' | 'api' | 'auto'
type AssistMode = 'success' | 'fallback' | 'error'

export type AssistOutcome<T> = {
  mode: AssistMode
  source: 'api' | 'mock'
  value?: T
  errorMessage?: string
}

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asText = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const asTexts = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []

const readMode = (value: string | undefined): AiFeatureMode =>
  value === 'api' || value === 'auto' || value === 'mock' ? value : 'mock'

export const getPolicyAiMode = (): AiFeatureMode =>
  readMode(import.meta.env.VITE_POLICY_AI_MODE)

export const getQnaAiMode = (): AiFeatureMode =>
  readMode(import.meta.env.VITE_QNA_AI_MODE)

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof ReportProxyError
    ? `[${error.code}] ${error.message}`
    : error instanceof Error && error.message ? error.message : fallback

const createContext = (riskData: RiskSourceData, report: ReportResult): JsonObject => {
  const context = buildReportAiContext(riskData, report)
  if (!isReportAiContext(context)) {
    throw new ReportProxyError('INVALID_REQUEST', '리포트 AI 문맥 계약이 올바르지 않습니다.')
  }
  return context
}

const normalizePolicyDraft = (raw: unknown, report: ReportResult): PolicyDraftResult => {
  const source = normalizePotensResponse(raw)
  const sectionItems = Array.isArray(source.sections) ? source.sections.filter(isRecord) : []
  const sections = sectionItems.map((item, index) => ({
    id: asText(item.id, `section-${index + 1}`),
    title: asText(item.title, `검토 항목 ${index + 1}`),
    content: asText(item.content, '담당자 결정 필요'),
  }))

  if (sections.length < 9) {
    throw new Error('약관 초안의 필수 영역이 부족합니다.')
  }

  return {
    title: asText(source.title, `${report.productProposal.workingName || report.meta.riskTitle} 약관 초안`),
    disclaimer: 'AI 작성 검토용 초안입니다. 최종 약관이나 보험 조건이 아닙니다.',
    sections,
    isMock: false,
  }
}

const normalizeQuestionAnswer = (raw: unknown): ReportQuestionAnswer => {
  const source = normalizePotensResponse(raw)
  const answer = asText(source.answer, '')
  if (!answer) throw new Error('AI 질의 응답이 비어 있습니다.')
  return {
    answer,
    relatedSections: asTexts(source.relatedSections),
    evidenceIds: asTexts(source.evidenceIds),
    isMock: false,
  }
}

export const generatePolicyDraft = async ({
  report,
  riskData,
  reportProxy,
}: {
  report: ReportResult
  riskData: RiskSourceData
  reportProxy: ReportProxy
}): Promise<AssistOutcome<PolicyDraftResult>> => {
  const mode = getPolicyAiMode()
  const mock = (): AssistOutcome<PolicyDraftResult> => ({
    mode: 'success',
    source: 'mock',
    value: createMockPolicyDraft(report),
  })

  if (mode === 'mock') return mock()

  try {
    const raw = await reportProxy.generatePolicyDraft({ reportContext: createContext(riskData, report) })
    return { mode: 'success', source: 'api', value: normalizePolicyDraft(raw, report) }
  } catch (error) {
    const message = errorMessage(error, 'AI 약관 초안을 생성하지 못했습니다.')
    if (mode === 'auto') {
      return { mode: 'fallback', source: 'mock', value: createMockPolicyDraft(report), errorMessage: message }
    }
    return { mode: 'error', source: 'api', errorMessage: message }
  }
}

export const askReportQuestion = async ({
  question,
  recentConversation,
  report,
  riskData,
  reportProxy,
  policyContext,
  mode: requestedMode,
}: {
  question: string
  recentConversation: JsonObject[]
  report: ReportResult
  riskData: RiskSourceData
  reportProxy: ReportProxy
  policyContext?: JsonObject
  mode?: AiFeatureMode
}): Promise<AssistOutcome<ReportQuestionAnswer>> => {
  const mode = requestedMode ?? getQnaAiMode()
  const mock = (): AssistOutcome<ReportQuestionAnswer> => ({
    mode: 'success',
    source: 'mock',
    value: createMockReportQuestionAnswer(question, report),
  })

  if (mode === 'mock') return mock()

  try {
    const raw = await reportProxy.askReportQuestion({
      reportContext: createContext(riskData, report),
      question,
      recentConversation: recentConversation.slice(-5),
      policyContext,
    })
    return { mode: 'success', source: 'api', value: normalizeQuestionAnswer(raw) }
  } catch (error) {
    const message = errorMessage(error, 'AI 질의에 답변하지 못했습니다.')
    if (mode === 'auto') {
      return { mode: 'fallback', source: 'mock', value: createMockReportQuestionAnswer(question, report), errorMessage: message }
    }
    return { mode: 'error', source: 'api', errorMessage: message }
  }
}
