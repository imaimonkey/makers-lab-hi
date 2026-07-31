import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loadArticleSourceRecords } from '../../features/risk-dashboard/articleSourceData'
import {
  buildDeveloperRiskDetailData,
  applyStep3ResultsToDeveloperRiskDetailData,
  loadDeveloperStep2Detail,
  type DeveloperRiskDetailData,
} from '../../features/risk-catalog/developerStep2Adapter'
import { readStep3AnalysisResults, type SavedStep3AnalysisRow } from '../../features/llm-util/util-3'
import { RiskDetailPage } from '../risk-detail/RiskDetailPage'
import { DeveloperStep3AnalysisPanel } from '../../features/risk-detail/DeveloperStep3AnalysisPanel'

export function DeveloperRiskDetailPage() {
  const { riskId } = useParams()
  const navigate = useNavigate()
  const articleId = riskId?.replace(/^developer-/, '') ?? ''
  const [detailData, setDetailData] = useState<DeveloperRiskDetailData>()
  const [step3Rows, setStep3Rows] = useState<SavedStep3AnalysisRow[]>([])
  const [articleRecord, setArticleRecord] = useState<{ id: string; title: string; source: string; collectedAt: string; text: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [articles, saved, step3] = await Promise.all([
        loadArticleSourceRecords(),
        loadDeveloperStep2Detail(articleId),
        readStep3AnalysisResults(),
      ])
      const article = articles.find((item) => item.id === articleId)
      if (!article) throw new Error('연결된 src/article PDF를 찾을 수 없습니다.')
      if (!saved.rows.length) throw new Error('페이지 2에서 Step 2 전체 실행을 먼저 진행해 주세요.')
      setArticleRecord({ id: article.id, title: article.title, source: article.source ?? 'src/article', collectedAt: article.collectedAt ?? new Date().toISOString(), text: article.text })
      const actualStep3Rows = step3.filter((row) => row.riskId === `developer-${articleId}` && row.articleId === articleId && row.mode !== 'mock')
      setStep3Rows(actualStep3Rows)
      setDetailData(applyStep3ResultsToDeveloperRiskDetailData(buildDeveloperRiskDetailData(article, saved.rows), actualStep3Rows))
    } catch (reason) {
      setDetailData(undefined)
      setError(reason instanceof Error ? reason.message : '개발자 상세 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [articleId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  if (loading) {
    return <div className="page detail-page sh-visual"><p>실제 아티클과 Step 2 결과를 불러오는 중입니다.</p></div>
  }

  if (!detailData || error) {
    return (
      <div className="page detail-page sh-visual">
        <p>{error || '개발자 상세 데이터를 찾을 수 없습니다.'}</p>
        <button type="button" className="secondary-action" onClick={() => navigate('/developer-test/risks')}>
          페이지 2로 돌아가기
        </button>
      </div>
    )
  }

  return <><RiskDetailPage data={detailData} developerMode step3Results={step3Rows} /><div className="page developer-risk-detail-step3"><DeveloperStep3AnalysisPanel input={{ riskId: 'developer-' + detailData.articleId, articleId: detailData.articleId, article: articleRecord ?? detailData.detail, risk: detailData.risk, detail: detailData.detail }} /></div></>
}
