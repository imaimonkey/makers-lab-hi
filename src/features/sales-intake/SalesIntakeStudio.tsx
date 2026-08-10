import { type FormEvent, useState } from 'react'
import {
  appendSalesSubmission,
  readSalesSubmissions,
  type SalesChannel,
  type SalesFollowUp,
  type SalesIntakeDraft,
  type SalesIntakeSubmission,
  type SalesIntakeType,
} from '../../domain/sales/salesIntake'
import { AppIcon } from '../../shared/components/AppIcon'

const channelOptions: Array<{ value: SalesChannel; label: string }> = [
  { value: 'branch', label: '영업점·지점' },
  { value: 'corporate', label: '법인영업' },
  { value: 'partner', label: 'GA·제휴 채널' },
  { value: 'customer-touchpoint', label: '고객 접점' },
  { value: 'other', label: '기타 채널' },
]

const followUpOptions: Array<{ value: SalesFollowUp; label: string }> = [
  { value: 'candidate-review', label: '신규위험 후보 검토 요청' },
  { value: 'product-team', label: '상품개발 담당 연결 요청' },
  { value: 'source-request', label: '근거·출처 추가 확인 요청' },
  { value: 'none', label: '우선 접수만' },
]

const emptyDraft: SalesIntakeDraft = {
  type: 'field-report',
  channel: 'branch',
  subject: '',
  observedRisk: '',
  proposal: '',
  followUp: 'candidate-review',
}

const sampleDraft: SalesIntakeDraft = {
  type: 'product-proposal',
  channel: 'corporate',
  subject: '산업용 배터리 교체·재사용 과정의 책임 공백',
  observedRisk: '현장에서 ESS와 이동형 배터리의 교체·재사용 문의가 늘고 있습니다. 화재뿐 아니라 운송·설치·폐기 단계의 책임 주체와 기존 담보의 경계가 자주 질문됩니다.',
  proposal: '설비 자체 손해와 제3자 배상, 작업 중단 손해를 단계별로 나누어 확인할 수 있는 상품화 검토 프레임을 제안합니다.',
  followUp: 'candidate-review',
}
void sampleDraft

function typeLabel(type: SalesIntakeType) {
  return type === 'field-report' ? '현장 리포트' : '상품 개발 제안'
}

