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
  reportEntries?: Array<{ riskData: RiskSourceData; report: ReportResult }>
  reportProxy: ReportProxy
  listIntro?: ReactNode
  navigation?: ReportNavigation
  includeLayoutMocks?: boolean
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

const getRequestedReportEntry = (
  entries: Array<{ riskData: RiskSourceData; report: ReportResult }>,
): { riskData: RiskSourceData; report: ReportResult } | undefined => {
  const requestedId = getRequestedReportId()
  if (!requestedId) return undefined
  return entries.find(({ report, riskData }) => requestedId === getReportId(report) || requestedId === report.meta.sourceRiskId || requestedId === riskData.meta.riskId)
}

function ReportPageSession({
  riskData,
  fallbackReport,
  reportEntries,
  reportProxy,
  listIntro,
  navigation,
  includeLayoutMocks = true,
}: ReportPageProps) {
  const entries = useMemo(
    () => reportEntries?.length ? reportEntries : [{ riskData, report: fallbackReport }],
    [fallbackReport, reportEntries, riskData],
  )
  const [showDetail, setShowDetail] = useState(() => Boolean(getRequestedReportEntry(entries) ?? (hasDetailQuery(fallbackReport) ? { riskData, report: fallbackReport } : undefined)))
  const [selectedEntry, setSelectedEntry] = useState(() => getRequestedReportEntry(entries) ?? entries[0])
  const reports = useMemo(
    () => reportEntries?.length
      ? entries.flatMap((entry) => createGeneratedReportList(entry.riskData, entry.report, { includeLayoutMocks: false }))
      : createGeneratedReportList(riskData, fallbackReport, { includeLayoutMocks }),
    [entries, fallbackReport, includeLayoutMocks, reportEntries, riskData],
  )

  useEffect(() => {
    const syncView = () => {
      const nextEntry = getRequestedReportEntry(entries)
      setSelectedEntry(nextEntry ?? entries[0])
      setShowDetail(Boolean(nextEntry) || hasDetailQuery(fallbackReport))
    }
    window.addEventListener('popstate', syncView)
    return () => window.removeEventListener('popstate', syncView)
  }, [entries, fallbackReport])

  useEffect(() => {
    if (!showDetail) return
    const frame = window.requestAnimationFrame(() => {
      const header = document.querySelector<HTMLElement>('.report-page__report-header')
      if (!header) return
      window.scrollTo({ top: Math.max(0, window.scrollY + header.getBoundingClientRect().top - 8), behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedEntry, showDetail])

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
    const nextEntry = entries.find((entry) => selectedReport.reportId === getReportId(entry.report) || selectedReport.riskId === entry.report.meta.sourceRiskId)
    if (nextEntry) setSelectedEntry(nextEntry)
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
          <ReportSections
            key={`${selectedEntry.report.meta.sourceRiskId}:${selectedEntry.report.meta.generatedAt ?? ''}`}
            report={selectedEntry.report}
            riskData={selectedEntry.riskData}
            reportProxy={reportProxy}
            navigation={navigation}
            onBackToList={closeReport}
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
