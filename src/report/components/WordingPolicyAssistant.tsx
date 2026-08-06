import { useEffect, useMemo, useState } from 'react'
import type { FullPolicyDraft, PolicyArticle } from '../data/aiFullPolicyDraftMock'
import type { ReportProxy } from '../api/report-proxy'
import type { JsonObject, ReportResult, RiskSourceData, WordingPolicyEditor } from '../types'
import { askReportQuestion } from '../services/report-assist'

type ArticleOption = {
  key: string
  label: string
  text: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  isMock?: boolean
  relatedSections?: string[]
  evidenceIds?: string[]
}

const articleText = (article: PolicyArticle): string => [
  ...article.paragraphs,
  ...(article.items ?? []).map((item) => typeof item === 'string' ? item : `${item.term}: ${item.definition}`),
].filter(Boolean).join('\n')

const getArticleOptions = (policyDraft: FullPolicyDraft): ArticleOption[] => [
  ...policyDraft.commonPolicy.sections.flatMap((section) => section.articles.map((article) => ({
    key: `common-${section.id}-${article.number}`,
    label: `보통약관 · 제${article.number}조 ${article.title}`,
    text: articleText(article),
  }))),
  ...policyDraft.specialClauses.flatMap((clause) => clause.articles.map((article) => ({
    key: `special-${clause.id}-${article.number}`,
    label: `${clause.shortTitle} · 제${article.number}조 ${article.title}`,
    text: articleText(article),
  }))),
]

const initialMessage = (articleLabel: string): ChatMessage => ({
  id: 'assistant-welcome',
  role: 'assistant',
  text: `현재 ${articleLabel}을 중심으로 약관 본문을 확인할 수 있습니다. 조항 검색, 의미 설명, 문안 작성·수정을 요청해 주세요.`,
})