function channelLabel(channel: SalesChannel) {
  return channelOptions.find((option) => option.value === channel)?.label ?? channel
}

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function SalesIntakeStudio() {
  const [input, setInput] = useState<SalesIntakeDraft>(emptyDraft)
  const [submissions, setSubmissions] = useState<SalesIntakeSubmission[]>(readSalesSubmissions)
  const [submitted, setSubmitted] = useState<{ submission: SalesIntakeSubmission; persisted: boolean } | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (input.subject.trim().length < 5) {
      setError('제안 제목을 5자 이상 입력해 주세요.')
      return
    }

    if (input.observedRisk.trim().length < 20) {
      setError('현장에서 관찰한 위험이나 고객 반응을 20자 이상 적어 주세요.')
      return
    }

    if (input.proposal.trim().length < 10) {
      setError('제안 또는 추가로 확인할 내용을 10자 이상 적어 주세요.')
      return
    }

    const result = appendSalesSubmission({
      ...input,
      subject: input.subject.trim(),
      observedRisk: input.observedRisk.trim(),
      proposal: input.proposal.trim(),
    })

    setSubmissions((current) => [result.submission, ...current].slice(0, 30))
    setSubmitted(result)
    setInput(emptyDraft)
    setError('')
  }

  return (
    <div className="sales-intake-studio">
      <div className="sales-intake-grid">
        <form className="sales-intake-form surface-card" onSubmit={handleSubmit}>
          <div className="sales-card-heading">
            <div>
              <span className="section-index">01</span>
              <span>
                <h3>현장 리포트·제안 입력</h3>
                <small>개인 식별정보 없이 상품개발에 필요한 맥락만 남겨주세요.</small>
              </span>
            </div>
          </div>

          <div className="sales-form-row">
            <label className="sales-field-label" htmlFor="sales-intake-type">
              입력 유형
              <select
                id="sales-intake-type"
                value={input.type}
                onChange={(event) => setInput((current) => ({ ...current, type: event.target.value as SalesIntakeType }))}
              >
                <option value="field-report">현장 리포트</option>
                <option value="product-proposal">상품 개발 제안</option>
              </select>
            </label>
            <label className="sales-field-label" htmlFor="sales-intake-channel">
              유입 채널
              <select
                id="sales-intake-channel"
                value={input.channel}
                onChange={(event) => setInput((current) => ({ ...current, channel: event.target.value as SalesChannel }))}
              >
                {channelOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <label className="sales-field-label" htmlFor="sales-intake-subject">
            제안 제목
            <input
              id="sales-intake-subject"
              value={input.subject}
              onChange={(event) => setInput((current) => ({ ...current, subject: event.target.value }))}
              placeholder="예: 전기차 충전 중 화재 관련 고객 문의 증가"
              maxLength={120}
            />
          </label>

          <label className="sales-field-label" htmlFor="sales-intake-observed-risk">
            현장에서 관찰한 위험·고객 반응
            <small>산업·기술 변화, 반복 문의, 기존 보장으로 설명하기 어려운 지점을 적습니다.</small>
            <textarea
              id="sales-intake-observed-risk"
              value={input.observedRisk}
              onChange={(event) => setInput((current) => ({ ...current, observedRisk: event.target.value }))}
              placeholder="예: 어떤 기술이나 환경에서 어떤 손해 우려가 반복되는지 적어주세요."
              rows={5}
              maxLength={1200}
            />
          </label>

          <label className="sales-field-label" htmlFor="sales-intake-proposal">
            제안 또는 추가 확인할 내용
            <small>상품화 방향, 확인이 필요한 근거, 연결이 필요한 담당을 자유롭게 남깁니다.</small>
            <textarea
              id="sales-intake-proposal"
              value={input.proposal}
              onChange={(event) => setInput((current) => ({ ...current, proposal: event.target.value }))}
              placeholder="예: 보장 공백을 어떤 단위로 검토하면 좋을지, 확인할 자료는 무엇인지 적어주세요."
              rows={4}
              maxLength={1000}
            />
          </label>

          <label className="sales-field-label" htmlFor="sales-intake-follow-up">
            원하는 다음 단계
            <select
              id="sales-intake-follow-up"
              value={input.followUp}
              onChange={(event) => setInput((current) => ({ ...current, followUp: event.target.value as SalesFollowUp }))}
            >
              {followUpOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>

          <div className="sales-privacy-note">
            <AppIcon name="lock" size={17} />
            고객 이름·연락처·계약번호·상세 주소·상담 원문은 입력하지 마세요.
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="sales-primary-action">
            리포트 접수하기 <AppIcon name="arrow" size={18} />
          </button>

          {submitted && (
            <div className={submitted.persisted ? 'sales-submit-success' : 'sales-submit-warning'} role="status">
              <AppIcon name={submitted.persisted ? 'check' : 'bell'} size={18} />
              <p>
                <strong>{submitted.persisted ? '리포트가 접수되었습니다.' : '입력 내용을 임시로 확인했습니다.'}</strong>
                <span>
                  {submitted.persisted
                    ? `접수 ID ${submitted.submission.id.slice(0, 8)} · ${formatSubmittedAt(submitted.submission.submittedAt)}`
                    : '브라우저 저장 공간을 사용할 수 없어 새로고침 후에는 사라질 수 있습니다.'}
                </span>
              </p>
            </div>
          )}
        </form>

        <aside className="sales-intake-aside">
          <article className="sales-guidance-card surface-card">
            <button type="button" className="sales-guidance-icon" aria-label="영업부서 요청 입력 예시 채우기" onClick={() => { setInput(sampleDraft); setSubmitted(null); setError('') }}><AppIcon name="trend" size={22} /></button>
            <p className="eyebrow">HOW IT FLOWS</p>
            <h3>현장의 언어를<br /><em>검토 가능한 신호</em>로</h3>
            <ol>
              <li><span>01</span><div><strong>맥락을 남겨요</strong><p>기술·산업 변화와 반복되는 고객 질문을 요약합니다.</p></div></li>
              <li><span>02</span><div><strong>사람이 검토해요</strong><p>자동으로 상품 후보가 확정되지 않고 실무자 큐에서 확인합니다.</p></div></li>
              <li><span>03</span><div><strong>후속 경로를 정해요</strong><p>근거 수집, 위험 후보, 상품개발 논의로 이어질 수 있습니다.</p></div></li>
            </ol>
          </article>

          <section className="sales-recent-card surface-card" aria-live="polite">
            <div className="sales-recent-heading">
              <div><span className="section-index">02</span><h3>최근 접수</h3></div>
              <span>{submissions.length}건</span>
            </div>
            {submissions.length ? (
              <ul className="sales-recent-list">
                {submissions.slice(0, 4).map((submission) => (
                  <li key={submission.id}>
                    <div>
                      <span>{typeLabel(submission.type)}</span>
                      <time dateTime={submission.submittedAt}>{formatSubmittedAt(submission.submittedAt)}</time>
                    </div>
                    <strong>{submission.subject}</strong>
                    <small>{channelLabel(submission.channel)} · 검토 대기</small>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="sales-recent-empty">
                <AppIcon name="inbox" size={22} />
                <p><strong>아직 접수된 제안이 없습니다.</strong>첫 현장 제안을 남겨보세요.</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
