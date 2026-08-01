import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { sampleOnlyNotice } from '../../domain/risk/sampleData'
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
  const [articleError, setArticleError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadArticleSourceRecords()
      .then((articles) => {
        if (!cancelled) setArticleEntries(createArticleDerivedReportEntries(articles))
      })
      .catch((error: unknown) => {
        if (!cancelled) setArticleError(error instanceof Error ? error.message : 'src/article 원문을 불러오지 못했습니다.')
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
      <PageHeader
        step="04"
        eyebrow="DECISION REPORTS"
        title="종합 리포트"
        description="위험 신호와 상품성 평가를 Advance·Hold·Drop 의사결정과 후속 과제로 압축합니다."
      />

      <section id="report-generation-slice" className="report-generation-slice surface-card" aria-label="리포트 생성·검토 데모">
        <ReportPage
          riskData={activeRiskData}
          fallbackReport={activeFallbackReport}
          reportEntries={reportEntries}
          reportProxy={reportProxy}
          navigation={navigate}
          listIntro={<>
            <div className="sample-notice"><span>{articleEntries.length ? 'CONTENT-DERIVED SAMPLE' : 'SAMPLE'}</span>{articleEntries.length ? 'src/article 원문 본문을 읽어 구조화한 리포트 더미입니다. 기존 전기차 화재·배터리 SAMPLE 리포트도 보존합니다. 실제 LLM·상품 승인·법률 판단 결과가 아닙니다.' : `article 원문을 불러오는 중입니다. ${articleError ? `오류: ${articleError}` : sampleOnlyNotice}`}</div>
            <div className="report-generation-slice-heading">
              <div>
                <p className="eyebrow">REPORT GENERATION / REVIEW</p>
                <h2>상품화 검토 리포트 생성</h2>
                <p>생성·검증·항목별 실무 검토·브리핑·출력 기능을 하나의 리포트 목록과 상세 화면에서 이어서 사용합니다.</p>
              </div>
              <span className="status-badge">{articleEntries.length ? `${articleEntries.length} ARTICLES + SAVED EV SAMPLE` : 'ARTICLE LOADING'}</span>
            </div>
          </>}
        />
      </section>
    </div>
  )
}
