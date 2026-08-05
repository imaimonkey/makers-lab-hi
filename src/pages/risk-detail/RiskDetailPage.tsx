import { Link, useParams } from 'react-router-dom'
import { resolveSampleRiskId, sampleRiskCandidates, sampleRiskDetails } from '../../domain/risk/sampleData'
import type { SampleRiskCandidate, SampleRiskDetail } from '../../domain/risk/sampleData'
import { AppIcon } from '../../shared/components/AppIcon'
import { PageHeader } from '../../shared/components/PageHeader'
import { RiskContextFlow } from '../../features/risk-detail/RiskContextFlow'
import { GenerativeAiCopyrightDetail } from '../../features/risk-detail/GenerativeAiCopyrightDetail'

type RiskDetailPageProps = {
  data?: { risk: SampleRiskCandidate; detail: SampleRiskDetail; articleId: string }
  developerMode?: boolean
  step3Results?: unknown[]
}

export function RiskDetailPage({ data, developerMode = false }: RiskDetailPageProps = {}) {
  const { riskId } = useParams()
  const resolvedRiskId = resolveSampleRiskId(riskId)
  const risk = data?.risk ?? sampleRiskCandidates.find((item) => item.id === resolvedRiskId)
  const detail = data?.detail ?? (resolvedRiskId ? sampleRiskDetails[resolvedRiskId] : undefined)
  const catalogPath = developerMode ? '/developer-test/risks' : '/risks'

  if (!risk || !detail) {
    return (
      <div className="page detail-page sh-visual">
        <PageHeader step="03" eyebrow="위험 후보 상세 검토" title="위험 후보를 찾을 수 없습니다" description="삭제되었거나 존재하지 않는 위험 ID입니다. 후보 목록에서 다시 선택해 주세요." />
        <section className="detail-missing surface-card">
          <AppIcon name="scan" size={28} />
          <div><strong>요청한 위험 ID: {riskId}</strong><p>위험 후보 목록으로 돌아가 유효한 검토 대상을 선택할 수 있습니다.</p></div>
          <Link to={catalogPath} className="secondary-action">위험 후보로 돌아가기<AppIcon name="arrow" size={17} /></Link>
        </section>
      </div>
    )
  }

  return (
    <div className="page detail-page sh-visual">
      {risk.id === 'generative-ai-copyright' ? <GenerativeAiCopyrightDetail /> : <RiskContextFlow catalogPath={catalogPath} risk={risk} detail={detail} />}
    </div>
  )
}
