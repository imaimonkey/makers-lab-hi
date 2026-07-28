import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  resolveSampleRiskId,
  sampleOnlyNotice,
  sampleRiskCandidates,
  sampleRiskDetails,
} from '../../domain/risk/sampleData'
import { RiskDecisionWorkspace } from '../../features/risk-detail/RiskDecisionWorkspace'
import { EvidenceVerificationWorkspace } from '../../features/risk-detail/EvidenceVerificationWorkspace'
import { ProductizationEvaluationPanel } from '../../features/risk-detail/ProductizationEvaluationPanel'
import type { RadarNewsDetail } from '../../domain/risk/riskRadarTypes'
import { getRadarArticleId } from '../../domain/risk/riskRadarMappings'
import { riskRadarApi } from '../../features/risk-dashboard/riskRadarApi'
import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'

export function RiskDetailPage() {
  const { riskId } = useParams()
  const resolvedRiskId = resolveSampleRiskId(riskId)
  const risk = sampleRiskCandidates.find((item) => item.id === resolvedRiskId)
  const detail = resolvedRiskId ? sampleRiskDetails[resolvedRiskId] : undefined
  const articleId = resolvedRiskId ? getRadarArticleId(resolvedRiskId) : undefined
  const [liveDetail, setLiveDetail] = useState<RadarNewsDetail | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState('')

  const refreshLiveDetail = useCallback(async () => {
    if (!articleId) {
      setLiveDetail(null)
      setLiveError('')
      return null
    }
    setLiveLoading(true)
    try {
      const next = await riskRadarApi.detail(articleId)
      setLiveDetail(next)
      setLiveError('')
      return next
    } catch (error) {
      setLiveDetail(null)
      setLiveError(error instanceof Error ? error.message : 'detail API unavailable')
      return null
    } finally {
      setLiveLoading(false)
    }
  }, [articleId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshLiveDetail()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshLiveDetail])

  const liveArticle = liveDetail?.article
  const liveAnalysis = liveDetail?.analysis
  const displayTitle = liveArticle?.title ?? risk?.title
  const detailSourceLabel = liveDetail ? 'LIVE API' : liveLoading ? 'LOADING' : liveError ? 'SAMPLE fallback' : articleId ? 'SAMPLE · detail pending' : 'SAMPLE · mapping pending'

  if (!risk || !detail) {
    return (
      <div className="page detail-page sh-visual">
        <PageHeader
          step="03"
          eyebrow="EVIDENCE & PRODUCT FIT"
          title="위험 후보를 찾을 수 없습니다"
          description="삭제되었거나 존재하지 않는 위험 ID입니다. 후보 목록에서 다시 선택해 주세요."
        />
        <section className="detail-missing surface-card">
          <AppIcon name="scan" size={28} />
          <div><strong>요청한 위험 ID: {riskId}</strong><p>샘플 후보 목록으로 돌아가 유효한 검토 대상을 선택할 수 있습니다.</p></div>
          <Link to="/risks" className="secondary-action">위험 후보로 돌아가기 <AppIcon name="arrow" size={17} /></Link>
        </section>
      </div>
    )
  }

  return (
    <div className="page detail-page sh-visual">
      <PageHeader
        step="03"
        eyebrow="EVIDENCE & PRODUCT FIT"
        title="평가 워크벤치"
        description="위험 정의, 직접 근거, 기존 보장과의 차이, 상품화 제약을 같은 화면에서 검토합니다."
      />
      <nav className="sh-command-bar" aria-label="위험 상세 명령 바">
        <div className="sh-command-context">
          <Link to="/risks">← 위험 후보</Link>
          <i className={risk.status === '검토 중' ? '' : 'complete'} aria-hidden="true" />
          <span>{risk.status} · 검토 중</span>
          <span aria-label={`위험 ID ${risk.id}`}>{risk.id}</span>
        </div>
        <div className="sh-command-actions">
          <a href="#article-body">근거로 이동</a>
          <button type="button" onClick={() => window.print()}>PDF 출력</button>
        </div>
      </nav>
      <div className="sample-notice"><span>{detailSourceLabel}</span>{liveDetail ? ' API detail 응답을 사용합니다.' : `${sampleOnlyNotice}${liveError ? ` API detail 실패: ${liveError}` : ''}`}</div>
      {liveDetail ? <div className="detail-live-strip" role="status"><strong>LIVE API</strong><span>본문 {liveArticle?.contentStatus ?? '상태 미제공'}</span><span>분석 {liveArticle?.analysisStatus ?? liveAnalysis?.verificationStatus ?? '상태 미제공'}</span><span>검증 {liveArticle?.verificationStatus ?? liveAnalysis?.verificationStatus ?? '상태 미제공'}</span><span>최종 응답 {liveArticle?.collectedAt ?? liveArticle?.publishedAt ?? '시각 미제공'}</span></div> : null}

      <section className="risk-hero surface-card">
        <div className="risk-hero-main">
          <div className="sh-detail-breadcrumb" aria-label="현재 위치"><Link to="/risks">위험 후보</Link><span>/</span><span>상세 검토</span><strong>{risk.id}</strong></div>
          <div className="risk-badges"><span>{risk.themeLabel}</span><em>{risk.status}</em></div>
          <h2>{displayTitle}</h2>
          <p><strong>위험 문장</strong> {detail.riskStatement}</p>
          <div className="risk-facts">
            <span><small>노출 주체</small>{detail.exposedParty}</span>
            <span><small>주요 손해</small>{detail.primaryLoss}</span>
            <span><small>결정 상태</small>{detail.decisionStatus}</span>
          </div>
        </div>
        <div className="risk-score-card">
          <span>신호 강도</span>
          <strong>{risk.signalStrength}</strong>
          <div><i style={{ width: `${risk.signalStrength}%` }} /></div>
          <div className="sh-score-meta">
            <span>SAMPLE 범위</span><strong>{risk.updatedAt ? '최근 수집 신호' : '확인 대기'}</strong>
            <span>신뢰도</span><strong>{detailSourceLabel === 'LIVE API' ? 'API 응답' : '확인 대기'}</strong>
          </div>
          <p>상품성 {risk.productFit ?? '미평가'} · 근거 {risk.evidenceCount}건</p>
        </div>
      </section>

      <section className="detail-grid">
        <article className="assessment-panel surface-card">
          <div className="panel-heading"><div><p className="eyebrow">ASSESSMENT</p><h2>상품화 평가</h2></div><span className="updated-label">SAMPLE · 사람 검토 필요</span></div>
          <div className="assessment-list">
            {detail.assessments.map((item) => (
              <div className="assessment-row" key={item.label}>
                <div><strong>{item.label}</strong><small>근거 신뢰도 {item.confidence}</small></div>
                <div className="assessment-bar"><span><i style={{ width: `${item.score}%` }} /></span><strong>{item.score}</strong></div>
                <p>{item.note}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="decision-panel surface-card">
          <p className="eyebrow">DECISION GATE</p>
          <span className="decision-badge" data-tone={detail.decisionTone}>{detail.decisionBadge}</span>
          <h2>{detail.decisionTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
          <ul>
            {detail.decisionChecks.map((check) => <li key={check}><AppIcon name="check" size={16} /> {check}</li>)}
          </ul>
          <Link to="/reports" className="secondary-action">리포트 프레임 보기 <AppIcon name="arrow" size={17} /></Link>
        </aside>
      </section>

      <RiskDecisionWorkspace key={`review-${risk.id}`} risk={risk} detail={detail} />
      <EvidenceVerificationWorkspace key={`evidence-${risk.id}`} risk={risk} detail={detail} liveDetail={liveDetail} onDetailRefresh={refreshLiveDetail} />
      <ProductizationEvaluationPanel key={`evaluation-${risk.id}`} risk={risk} detail={detail} />
    </div>
  )
}
