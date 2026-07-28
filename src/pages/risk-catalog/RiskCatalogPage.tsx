import { sampleOnlyNotice } from '../../domain/risk/sampleData'
import { RiskExplorationLens } from '../../features/risk-catalog/RiskExplorationLens'
import { RiskExplorationOperations } from '../../features/risk-catalog/RiskExplorationOperations'
import { PageHeader } from '../../shared/components/PageHeader'

export function RiskCatalogPage() {
  return (
    <div className="page catalog-page seoyeon-visual">
      <PageHeader
        step="02"
        eyebrow="RISK CANDIDATE CATALOG"
        title="위험 후보"
        description="새로운 위험 신호를 카테고리와 근거 중심으로 탐색하고 상품화 가능성을 비교합니다."
      />
      <div className="sample-notice"><span>SAMPLE</span>{sampleOnlyNotice}</div>
      <RiskExplorationLens />
      <RiskExplorationOperations />
      <section className="integration-contract surface-card">
        <span className="contract-label">TEAM 02 INTEGRATION CONTRACT</span>
        <h2>위험후보는 근거와 함께 관리되는 <em>상품화 후보</em>입니다.</h2>
        <div>
          <p><strong>필수 입력</strong>RiskCandidate, evidenceCount, signalStrength, status</p>
          <p><strong>필수 출력</strong>선택한 riskId를 `/risks/:riskId`로 전달</p>
          <p><strong>금지</strong>근거 없는 AI 점수, 플랫폼 외부 링크만 제공</p>
        </div>
      </section>
    </div>
  )
}
