import { useState } from 'react'
import type { RiskSourceData } from '../types'

type RiskPreview = {
  urgencyLabel?: string
  oneLineReason?: string
  expectedDamageTypes?: string[]
  unresolvedQuestions?: string[]
}

export function ReportIdleState({
  riskData,
  onGenerate,
}: {
  riskData: RiskSourceData
  onGenerate: () => void
}) {
  const preview = riskData.selectionPreview as unknown as RiskPreview
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGenerate = () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    onGenerate()
  }

  return (
    <section className="report-page__start" aria-labelledby="report-start-title">
      <div className="report-page__start-copy">
        <p className="report-page__eyebrow">NEW RISK REPORT</p>
        <h1 id="report-start-title">신규 위험 상품화 검토 리포트</h1>
        <p className="report-page__lead">
          검토할 신규 위험을 선택하면 AI가 상품화 가능성과 약관화 가능성을
          분석합니다.
        </p>
      </div>

      <div className="report-page__start-panel">
        <label className="report-page__field-label" htmlFor="report-risk-select">
          검토 위험
        </label>
        <select id="report-risk-select" value={riskData.meta.riskId} disabled>
          <option value={riskData.meta.riskId}>{riskData.risk.title}</option>
        </select>

        <div className="report-page__risk-preview">
          <div className="report-page__preview-heading">
            <span className="report-page__badge report-page__badge--warning">
              {preview?.urgencyLabel ?? '검토 후보'}
            </span>
            <code>{riskData.meta.riskId}</code>
          </div>
          <h2>{riskData.risk.shortTitle ?? riskData.risk.title}</h2>
          <p>{preview?.oneLineReason ?? riskData.risk.formalDefinition}</p>

          {preview?.expectedDamageTypes?.length ? (
            <div>
              <h3>예상 피해</h3>
              <ul className="report-page__compact-list">
                {preview.expectedDamageTypes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <button
          className={`report-page__button report-page__button--primary report-page__button--wide${
            isSubmitting ? ' is-loading' : ''
          }`}
          type="button"
          onClick={handleGenerate}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          <span className="report-page__button-label">
            {isSubmitting ? 'AI 리포트 생성 중' : 'AI 리포트 생성'}
          </span>
          <span className="report-page__button-icon" aria-hidden="true">
            →
          </span>
        </button>
        <p className="report-page__helper">
          AI 생성 결과는 검토용 초안이며 실제 보험료·요율이나 최종 약관을
          확정하지 않습니다.
        </p>
      </div>
    </section>
  )
}

export function ReportLoadingState({
  steps,
  activeStep,
}: {
  steps: string[]
  activeStep: number
}) {
  const progress = Math.min(
    100,
    ((activeStep + 1) / Math.max(steps.length, 1)) * 100,
  )

  return (
    <section
      className="report-page__loading"
      aria-labelledby="report-loading-title"
      aria-live="polite"
    >
      <div className="report-page__loading-orbit" aria-hidden="true">
        <span />
        <strong>AI</strong>
      </div>
      <p className="report-page__eyebrow">ANALYSIS IN PROGRESS</p>
      <h1 id="report-loading-title">AI가 위험을 분석하고 있습니다</h1>
      <p className="report-page__loading-current">
        {steps[activeStep] ?? '검토용 리포트를 준비하고 있습니다.'}
      </p>

      <div
        className="report-page__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <ol className="report-page__loading-steps">
        {steps.map((step, index) => (
          <li
            key={step}
            className={
              index < activeStep
                ? 'is-done'
                : index === activeStep
                  ? 'is-active'
                  : ''
            }
          >
            <span>{index < activeStep ? '✓' : index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  )
}

