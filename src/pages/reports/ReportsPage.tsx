import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReportPage } from '../../report/ReportPage'
import { getMockReportData } from '../../report/data/mock-data-adapter'
import { createArticleDerivedReportEntries, type ArticleDerivedReportEntry } from '../../report/data/article-derived-report-adapter'
import { createResilientReportProxy } from '../../report/api/resilient-report-proxy'
import { loadArticleSourceRecords } from '../../features/risk-dashboard/articleSourceData'
import '../../report/report.css'

const { riskData, fallbackReport } = getMockReportData()

const reportProxy = createResilientReportProxy('/api/report-assistant')

export function ReportsPage() {
  const navigate = useNavigate()
  const [articleEntries, setArticleEntries] = useState<ArticleDerivedReportEntry[]>([])

  useEffect(() => {
    let cancelled = false
    void loadArticleSourceRecords()
      .then((articles) => {
        if (!cancelled) setArticleEntries(createArticleDerivedReportEntries(articles))
      })
      .catch(() => {
        // The saved report list remains available when the optional article source is unavailable.
      })
    return () => { cancelled = true }
  }, [])

  const primaryEntry = articleEntries[0]
  const activeRiskData = primaryEntry?.riskData ?? riskData
  const activeFallbackReport = primaryEntry?.report ?? fallbackReport
  const reportEntries = articleEntries.length
    ? [...articleEntries, { riskData, report: fallbackReport }]
    : undefined

  return (
    <div className="page reports-page jh-visual">
      <ReportPage
        riskData={activeRiskData}
        fallbackReport={activeFallbackReport}
        reportEntries={reportEntries}
        reportProxy={reportProxy}
        navigation={navigate}
      />
    </div>
  )
}
