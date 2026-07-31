import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ReportResult, RiskSourceData } from './types'
import type { ReportProxy } from './api/report-proxy'
import { GeneratedReportList } from './components/GeneratedReportList'
import { ReportSections } from './components/ReportSections'
import { createGeneratedReportList, type GeneratedReportListItem } from './services/report-list'
import { pushPreservingHistoryState, type ReportNavigation } from './services/browser-history'
import './report.css'

export type ReportPageProps = {
  riskData: RiskSourceData
  fallbackReport: ReportResult
  reportProxy: ReportProxy
  listIntro?: ReactNode
  navigation?: ReportNavigation
}

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
  listIntro,
  navigation,
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
    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    if (navigation) {
      navigation(nextUrl)
    } else {
      pushPreservingHistoryState(url, { reportId: selectedReport.reportId })
    }
    setShowDetail(true)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeReport = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('reportId')
    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    if (navigation) {
      navigation(nextUrl)
    } else {
      pushPreservingHistoryState(url)
    }
    setShowDetail(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return (
    <div className="report-page">
      {!showDetail ? <>
        {listIntro ? <div className="report-page__list-intro">{listIntro}</div> : null}
        <GeneratedReportList reports={reports} onOpenReport={openReport} />
      </> : (
        <div className="report-page__generated">
          <div className="report-page__detail-toolbar report-page__no-print">
            <button className="report-page__button" type="button" onClick={closeReport}>
              ← 생성된 리포트 목록
            </button>
          </div>
          <ReportSections
            key={`${fallbackReport.meta.sourceRiskId}:${fallbackReport.meta.generatedAt ?? ''}`}
            report={fallbackReport}
            riskData={riskData}
            reportProxy={reportProxy}
            navigation={navigation}
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
