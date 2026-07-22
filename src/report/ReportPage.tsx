import { useEffect, useMemo, useState } from 'react'
import type { ReportResult, RiskSourceData } from './types'
import type { ReportProxy } from './api/report-proxy'
import { browserReviewerStorage, type ReviewerStorage } from './services/reviewer-storage'
import { GeneratedReportList } from './components/GeneratedReportList'
import { ReportSections } from './components/ReportSections'
import { createGeneratedReportList, type GeneratedReportListItem } from './services/report-list'
import './report.css'

export type ReportPageProps = {
  riskData: RiskSourceData
  fallbackReport: ReportResult
  reportProxy: ReportProxy
  reviewerStorage?: ReviewerStorage
  now?: () => Date
}

const systemNow = () => new Date()

const getRequestedReportId = (): string | null => {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('reportId')
}

const getReportId = (report: ReportResult): string =>
  report.meta.reportId || report.meta.sourceRiskId

const hasDetailQuery = (report: ReportResult): boolean => {
  const requestedId = getRequestedReportId()
  return requestedId === getReportId(report) || requestedId === report.meta.sourceRiskId
}

function ReportPageSession({
  riskData,
  fallbackReport,
  reportProxy,
  reviewerStorage = browserReviewerStorage,
  now = systemNow,
}: ReportPageProps) {
  const [showDetail, setShowDetail] = useState(() => hasDetailQuery(fallbackReport))
  const reports = useMemo(
    () => createGeneratedReportList(riskData, fallbackReport),
    [fallbackReport, riskData],
  )

  useEffect(() => {
    const syncView = () => setShowDetail(hasDetailQuery(fallbackReport))
    window.addEventListener('popstate', syncView)
    return () => window.removeEventListener('popstate', syncView)
  }, [fallbackReport])

  const openReport = (selectedReport: GeneratedReportListItem) => {
    const url = new URL(window.location.href)
    url.searchParams.set('reportId', selectedReport.reportId)
    window.history.pushState({ reportId: selectedReport.reportId }, '', url)
    setShowDetail(true)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeReport = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('reportId')
    window.history.pushState({}, '', url)
    setShowDetail(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return (
    <div className="report-page">
      {!showDetail ? <GeneratedReportList reports={reports} onOpenReport={openReport} /> : (
        <div className="report-page__generated">
          <div className="report-page__detail-toolbar report-page__no-print">
            <button className="report-page__button" type="button" onClick={closeReport}>
              ← 생성된 리포트 목록
            </button>
          </div>
          <ReportSections
            key={`${fallbackReport.meta.sourceRiskId}:${fallbackReport.meta.generatedAt ?? ''}`}
            report={fallbackReport}
            reviewerStorage={reviewerStorage}
            now={now}
            riskData={riskData}
            reportProxy={reportProxy}
          />
        </div>
      )}
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
