import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  resolveSampleRiskId,
  sampleOnlyNotice,
  sampleRiskCandidates,
  sampleRiskDetails,
} from '../../domain/risk/sampleData'
import { RiskDecisionWorkspace } from '../../features/risk-detail/RiskDecisionWorkspace'
import type { RadarNewsDetail } from '../../domain/risk/riskRadarTypes'
import { getRadarArticleId } from '../../domain/risk/riskRadarMappings'
import { riskRadarApi } from '../../features/risk-dashboard/riskRadarApi'
import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'

const assessmentEvidenceTags: Record<string, string[]> = {
  '신규성': ['assessment:demand', 'risk:'],
  '증가성': ['assessment:demand'],
  '피해 심각성': ['risk:', 'assessment:fortuity', 'assessment:accumulation'],
  '확산 가능성': ['risk:', 'assessment:accumulation'],
  '보험 사각지대 가능성': ['decision:gap-review', 'assessment:legal-review'],
  '근거 신뢰도': ['assessment:data-confidence'],
}

function getAssessmentEvidenceCount(label: string, riskId: string, evidence: Array<{ supports: string[] }>): number {
  const tags = assessmentEvidenceTags[label] ?? []
  return evidence.filter((item) => item.supports.some((support) => tags.some((tag) => tag === 'risk:' ? support === `risk:${riskId}` : support === tag))).length
}

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

  const printRiskDetail = useCallback(() => {
    document.body.classList.add('risk-detail-printing')
    window.setTimeout(() => window.print(), 0)
  }, [])

  useEffect(() => {
    const clearPrintState = () => document.body.classList.remove('risk-detail-printing')
    window.addEventListener('afterprint', clearPrintState)
    return () => window.removeEventListener('afterprint', clearPrintState)
  }, [])

  if (!risk || !detail) {
    return (
      <div className="page detail-page sh-visual">
        <PageHeader
          step="03"
          eyebrow="RISK ASSESSMENT / CANDIDATE DETAIL"
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
        eyebrow="RISK ASSESSMENT / CANDIDATE DETAIL"
        title="위험상세"
        description="위험 후보를 선택하면 신규성부터 근거 신뢰도까지 6개 척도와 산출 논리를 한 화면에서 확인합니다."
      />
      <nav className="sh-command-bar" aria-label="위험상세 명령 바">
        <div className="sh-command-context">
          <Link to="/risks">← 위험 후보</Link>
          <i className={risk.status === '검토 중' ? '' : 'complete'} aria-hidden="true" />
          <span>{risk.status} · 위험상세</span>
          <span aria-label={`위험 ID ${risk.id}`}>{risk.id}</span>
        </div>
        <div className="sh-command-actions">
          <a href="#assessment-signal">평가 근거로 이동</a>
          <button type="button" onClick={printRiskDetail}>PDF 출력</button>
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
          <span>우선 검토 지수</span>
          <strong>{risk.signalStrength}</strong>
          <div><i style={{ width: `${risk.signalStrength}%` }} /></div>
          <div className="sh-score-meta">
            <span>점수 범위</span><strong>0–100</strong>
            <span>신뢰도</span><strong>{detailSourceLabel === 'LIVE API' ? 'API 응답' : '확인 대기'}</strong>
          </div>
          <p>우선 검토 순서를 정하는 비교용 SAMPLE 지수</p>
          <details className="hero-score-logic">
            <summary>산출 근거</summary>
            <div className="logic-step-list">
              <p><b>01</b><span>입력값</span><code>후보 수요 신호 = {risk.signalStrength}%</code></p>
              <p><b>02</b><span>정규화</span><code>{risk.signalStrength}% → {risk.signalStrength}점 / 100</code></p>
              <p><b>03</b><span>판정</span><code>{risk.signalStrength >= 80 ? '80 이상 → CRITICAL' : risk.signalStrength >= 65 ? '65–79 → HIGH' : '64 이하 → REVIEW'}</code></p>
              <p className="logic-step-note">이 지수는 손해액이나 사고 확률이 아닙니다. 현재 후보를 어떤 순서로 먼저 확인할지 정하는 우선순위 기준입니다.</p>
            </div>
          </details>
        </div>
      </section>

      <section className="detail-grid detail-assessment-grid" id="assessment-criteria">
        <article className="assessment-panel surface-card">
          <div className="panel-heading"><div><p className="eyebrow">NEW RISK ASSESSMENT</p><h2>신규 위험성 평가</h2></div><span className="updated-label">SAMPLE · 사람 검토 필요</span></div>
          <div className="assessment-list">
            {detail.assessments.map((item) => (
              <div className="assessment-row" key={item.label}>
                <div><strong>{item.label}</strong><small>{getAssessmentEvidenceCount(item.label, risk.id, detail.evidence)}건 연결 근거 · 신뢰도 {item.confidence}</small></div>
                <div className="assessment-bar"><span><i style={{ width: `${item.score}%` }} /></span><strong>{item.score}</strong></div>
                <p>{item.note}</p>
                <details className="assessment-logic">
                  <summary>산출 근거</summary>
                  <dl className="assessment-logic-grid">
                    <div><dt>입력값</dt><dd>{item.inputs ?? '연결된 원자료 확인 필요'}</dd></div>
                    <div><dt>계산식</dt><dd>{item.formula ?? '연결된 원자료를 확인한 뒤 계산합니다.'}</dd></div>
                    <div><dt>손계산</dt><dd>{item.calculation ?? '원점수 ÷ 5 × 100'}</dd></div>
                    <div><dt>해석</dt><dd>{item.interpretation ?? item.note}</dd></div>
                  </dl>
                  <small>모든 원점수는 1–5 척도이며, 최종 표시값은 원점수 × 20으로 환산합니다.</small>
                </details>
              </div>
            ))}
          </div>
        </article>
      </section>

      <RiskDecisionWorkspace key={`review-${risk.id}`} risk={risk} detail={detail} />
    </div>
  )
}
