import { useState } from 'react'
import type {
  JsonObject,
  PolicyDraftResult,
  ReportQuestionAnswer,
  ReportResult,
  RiskSourceData,
} from '../types'
import type { ReportProxy } from '../api/report-proxy'
import { askReportQuestion, generatePolicyDraft } from '../services/report-assist'
import { ReportModal } from './ReportModal'

type AssistState = 'idle' | 'loading' | 'success' | 'fallback' | 'error'

const recommendedQuestions = [
  '이 상품안의 가장 취약한 판단 근거는?',
  '상품화 전에 반드시 확보해야 할 데이터는?',
  '약관 초안에서 모호한 표현을 찾아줘',
  '기존 보험과 중복될 가능성을 설명해줘',
]

const copyText = async (value: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function PolicyDraftModal({
  report,
  riskData,
  reportProxy,
  onClose,
}: {
  report: ReportResult
  riskData: RiskSourceData
  reportProxy: ReportProxy
  onClose: () => void
}) {
  const [state, setState] = useState<AssistState>('idle')
  const [draft, setDraft] = useState<PolicyDraftResult | null>(null)
  const [message, setMessage] = useState('')

  const create = async () => {
    setState('loading')
    setMessage('')
    try {
      const outcome = await generatePolicyDraft({ report, riskData, reportProxy })
      if (!outcome.value) {
        setState('error')
        setMessage(outcome.errorMessage ?? 'AI 약관 초안을 생성하지 못했습니다.')
        return
      }
      setDraft(outcome.value)
      setMessage(outcome.errorMessage ?? '')
      setState(outcome.mode)
    } catch {
      setState('error')
      setMessage('약관 초안 요청을 시작하지 못했습니다.')
    }
  }

  const copyAll = async () => {
    if (!draft) return
    const text = [draft.title, draft.disclaimer, ...draft.sections.map((item) => `${item.title}\n${item.content}`)].join('\n\n')
    setMessage(await copyText(text) ? '약관 초안 전체를 복사했습니다.' : '브라우저에서 복사 권한을 허용해 주세요.')
  }

  return (
    <ReportModal eyebrow="AI POLICY DRAFT" title="약관 초안 작성" onClose={onClose}>
      <p className="report-page__notice">
        AI 작성 검토용 초안입니다. 실제 약관 자료를 참고했다는 의미가 아니며, 최종 약관·법률 의견·보험료 또는 보상한도 기준이 아닙니다.
      </p>
      {state === 'idle' ? (
        <div className="report-page__assist-empty">
          <h3>상품 구조와 현재 리포트를 바탕으로 약관 검토 초안을 만듭니다.</h3>
          <button className="report-page__button report-page__button--primary" type="button" onClick={create}>AI 약관 초안 작성</button>
        </div>
      ) : null}
      {state === 'loading' ? <p className="report-page__assist-loading" role="status">AI가 약관 검토 초안을 작성하고 있습니다.</p> : null}
      {state === 'error' ? (
        <div className="report-page__assist-empty">
          <p>{message}</p>
          <button className="report-page__button" type="button" onClick={create}>다시 시도</button>
        </div>
      ) : null}
      {(state === 'success' || state === 'fallback') && draft ? (
        <div className="report-page__policy-draft">
          {draft.isMock ? <p className="report-page__assist-fallback">시연용 mock 약관 초안입니다. {state === 'fallback' ? message : ''}</p> : <p className="report-page__assist-source">포텐스 AI 생성 약관 초안입니다.</p>}
          <div className="report-page__policy-draft-top">
            <div><h3>{draft.title}</h3><p>{draft.disclaimer}</p></div>
            <button className="report-page__button" type="button" onClick={copyAll}>전체 복사</button>
          </div>
          {draft.sections.map((section) => (
            <section key={section.id} className="report-page__policy-section">
              <div><h4>{section.title}</h4><button className="report-page__text-button" type="button" onClick={async () => setMessage(await copyText(section.content) ? `${section.title}을(를) 복사했습니다.` : '브라우저에서 복사 권한을 허용해 주세요.')}>영역 복사</button></div>
              <p>{section.content}</p>
            </section>
          ))}
        </div>
      ) : null}
      {message && state !== 'fallback' ? <p className="report-page__copy-message" role="status">{message}</p> : null}
    </ReportModal>
  )
}

export function ReportQuestionPanel({
  report,
  riskData,
  reportProxy,
  onClose,
  onAddToMemo,
}: {
  report: ReportResult
  riskData: RiskSourceData
  reportProxy: ReportProxy
  onClose: () => void
  onAddToMemo: (text: string) => void
}) {
  const [question, setQuestion] = useState('')
  const [state, setState] = useState<AssistState>('idle')
  const [answer, setAnswer] = useState<ReportQuestionAnswer | null>(null)
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState<JsonObject[]>([])

  const ask = async (nextQuestion = question) => {
    const normalizedQuestion = nextQuestion.trim()
    if (!normalizedQuestion) {
      setState('error')
      setMessage('질문을 입력하거나 추천 질문을 선택해 주세요.')
      return
    }
    setQuestion(normalizedQuestion)
    setState('loading')
    setMessage('')
    try {
      const outcome = await askReportQuestion({
        question: normalizedQuestion,
        recentConversation: conversation,
        report,
        riskData,
        reportProxy,
      })
      if (!outcome.value) {
        setState('error')
        setMessage(outcome.errorMessage ?? 'AI 질의에 답변하지 못했습니다.')
        return
      }
      setAnswer(outcome.value)
      setConversation((current) => [
        ...current,
        { role: 'user', content: normalizedQuestion },
        { role: 'assistant', content: outcome.value!.answer },
      ].slice(-5))
      setMessage(outcome.errorMessage ?? '')
      setState(outcome.mode)
    } catch {
      setState('error')
      setMessage('AI 질의 요청을 시작하지 못했습니다.')
    }
  }

  return (
    <ReportModal variant="side-panel" eyebrow="AI REPORT Q&A" title="이 리포트에 AI 질문" onClose={onClose}>
      <div className="report-page__question-suggestions">
        <p>추천 질문</p>
        {recommendedQuestions.map((item) => <button key={item} className="report-page__button" type="button" onClick={() => ask(item)}>{item}</button>)}
      </div>
      <label className="report-page__field-label" htmlFor="report-question">직접 질문</label>
      <textarea id="report-question" rows={4} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="현재 리포트의 판단 근거와 보장 공백에 대해 질문하세요." />
      <button className="report-page__button report-page__button--primary" type="button" onClick={() => ask()}>AI에 질문</button>
      {state === 'loading' ? <p className="report-page__assist-loading" role="status">AI가 리포트 내용을 검토하고 있습니다.</p> : null}
      {state === 'error' ? <p className="report-page__assist-error" role="alert">{message}</p> : null}
      {(state === 'success' || state === 'fallback') && answer ? (
        <div className="report-page__question-answer">
          {answer.isMock ? <p className="report-page__assist-fallback">시연용 mock 답변입니다. {state === 'fallback' ? message : ''}</p> : <p className="report-page__assist-source">포텐스 AI 답변입니다.</p>}
          <p>{answer.answer}</p>
          {answer.relatedSections.length ? <p><strong>관련 리포트 영역</strong>{answer.relatedSections.join(', ')}</p> : null}
          {answer.evidenceIds.length ? <p><strong>근거자료 ID</strong>{answer.evidenceIds.join(', ')}</p> : null}
          <button className="report-page__button" type="button" onClick={() => onAddToMemo(`[AI 질의] ${question}\n${answer.answer}`)}>답변을 실무자 메모에 추가</button>
        </div>
      ) : null}
    </ReportModal>
  )
}

