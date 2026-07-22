import { Link, useParams } from 'react-router-dom'
import { sampleOnlyNotice, sampleRiskCandidates, sampleRiskDetails } from '../../domain/risk/sampleData'
import { RiskDecisionWorkspace } from '../../features/risk-detail/RiskDecisionWorkspace'
import { EvidenceVerificationWorkspace } from '../../features/risk-detail/EvidenceVerificationWorkspace'
import { ProductizationEvaluationPanel } from '../../features/risk-detail/ProductizationEvaluationPanel'
import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'

export function RiskDetailPage() {
  const { riskId } = useParams()
  const risk = sampleRiskCandidates.find((item) => item.id === riskId)

  if (!risk) {
    return (
      <div className="page detail-page">
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

  const detail = sampleRiskDetails[risk.id]

  return (
    <div className="page detail-page">
      <PageHeader
        step="03"
        eyebrow="EVIDENCE & PRODUCT FIT"
        title="평가 워크벤치"
        description="위험 정의, 직접 근거, 기존 보장과의 차이, 상품화 제약을 같은 화면에서 검토합니다."
      />
      <div className="sample-notice"><span>SAMPLE</span>{sampleOnlyNotice}</div>

      <section className="risk-hero surface-card">
        <div className="risk-hero-main">
          <div className="risk-badges"><span>{risk.themeLabel}</span><em>{risk.status}</em></div>
          <h2>{risk.title}</h2>
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
          <p>상품성 {risk.productFit ?? '미평가'} · 근거 {risk.evidenceCount}건</p>
        </div>
      </section>

      <section className="detail-grid">
        <article className="assessment-panel surface-card">
          <div className="panel-heading"><div><p className="eyebrow">ASSESSMENT</p><h2>상품화 평가</h2></div><span className="updated-label">담당자 검토 전</span></div>
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

      <RiskDecisionWorkspace risk={risk} detail={detail} />
      <EvidenceVerificationWorkspace risk={risk} detail={detail} />
      <ProductizationEvaluationPanel risk={risk} detail={detail} />
    </div>
  )
}