export function WordingPolicyAssistant({
  report,
  riskData,
  reportProxy,
  policyDraft,
  activeArticleKey,
  editor,
  onActiveArticleChange,
  onSave,
  onClose,
}: {
  report: ReportResult
  riskData: RiskSourceData
  reportProxy: ReportProxy
  policyDraft: FullPolicyDraft
  activeArticleKey: string | null
  editor?: WordingPolicyEditor
  onActiveArticleChange: (key: string) => void
  onSave: (editor: WordingPolicyEditor) => Promise<boolean>
  onClose: () => void
}) {
  const articleOptions = useMemo(() => getArticleOptions(policyDraft), [policyDraft])
  const selectedArticle = articleOptions.find((article) => article.key === activeArticleKey) ?? articleOptions[0]
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(() => [initialMessage(selectedArticle?.label ?? '현재 조항')])
  const [draftText, setDraftText] = useState(selectedArticle?.text ?? '')
  const [draftKey, setDraftKey] = useState(selectedArticle?.key ?? '')
  const [loading, setLoading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!selectedArticle || selectedArticle.key === draftKey) return
    const stored = editor?.articleDrafts[selectedArticle.key]
    // Changing the selected article intentionally resets the local editing state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftKey(selectedArticle.key)
    setDraftText(typeof stored === 'string' && stored.trim() ? stored : selectedArticle.text)
    setDirty(false)
    setStatusMessage('')
  }, [draftKey, editor?.articleDrafts, selectedArticle])

  const policyContext = useMemo<JsonObject>(() => ({
    schemaVersion: 'riskon.wording-policy-context/v1',
    documentTitle: policyDraft.documentTitle,
    selectedArticleKey: selectedArticle?.key ?? '',
    selectedArticleLabel: selectedArticle?.label ?? '',
    selectedArticleText: selectedArticle?.text ?? '',
    articles: articleOptions.map((article) => ({ key: article.key, label: article.label, text: article.text })),
    evidenceIds: report.evidence.slice(0, 8).map((item) => item.id),
  }), [articleOptions, policyDraft.documentTitle, report.evidence, selectedArticle])

  const ask = async (nextQuestion = question) => {
    const normalizedQuestion = nextQuestion.trim()
    if (!normalizedQuestion || loading) {
      if (!normalizedQuestion) setErrorMessage('질문이나 편집 요청을 입력해 주세요.')
      return
    }
    setQuestion('')
    setLoading(true)
    setErrorMessage('')
    setStatusMessage('')
    const recentConversation: JsonObject[] = messages.slice(-6).map((message) => ({ role: message.role, content: message.text }))
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: normalizedQuestion }])
    try {
      const outcome = await askReportQuestion({
        question: normalizedQuestion,
        recentConversation,
        report,
        riskData,
        reportProxy,
        policyContext,
        mode: 'auto',
      })
      if (!outcome.value) {
        setErrorMessage(outcome.errorMessage ?? '약관 AI 답변을 받지 못했습니다.')
        return
      }
      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: outcome.value!.answer,
        isMock: outcome.value!.isMock,
        relatedSections: outcome.value!.relatedSections,
        evidenceIds: outcome.value!.evidenceIds,
      }])
      setStatusMessage(outcome.errorMessage ?? '')
    } catch {
      setErrorMessage('약관 AI 요청을 시작하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const applyAnswerForEditing = (text: string) => {
    setDraftText(text)
    setDirty(true)
    setStatusMessage('답변을 편집창에 넣었습니다. 문안을 확인한 뒤 저장하세요.')
  }

  const save = async () => {
    if (!draftKey || !draftText.trim()) {
      setErrorMessage('저장할 약관 문안이 없습니다.')
      return
    }
    setErrorMessage('')
    setStatusMessage('약관 문안을 저장하고 있습니다.')
    const articleDrafts: JsonObject = { ...(editor?.articleDrafts ?? {}), [draftKey]: draftText.trim() }
    const saved = await onSave({ articleDrafts, updatedAt: new Date().toISOString() })
    if (saved) {
      setDirty(false)
      setStatusMessage('약관 문안을 저장했습니다.')
    } else {
      setStatusMessage('')
      setErrorMessage('약관 문안을 저장하지 못했습니다.')
    }
  }

  const changeArticle = (nextKey: string) => {
    if (dirty && !window.confirm('저장하지 않은 문안이 있습니다. 조항을 바꾸면 현재 편집 내용이 사라집니다. 계속할까요?')) return
    onActiveArticleChange(nextKey)
  }

  const close = () => {
    if (dirty && !window.confirm('저장하지 않은 문안이 있습니다. 저장하지 않고 약관으로 돌아갈까요?')) return
    onClose()
  }

  return (
    <section className="report-page__wording-policy-assistant" aria-labelledby="wording-policy-assistant-title">
      <header className="report-page__wording-policy-assistant-header">
        <div>
          <p className="report-page__eyebrow">POTENS AI · POLICY EDITOR</p>
          <h3 id="wording-policy-assistant-title">약관 편집</h3>
          <p>약관 본문을 검색하고, 실무자가 요청한 설명·작성·수정 작업을 대화로 진행합니다.</p>
        </div>
        <button className="report-page__button" type="button" onClick={close}>약관 보기</button>
      </header>

      <div className="report-page__wording-policy-assistant-context">
        <label htmlFor="wording-assistant-article">현재 확인할 조항</label>
        <select id="wording-assistant-article" value={selectedArticle?.key ?? ''} onChange={(event) => changeArticle(event.target.value)}>
          {articleOptions.map((article) => <option key={article.key} value={article.key}>{article.label}</option>)}
        </select>
        <span>선택 조항과 전체 약관 문맥이 AI 질문에 함께 전달됩니다.</span>
      </div>

      <div className="report-page__wording-policy-assistant-layout">
        <div className="report-page__wording-policy-chat" role="log" aria-live="polite" aria-label="약관 AI 대화">
          <div className="report-page__wording-policy-chat-messages">
            {messages.map((message) => (
              <article key={message.id} className={`report-page__wording-policy-chat-message report-page__wording-policy-chat-message--${message.role}`}>
                <span>{message.role === 'user' ? '실무자' : 'AI 약관 편집'}</span>
                <p>{message.text}</p>
                {message.role === 'assistant' ? (
                  <>
                    {message.isMock ? <small className="report-page__assist-fallback">SAMPLE 답변입니다. Potens API 연결 실패 시 대체 답변입니다.</small> : <small className="report-page__assist-source">Potens AI 답변 · 약관 문맥 기반</small>}
                    {message.relatedSections?.length ? <small>관련 조항 · {message.relatedSections.join(', ')}</small> : null}
                    {message.evidenceIds?.length ? <small>근거 ID · {message.evidenceIds.join(', ')}</small> : null}
                    <button className="report-page__text-button" type="button" onClick={() => applyAnswerForEditing(message.text)}>답변을 편집창에 넣기</button>
                  </>
                ) : null}
              </article>
            ))}
            {loading ? <p className="report-page__assist-loading" role="status">약관 문맥을 확인해 답변을 작성하고 있습니다.</p> : null}
          </div>
          <div className="report-page__wording-policy-chat-suggestions">
            {['이 조항의 핵심 내용을 설명해줘', '약관에서 면책·지급요건 관련 내용을 찾아줘', '이 조항을 실무 검토용 문장으로 정리해줘'].map((item) => <button key={item} className="report-page__button" type="button" onClick={() => void ask(item)} disabled={loading}>{item}</button>)}
          </div>
          <form className="report-page__wording-policy-chat-form" onSubmit={(event) => { event.preventDefault(); void ask() }}>
            <label htmlFor="wording-assistant-question">실무자 질문 또는 편집 요청</label>
            <div>
              <textarea id="wording-assistant-question" rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="예: 현재 선택한 조항의 지급요건을 더 명확한 문장으로 다시 써줘" disabled={loading} />
              <button className="report-page__button report-page__button--primary" type="submit" disabled={loading || !question.trim()}>질문 보내기</button>
            </div>
          </form>
        </div>

        <div className="report-page__wording-policy-editor-draft">
          <div className="report-page__wording-policy-editor-draft-heading">
            <div><p className="report-page__eyebrow">EDITING AREA</p><h4>현재 조항 문안</h4></div>
            <span className={dirty ? 'is-dirty' : ''}>{dirty ? '저장되지 않음' : '저장됨'}</span>
          </div>
          <p className="report-page__wording-policy-editor-draft-label">{selectedArticle?.label ?? '조항 선택'}</p>
          <textarea aria-label="현재 조항 문안 편집" value={draftText} onChange={(event) => { setDraftText(event.target.value); setDirty(true) }} />
          <button className="report-page__button report-page__button--primary" type="button" onClick={() => void save()} disabled={!dirty}>편집 내용 저장</button>
        </div>
      </div>

      {statusMessage ? <p className="report-page__copy-message" role="status">{statusMessage}</p> : null}
      {errorMessage ? <p className="report-page__assist-error" role="alert">{errorMessage}</p> : null}
      <p className="report-page__notice">약관 원문을 자동으로 확정하지 않습니다. AI 답변과 편집 문안은 실무자 확인 후 저장되는 검토용 초안입니다.</p>
    </section>
  )
}
