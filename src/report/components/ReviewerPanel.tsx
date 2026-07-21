import { useEffect, useState } from 'react'
import type { ReviewerState } from '../types'
import { COMMON_REQUIRED_CHECKLIST, type ReviewerStorage } from '../services/reviewer-storage'

export type AiReviewRecommendation = {
  id: string
  criterion: string
  check: string
  evidenceIds: string[]
}

type ReviewerPanelProps = {
  reviewer?: ReviewerState
  reportId: string
  storage: ReviewerStorage
  now: () => Date
  aiRecommendations: AiReviewRecommendation[]
  onAskQuestion: () => void
  memoAppend?: { id: number; text: string } | null
}

function createInitialReviewer(
  reviewer: ReviewerState | undefined,
  reportId: string,
): ReviewerState {
  const fallbackKey = `riskonReportReviewer_${reportId}`
  return {
    status: reviewer?.status ?? '미검토',
    statusOptions: reviewer?.statusOptions ?? [
      '미검토',
      '검토 중',
      '추가 조사 필요',
      '1차 검토 완료',
      '보류',
      '제외',
    ],
    checklist: (reviewer?.checklist?.length ? reviewer.checklist : COMMON_REQUIRED_CHECKLIST).map((item) => ({ ...item })),
    memo: reviewer?.memo ?? '',
    savedAt: reviewer?.savedAt ?? null,
    localStorageKey: reviewer?.localStorageKey ?? fallbackKey,
  }
}

function formatSavedAt(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function ReviewerPanel({
  reviewer,
  reportId,
  storage,
  now,
  aiRecommendations,
  onAskQuestion,
  memoAppend,
}: ReviewerPanelProps) {
  const initial = createInitialReviewer(reviewer, reportId)
  const [draft, setDraft] = useState<ReviewerState>(() => {
    return storage.load(initial.localStorageKey) ?? initial
  })
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (!memoAppend?.text) return
    // This effect consumes a newly generated assistant answer and intentionally
    // appends it to the human-review draft state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((current) => ({
      ...current,
      memo: current.memo ? `${current.memo}\n\n${memoAppend.text}` : memoAppend.text,
    }))
    setSaveMessage('AI 답변을 실무자 메모에 추가했습니다. 저장하면 이 브라우저에 보관됩니다.')
  }, [memoAppend?.id, memoAppend?.text])

  const save = () => {
    const saved: ReviewerState = {
      ...draft,
      savedAt: now().toISOString(),
    }
    storage.save(saved.localStorageKey, saved)
    setDraft(saved)
    setSaveMessage('검토 내용이 이 브라우저에 저장되었습니다.')
  }

  return (
    <section
      className="report-page__section report-page__reviewer"
      aria-labelledby="report-reviewer-title"
    >
      <div className="report-page__section-heading">
        <div>
          <p className="report-page__section-number">09</p>
          <p className="report-page__eyebrow">HUMAN REVIEW</p>
          <h2 id="report-reviewer-title">실무자 검토</h2>
        </div>
        <span className="report-page__badge report-page__badge--neutral">
          AI 결과와 별도 저장
        </span>
      </div>

      <div className="report-page__reviewer-grid">
        <div className="report-page__reviewer-status">
          <label className="report-page__field-label" htmlFor="reviewer-status">
            실무 검토 상태
          </label>
          <select
            id="reviewer-status"
            value={draft.status}
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                status: event.target.value,
              }))
              setSaveMessage('')
            }}
          >
            {draft.statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <fieldset className="report-page__checklist">
            <legend>공통 필수 체크리스트</legend>
            {draft.checklist.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setDraft((current) => ({
                      ...current,
                      checklist: current.checklist.map((candidate) =>
                        candidate.id === item.id
                          ? { ...candidate, checked }
                          : candidate,
                      ),
                    }))
                    setSaveMessage('')
                  }}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="report-page__ai-review-recommendations">
            <h3>AI가 제안한 이번 리포트 확인사항</h3>
            <p>조건부·보완 필요 평가항목에서 자동으로 생성되며, 실무자 체크 상태와 별도로 관리합니다.</p>
            {aiRecommendations.length ? (
              <ul>
                {aiRecommendations.map((item) => (
                  <li key={item.id}>
                    <strong>{item.criterion}</strong>
                    <span>{item.check}</span>
                    {item.evidenceIds.length ? <small>근거 ID · {item.evidenceIds.join(', ')}</small> : null}
                  </li>
                ))}
              </ul>
            ) : <span className="report-page__muted">이번 리포트에서 자동 생성된 확인사항이 없습니다.</span>}
          </div>
        </div>

        <div className="report-page__reviewer-memo">
          <label className="report-page__field-label" htmlFor="reviewer-memo">
            실무자 메모
          </label>
          <textarea
            id="reviewer-memo"
            rows={12}
            value={draft.memo}
            placeholder="추가 검토 내용과 다음 행동을 기록하세요."
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                memo: event.target.value,
              }))
              setSaveMessage('')
            }}
          />
          <div className="report-page__reviewer-actions">
            <span className="report-page__saved-at">
              {draft.savedAt
                ? `마지막 저장 ${formatSavedAt(draft.savedAt)}`
                : '아직 저장되지 않았습니다.'}
            </span>
            <button
              className="report-page__button report-page__button--primary"
              type="button"
              onClick={save}
            >
              검토 내용 저장
            </button>
          </div>
          <button className="report-page__button report-page__no-print" type="button" onClick={onAskQuestion}>
            이 리포트에 AI 질문
          </button>
          {saveMessage ? (
            <p className="report-page__save-message" role="status">
              {saveMessage}
            </p>
          ) : null}
        </div>
      </div>

      <div className="report-page__reviewer-print" aria-hidden="true">
        <dl>
          <div>
            <dt>실무 검토 상태</dt>
            <dd>{draft.status}</dd>
          </div>
          <div>
            <dt>마지막 저장</dt>
            <dd>{formatSavedAt(draft.savedAt) ?? '미저장'}</dd>
          </div>
        </dl>
        <div>
          <strong>완료한 체크리스트</strong>
          <p>
            {draft.checklist.filter((item) => item.checked).map((item) => item.label).join(', ') ||
              '없음'}
          </p>
        </div>
        <div>
          <strong>실무자 메모</strong>
          <p>{draft.memo || '기록된 메모 없음'}</p>
        </div>
      </div>
    </section>
  )
}
