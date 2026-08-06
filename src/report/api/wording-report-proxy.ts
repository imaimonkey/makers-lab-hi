import type {
  AiRiskInput,
  JsonObject,
  PolicyDraftRequest,
  ReportContentSaveRequest,
  ReportQuestionRequest,
} from '../types'
import { ReportProxyError, type ReportProxy, type ReportProxyRequestOptions } from './report-proxy'
import { createResilientReportProxy } from './resilient-report-proxy'

type LlmResponse = {
  text?: unknown
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null

const readResponseText = (value: unknown): string => {
  const record = asRecord(value)
  return typeof record?.text === 'string' ? record.text.trim() : ''
}

const stringifyContext = (value: JsonObject | undefined): string =>
  value ? JSON.stringify(value) : '{}'

/**
 * The wording editor uses the existing same-origin LLM route for chat while
 * report reads and saves continue through the report proxy/local fallback.
 * Provider credentials therefore stay on the server side.
 */
export class WordingReportProxy implements ReportProxy {
  constructor(
    private readonly llmEndpoint: string,
    private readonly reportProxy: ReportProxy = createResilientReportProxy('/api/report-assistant'),
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  generateReport(riskInput: AiRiskInput, options?: ReportProxyRequestOptions): Promise<unknown> {
    return this.reportProxy.generateReport(riskInput, options)
  }

  generatePolicyDraft(request: PolicyDraftRequest, options?: ReportProxyRequestOptions): Promise<unknown> {
    return this.reportProxy.generatePolicyDraft(request, options)
  }

  async askReportQuestion(
    request: ReportQuestionRequest,
    options: ReportProxyRequestOptions = {},
  ): Promise<unknown> {
    const prompt = [
      '리포트 약관 검토 화면의 실무자 질문입니다.',
      '아래 리포트 문맥과 약관 조문 문맥만 사용해 한국어로 답변하세요.',
      '확인할 수 없는 내용은 추정하지 말고 추가 확인이 필요하다고 밝혀 주세요.',
      '사용자가 문구 작성이나 수정을 요청하면 바로 사용할 수 있는 검토용 문안을 제시하되 최종 약관이나 법률 의견으로 단정하지 마세요.',
      '',
      `질문:\n${request.question}`,
      `최근 대화:\n${JSON.stringify(request.recentConversation.slice(-5))}`,
      `리포트 문맥:\n${stringifyContext(request.reportContext)}`,
      `약관 문맥:\n${stringifyContext(request.policyContext)}`,
    ].join('\n')

    let response: Response
    try {
      response = await this.fetchImpl(this.llmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: '너는 보험상품 개발 실무자의 약관 검토를 돕는 검색·작성 보조 AI다.',
          prompt,
        }),
        signal: options.signal,
      })
    } catch {
      if (options.signal?.aborted) throw new ReportProxyError('REQUEST_ABORTED', '약관 AI 요청이 중단되었습니다.')
      throw new ReportProxyError('NETWORK_ERROR', '약관 AI 서버에 연결하지 못했습니다.')
    }

    if (!response.ok) {
      throw new ReportProxyError('LLM_HTTP_ERROR', `약관 AI 요청이 실패했습니다. (HTTP ${response.status})`)
    }

    let payload: LlmResponse
    try {
      payload = await response.json() as LlmResponse
    } catch {
      throw new ReportProxyError('LLM_RESPONSE_INVALID', '약관 AI 응답을 읽지 못했습니다.')
    }

    const answer = readResponseText(payload)
    if (!answer) throw new ReportProxyError('LLM_RESPONSE_EMPTY', '약관 AI 응답이 비어 있습니다.')

    const policyContext = asRecord(request.policyContext)
    const selectedArticleLabel = typeof policyContext?.selectedArticleLabel === 'string'
      ? policyContext.selectedArticleLabel
      : ''
    const evidenceIds = Array.isArray(policyContext?.evidenceIds)
      ? policyContext.evidenceIds.filter((item): item is string => typeof item === 'string')
      : []

    return {
      answer,
      relatedSections: selectedArticleLabel ? [selectedArticleLabel] : [],
      evidenceIds,
      isMock: false,
    }
  }

  getReportContent(reportId: string): Promise<unknown> {
    return this.reportProxy.getReportContent?.(reportId) ?? Promise.resolve(null)
  }

  saveReportContent(request: ReportContentSaveRequest, options?: ReportProxyRequestOptions): Promise<unknown> {
    return this.reportProxy.saveReportContent?.(request, options)
      ?? Promise.reject(new ReportProxyError('SAVE_UNAVAILABLE', '약관 편집 저장 API가 설정되지 않았습니다.'))
  }
}

export const createWordingReportProxy = (
  llmEndpoint = '/api/llm/generate',
  reportAssistantEndpoint = '/api/report-assistant',
  fetchImpl?: typeof fetch,
): ReportProxy => new WordingReportProxy(
  llmEndpoint,
  createResilientReportProxy(reportAssistantEndpoint, fetchImpl),
  fetchImpl,
)
