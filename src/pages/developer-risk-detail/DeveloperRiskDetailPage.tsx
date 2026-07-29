import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loadArticleSourceRecords } from '../../features/risk-dashboard/articleSourceData'
import {
  buildDeveloperRiskDetailData,
  loadDeveloperStep2Detail,
  type DeveloperRiskDetailData,
} from '../../features/risk-catalog/developerStep2Adapter'
import { RiskDetailPage } from '../risk-detail/RiskDetailPage'

export function DeveloperRiskDetailPage() {
  const { riskId } = useParams()
  const navigate = useNavigate()
  const articleId = riskId?.replace(/^developer-/, '') ?? ''
  const [detailData, setDetailData] = useState<DeveloperRiskDetailData>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [articles, saved] = await Promise.all([
        loadArticleSourceRecords(),
        loadDeveloperStep2Detail(articleId),
      ])
      const article = articles.find((item) => item.id === articleId)
      if (!article) throw new Error('연결된 src/article PDF를 찾을 수 없습니다.')
      if (!saved.rows.length) throw new Error('페이지 2에서 Step 2 전체 실행을 먼저 진행해 주세요.')
      setDetailData(buildDeveloperRiskDetailData(article, saved.rows))
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

  return <RiskDetailPage data={detailData} developerMode />
}
