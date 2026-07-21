import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ReportGenerationState,
  ReportResult,
  ReportValidationWarning,
  RiskSourceData,
} from './types'
import type { ReportProxy } from './api/report-proxy'
import {
  generateMockReport,
  getLoadingSteps,
} from './services/report-generation'
import {
  browserReviewerStorage,
  type ReviewerStorage,
} from './services/reviewer-storage'
import { ReportIdleState, ReportLoadingState } from './components/ReportStates'
import { ReportSections } from './components/ReportSections'
import './report.css'

export type ReportPageProps = {
  riskData: RiskSourceData
  fallbackReport: ReportResult
  reportProxy: ReportProxy
  reviewerStorage?: ReviewerStorage
  now?: () => Date
}

const systemNow = () => new Date()

function ReportPageSession({
  riskData,
  fallbackReport,
  reportProxy,
  reviewerStorage = browserReviewerStorage,
  now = systemNow,
}: ReportPageProps) {
  const [state, setState] = useState<ReportGenerationState>('idle')
  const [report, setReport] = useState<ReportResult | null>(null)
  const [warnings, setWarnings] = useState<ReportValidationWarning[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const requestController = useRef<AbortController | null>(null)
  const loadingSteps = useMemo(() => getLoadingSteps(riskData), [riskData])

  useEffect(() => {
    return () => requestController.current?.abort()
  }, [])

  const handleGenerate = useCallback(async () => {
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller

    setState('loading')
    setActiveStep(0)
    setWarnings([])
    setErrorMessage('')

    const stepTimer = window.setInterval(() => {
      setActiveStep((current) =>
        Math.min(current + 1, Math.max(loadingSteps.length - 1, 0)),
      )
    }, 550)

    try {
      // The main report remains a local mock result even when assist features use API mode.
      const outcome = await generateMockReport({
        riskData,
        fallbackReport,
        now,
      })

      if (controller.signal.aborted) return
      setReport(outcome.report)
      setWarnings(outcome.warnings)
      setErrorMessage(outcome.error?.message ?? '')
      setState(outcome.mode)
    } catch {
      if (controller.signal.aborted) return
      setReport(fallbackReport)
      setWarnings([])
      setErrorMessage('AI 리포트 생성 요청을 처리하지 못했습니다.')
      setState('fallback')
    } finally {
      window.clearInterval(stepTimer)
      if (requestController.current === controller) {
        requestController.current = null
      }
    }
  }, [fallbackReport, loadingSteps, now, riskData])

  return (
    <div className="report-page">
      {state === 'idle' ? (
        <ReportIdleState riskData={riskData} onGenerate={handleGenerate} />
      ) : null}

      {state === 'loading' ? (
        <ReportLoadingState steps={loadingSteps} activeStep={activeStep} />
      ) : null}

      {(state === 'success' || state === 'fallback') && report ? (
        <div className="report-page__generated">
          {state === 'fallback' ? (
            <div className="report-page__fallback-banner" role="status">
              <div>
                <span className="report-page__badge report-page__badge--warning">
                  시연용 fallback 데이터
                </span>
                <strong>
                  AI 연결이 원활하지 않아 시연용 분석 결과를 표시합니다.
                </strong>
                {errorMessage ? <p>{errorMessage}</p> : null}
              </div>
              <button
                className="report-page__button report-page__no-print"
                type="button"
                onClick={handleGenerate}
              >
                다시 시도
              </button>
            </div>
          ) : null}

          {warnings.length ? (
            <details className="report-page__warning-panel">
              <summary>AI 응답 형식을 {warnings.length}건 정규화했습니다.</summary>
              <ul>
                {warnings.map((warning, index) => (
                  <li key={`${warning.code}-${warning.path}-${index}`}>
                    {warning.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <ReportSections
            key={`${report.meta.sourceRiskId}:${report.meta.generatedAt ?? ''}:${state}`}
            report={report}
            reviewerStorage={reviewerStorage}
            now={now}
            riskData={riskData}
            reportProxy={reportProxy}
          />
        </div>
      ) : null}
    </div>
  )
}

export function ReportPage(props: ReportPageProps) {
  return (
    <ReportPageSession
      key={props.riskData.meta.riskId}
      {...props}
    />
  )
}

