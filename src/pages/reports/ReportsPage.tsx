import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReportPage } from '../../report/ReportPage'
import type { ReportProxy } from '../../report/api/report-proxy'
import { createArticleDerivedReportEntries, type ArticleDerivedReportEntry } from '../../report/data/article-derived-report-adapter'
import { loadArticleSourceRecords } from '../../features/risk-dashboard/articleSourceData'
import '../../report/report.css'

const localReportProxy: ReportProxy = {
  generateReport: async () => ({ status: 'local-only' }),
  generatePolicyDraft: async () => ({ status: 'local-only' }),
  askReportQuestion: async () => ({ status: 'local-only' }),
}

export function ReportsPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<ArticleDerivedReportEntry[] | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadArticleSourceRecords().then((articles) => { if (!cancelled) setEntries(createArticleDerivedReportEntries(articles)) }).catch((error) => { console.error(error); if (!cancelled) setEntries([]) })
    return () => { cancelled = true }
  }, [])

  if (!entries) return <div className="page reports-page jh-visual"><div className="report-page__list-intro">문서 원문을 기준으로 종합 리포트를 구성하고 있습니다.</div></div>
  if (!entries.length) return <div className="page reports-page jh-visual"><div className="report-page__list-intro">연결된 문서가 없어 종합 리포트를 구성할 수 없습니다.</div></div>
  const first = entries[0]

  return (
    <div className="page reports-page jh-visual">
      <ReportPage
        riskData={first.riskData}
        fallbackReport={first.report}
        reportEntries={entries}
        reportProxy={localReportProxy}
        navigation={navigate}
      />
    </div>
  )
}
