import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReportResult, ReportValidationWarning, RiskSourceData } from './types'
import type { ReportProxy } from './api/report-proxy'
import { browserReviewerStorage, type ReviewerStorage } from './services/reviewer-storage'
import { GeneratedReportList } from './components/GeneratedReportList'
import { ReportIdleState, ReportLoadingState } from './components/ReportStates'
import { ReportSections } from './components/ReportSections'
import { generateReport, getLoadingSteps } from './services/report-generation'
import { createGeneratedReportList, type GeneratedReportListItem } from './services/report-list'
import './report.css'

export type ReportPageProps = {
  riskData: RiskSourceData
  fallbackReport: ReportResult
  reportProxy: ReportProxy
  reviewerStorage?: ReviewerStorage
  now?: () => Date
}

type ReportView = 'list' | 'idle' | 'loading' | 'detail'

const systemNow = () => new Date()

const getRequestedReportId = (): string | null => {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('reportId')
}

const getReportId = (report: ReportResult): string => report.meta.reportId || report.meta.sourceRiskId

const hasDetailQuery = (report: ReportResult): boolean => {
  const requestedId = getRequestedReportId()
  return requestedId === getReportId(report) || requestedId === report.meta.sourceRiskId
}

function ReportPageSession({ riskData, fallbackReport, reportProxy, reviewerStorage = browserReviewerStorage, now = systemNow }: ReportPageProps) {
  const [view, setView] = useState<ReportView>(() => hasDetailQuery(fallbackReport) ? 'detail' : 'list')
  const [report, setReport] = useState<ReportResult>(fallbackReport)
  const [fallbackMode, setFallbackMode] = useState(false)
  const [warnings, setWarnings] = useState<ReportValidationWarning[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const requestController = useRef<AbortController | null>(null)
  const loadingSteps = useMemo(() => getLoadingSteps(riskData), [riskData])
  const reports = useMemo(() => createGeneratedReportList(riskData, report), [report, riskData])

  useEffect(() => () => requestController.current?.abort(), [])

  useEffect(() => {
    const syncView = () => setView(hasDetailQuery(report) ? 'detail' : 'list')
    window.addEventListener('popstate', syncView)
    return () => window.removeEventListener('popstate', syncView)
  }, [report])

  const updateQuery = useCallback((reportId?: string) => {
    const url = new URL(window.location.href)
    if (reportId) url.searchParams.set('reportId', reportId)
    else url.searchParams.delete('reportId')
    window.history.pushState(reportId ? { reportId } : {}, '', url)
  }, [])

  const openReport = (selectedReport: GeneratedReportListItem) => {
    updateQuery(selectedReport.reportId)
    setReport(fallbackReport)
    setFallbackMode(false)
    setWarnings([])
    setErrorMessage('')
    setView('detail')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const requestCreate = () => {
    updateQuery()
    setView('idle')
    setFallbackMode(false)
    setWarnings([])
    setErrorMessage('')
  }

  const closeReport = () => {
    requestController.current?.abort()
    updateQuery()
    setView('list')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const handleGenerate = useCallback(async () => {
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller
    setView('loading')
    setActiveStep(0)
    setWarnings([])
    setErrorMessage('')

    const stepTimer = window.setInterval(() => setActiveStep((current) => Math.min(current + 1, Math.max(loadingSteps.length - 1, 0))), 550)
    try {
      const outcome = await generateReport({ riskData, fallbackReport, reportProxy, signal: controller.signal, now })
      if (controller.signal.aborted) return
      setReport(outcome.report)
      setFallbackMode(outcome.mode === 'fallback')
      setWarnings(outcome.warnings)
      setErrorMessage(outcome.error?.message ?? '')
      updateQuery(getReportId(outcome.report))
      setView('detail')
    } catch {
      if (controller.signal.aborted) return
      setReport(fallbackReport)
      setFallbackMode(true)
      setErrorMessage('AI 리포트 생성 요청을 처리하지 못해 SAMPLE 결과를 표시합니다.')
      setView('detail')
    } finally {
      window.clearInterval(stepTimer)
      if (requestController.current === controller) requestController.current = null
    }
  }, [fallbackReport, loadingSteps.length, now, reportProxy, riskData, updateQuery])

  return (
    <div className="report-page">
      {view === 'list' ? <GeneratedReportList reports={reports} onOpenReport={openReport} onRequestCreate={requestCreate} /> : null}
      {view === 'idle' ? <><div className="report-page__detail-toolbar report-page__no-print"><button className="report-page__button" type="button" onClick={closeReport}>← 생성된 리포트 목록</button></div><ReportIdleState riskData={riskData} onGenerate={() => void handleGenerate()} /></> : null}
      {view === 'loading' ? <ReportLoadingState steps={loadingSteps} activeStep={activeStep} /> : null}
      {view === 'detail' ? <div className="report-page__generated">
        <div className="report-page__detail-toolbar report-page__no-print"><button className="report-page__button" type="button" onClick={closeReport}>← 생성된 리포트 목록</button><button className="report-page__button" type="button" onClick={requestCreate}>새 리포트 생성</button></div>
        {fallbackMode ? <div className="report-page__fallback-banner" role="status"><div><span className="report-page__badge report-page__badge--warning">SAMPLE fallback 데이터</span><strong>AI 연결이 원활하지 않아 검토용 샘플 분석 결과를 표시합니다.</strong>{errorMessage ? <p>{errorMessage}</p> : null}</div><button className="report-page__button report-page__no-print" type="button" onClick={() => void handleGenerate()}>다시 시도</button></div> : null}
        {warnings.length ? <details className="report-page__warning-panel"><summary>AI 응답 형식을 {warnings.length}건 정규화했습니다.</summary><ul>{warnings.map((warning, index) => <li key={`${warning.code}-${warning.path}-${index}`}>{warning.message}</li>)}</ul></details> : null}
        <ReportSections key={`${report.meta.sourceRiskId}:${report.meta.generatedAt ?? ''}:${fallbackMode}`} report={report} reviewerStorage={reviewerStorage} now={now} riskData={riskData} reportProxy={reportProxy} />
      </div> : null}
    </div>
  )
}

export function ReportPage(props: ReportPageProps) {
  return <ReportPageSession key={props.riskData.meta.riskId} {...props} />
}
