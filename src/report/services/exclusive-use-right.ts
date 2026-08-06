import type { ReportResult, RiskSourceData } from '../types'
import type { GeneratedReportListItem } from './report-list'
import { normalizeNoveltyAnalysis } from './similar-product-research'

export type ExclusiveUseRightCriterionId = 'originality' | 'progressiveness' | 'utility' | 'effort'

export type ExclusiveUseRightCriterion = {
  id: ExclusiveUseRightCriterionId
  label: string
  definition: string
  bullets: string[]
  status: '검토 가능' | '추가 확인'
}

export type ExclusiveUseRightEvidence = {
  title: string
  source: string
  role: string
}

export type ExclusiveUseRightApplication = {
  reportId: string
  riskId: string
  riskName: string
  companyName?: string
  productName: string
  sourceLabel: string
  targetTrend: string
  applicationTarget: string
  applicationPeriod?: string
  analysisBaseDate: string
  generatedAt: string | null
  evidenceCount: number
  summary: string
  criteria: ExclusiveUseRightCriterion[]
  evidence: ExclusiveUseRightEvidence[]
  followUpChecks: string[]
  status: '신청 초안'
}

const asText = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  return normalized || fallback
}

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
)

const asTextList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => asText(item))
    .filter(Boolean)
}

const unique = (values: string[]): string[] => [...new Set(values.filter(Boolean))]

const joinOr = (values: string[], fallback: string): string => values.length ? values.join(' · ') : fallback

const hasText = (value: unknown): boolean => asText(value).length > 0

const meaningfulCount = (values: unknown[]): number => values.filter((value) => {
  if (hasText(value)) return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value as Record<string, unknown>).some((item) => hasText(item))
}).length

const getEvidenceCount = (report: ReportResult): number => report.evidence
  .filter((item) => !/상품요약서/.test(item.title))
  .length

const getRiskGapText = (report: ReportResult, key: string, fallback: string): string =>
  asText(report.riskGapSummary[key], fallback)

const getReviewChecks = (report: ReportResult): string[] => {
  const assessment = report.productFeasibility.assessment
  const criteriaChecks = (assessment?.criteria ?? []).flatMap((criterion) => [
    ...criterion.missingInformation,
    ...criterion.nextActions.map((action) => action.text),
  ])
  return unique([
    ...report.productProposal.unresolvedItems,
    ...criteriaChecks,
    ...report.missingResearch.map((item) => item.topic),
  ]).slice(0, 5)
}

const getEvidence = (report: ReportResult): ExclusiveUseRightEvidence[] => report.evidence
  .filter((item) => !/상품요약서/.test(item.title))
  .filter((item) => asText(item.title) || asText(item.source))
  .slice(0, 4)
  .map((item, index) => ({
    title: asText(item.title, `연결 근거 ${index + 1}`),
    source: asText(item.source, '연결 자료'),
    role: item.usedFor.slice(0, 2).join(' · ') || (index < 2 ? '위험 사건·손해 근거' : '상품화 검토 근거'),
  }))

const createCriteria = (report: ReportResult, riskData: RiskSourceData): ExclusiveUseRightCriterion[] => {
  const proposal = report.productProposal
  const title = asText(report.meta.riskTitle, asText(riskData.risk.title, '해당 위험'))
  const event = asText(proposal.coveredEvent, getRiskGapText(report, 'definition', `${title}의 위험 사건`))
  const loss = asText(proposal.coveredLoss, joinOr(asTextList(report.riskGapSummary.damageTypes), '발생 손해'))
  const existingInsurance = asText(proposal.existingInsuranceRelationship, '기존 보험의 보장 범위·우선 보상 관계')
  const affectedParties = asTextList(report.riskGapSummary.affectedParties)
  const targets = joinOr(affectedParties.slice(0, 3), asText(proposal.expectedInsured, '위험 보유·운영 주체'))
  const underwriting = joinOr(proposal.underwritingCandidates.slice(0, 2), '사고 이력·위험관리 수준·책임 주체 확인')
  const evidenceCount = getEvidenceCount(report)
  const followUps = getReviewChecks(report)
  const sourceAnalysis = asRecord(riskData.demoContext.sourceAnalysis)
  // The depth adapter intentionally fills common wording/product fields so
  // every report can be reviewed. Keep the article-derived signal profile
  // separate so those shared scaffolding fields do not make every criterion
  // look equally substantiated.
  const sourceScores = asRecord(sourceAnalysis.scores)
  const sourceMetricScores = asRecord(sourceAnalysis.metricScores)
  const sourceDisposition = asText(sourceAnalysis.disposition)
  const sourceRecommendation = asText(sourceAnalysis.recommendation)
  const sourceEvidenceCount = Math.max(
    asNumber(sourceAnalysis.evidenceQuoteCount) ?? 0,
    report.evidence.filter((item) => !/상품요약서|depth-evidence/.test(`${item.title} ${item.id}`)).length,
  )
  const score = (profileKey: string, metricKey: string): number => (
    asNumber(sourceScores[profileKey])
      ?? asNumber(sourceMetricScores[metricKey])
      ?? 0
  )
  const noveltyScore = score('novelty', 'moralHazard')
  const coverageGapScore = score('coverageGap', 'legalExposure')
  const severityScore = score('severity', 'fortuity')
  const growthScore = score('growth', 'demand')
  const dataConfidenceScore = score('evidenceConfidence', 'dataConfidence')
  const hasSourceAnalysis = Object.keys(sourceAnalysis).length > 0
  const novelty = normalizeNoveltyAnalysis(proposal.noveltyAnalysis, report.meta.analysisBaseDate)
  const noveltyStatus = novelty.analysisStatus === 'completed'
    && (novelty.noveltyType === 'new' || novelty.noveltyType === 'differentiated')
  const noveltyGapCount = (novelty.differentiatedGapCount ?? 0) + novelty.comparisonItems.filter((item) => item.remainingGaps.length > 0).length
  const originalityStatus = hasSourceAnalysis
    ? sourceDisposition === 'candidate'
      && noveltyScore >= 3.8
      && coverageGapScore >= 3.5
      && dataConfidenceScore >= 4.0
      && sourceEvidenceCount >= 1
    : noveltyStatus && noveltyGapCount > 0
  const wordingDepth = meaningfulCount([
    ...report.wordingFeasibility.definitions,
    ...report.wordingFeasibility.paymentConditions,
    ...report.wordingFeasibility.exclusionCandidates,
  ])
  const proposalStructureDepth = [
    proposal.recommendedForm,
    proposal.coveredEvent,
    proposal.coveredLoss,
    proposal.existingInsuranceRelationship,
    proposal.settlementDirection,
    proposal.policyPeriodDirection,
    proposal.coverageLimitDirection,
    proposal.deductibleDirection,
  ].filter(hasText).length
  const progressivenessStatus = hasSourceAnalysis
    ? sourceDisposition === 'candidate'
      && coverageGapScore >= 3.8
      && dataConfidenceScore >= 4.0
      && proposal.underwritingCandidates.filter(hasText).length >= 2
      && wordingDepth >= 5
      && sourceEvidenceCount >= 1
    : proposalStructureDepth >= 6
      && proposal.underwritingCandidates.filter(hasText).length >= 2
      && wordingDepth >= 5
  const utilityStatus = hasSourceAnalysis
    ? sourceDisposition === 'candidate'
      && (sourceRecommendation === 'review' || (severityScore >= 4.4 && coverageGapScore >= 4.0))
      && severityScore >= 3.8
      && growthScore >= 3.3
      && coverageGapScore >= 3.5
      && affectedParties.length >= 2
      && sourceEvidenceCount >= 1
    : hasText(report.riskGapSummary.definition)
      && hasText(proposal.coveredLoss)
      && (affectedParties.length >= 2 || hasText(proposal.expectedInsured))
      && asTextList(report.riskGapSummary.damageTypes).length >= 1
  const assessmentCriteria = report.productFeasibility.assessment?.criteria ?? []
  const traceableCriteria = assessmentCriteria.filter((criterion) => criterion.evidence.length > 0 || criterion.sourceSections.length > 0).length
  const effortEvidence = report.evidence.some((item) => /개발|구축|인프라|시스템|TFT|투입/.test(`${item.title} ${item.usedFor.join(' ')}`))
  const effortStatus = effortEvidence
    || (hasSourceAnalysis
      && sourceEvidenceCount >= 3
      && dataConfidenceScore >= 4.5
      && wordingDepth >= 5
      && traceableCriteria >= 4)

  return [
    {
      id: 'originality',
      label: '독창성',
      definition: '기존에 없던 새로운 위험담보나 서비스의 창의성',
      bullets: [
        `${event}로 인해 기존 보험이 분리해 다루지 못한 ${loss}를 하나의 검토 대상 위험으로 구조화`,
        `기존 보험 관계(${existingInsurance})와 남은 보장 공백을 함께 제시해 신규 담보의 차별화 지점 구성`,
      ],
      status: originalityStatus ? '검토 가능' : '추가 확인',
    },
    {
      id: 'progressiveness',
      label: '진보성',
      definition: '기존 상품 대비 보장 범위나 방식의 기술적 개선 정도',
      bullets: [
        `사고(${event}), 손해(${loss}), 책임 주체와 기존 보험의 선행 보상을 분리해 상품 구조의 개선 방향 제시`,
        `인수 기준(${underwriting})과 사고·손해 입증자료를 연결해 보장 조건을 구체화할 수 있도록 구성`,
      ],
      status: progressivenessStatus ? '검토 가능' : '추가 확인',
    },
    {
      id: 'utility',
      label: '유용성',
      definition: '소비자 편익 증대 및 보장 사각지대 해소 기여도',
      bullets: [
        `${targets}가 부담하는 ${loss}를 기존 보장과 구분해 보장 공백과 손해 부담 주체를 확인할 수 있도록 구성`,
        `실제 손해·배상책임·방어비용을 구분하는 방향으로 소비자와 계약자의 보장 이해 가능성 제고`,
      ],
      status: utilityStatus ? '검토 가능' : '추가 확인',
    },
    {
      id: 'effort',
      label: '노력도',
      definition: '상품 개발에 투입된 기간, 인력 및 비용의 적정성',
      bullets: [
        `연결 근거 ${evidenceCount}건과 위험 구조·상품화·약관 검토 결과를 신청 사유별로 매핑`,
        `개발 기간·투입 인력·시스템 구축 비용은 내부 개발 기록과 TFT 자료 확인 후 신청서에 반영`,
        ...(followUps[0] ? [`반영 전 확인: ${followUps[0]}`] : []),
      ],
      status: effortStatus ? '검토 가능' : '추가 확인',
    },
  ]
}

export const createExclusiveUseRightApplication = (
  riskData: RiskSourceData,
  report: ReportResult,
  reportItem: GeneratedReportListItem,
): ExclusiveUseRightApplication => {
  const proposal = report.productProposal
  const riskName = asText(reportItem.riskName, asText(report.meta.riskTitle, riskData.risk.title))
  const productName = asText(proposal.workingName, `${riskName} 보완보험 검토안`)
  const targetTrend = asText(
    riskData.demoContext.trend,
    asText(report.meta.title, asText(riskData.risk.formalDefinition, '신규 위험 변화와 보장 공백')),
  )
  const applicationTarget = asText(
    proposal.coveredEvent,
    getRiskGapText(report, 'definition', `${riskName} 관련 핵심 담보`),
  )
  const summary = asText(
    proposal.recommendationReason,
    asText(report.productFeasibility.assessment?.overallReason, reportItem.assessmentSummary),
  )
  const evidence = getEvidence(report)
  const followUpChecks = getReviewChecks(report)

  return {
    reportId: reportItem.reportId,
    riskId: reportItem.riskId,
    riskName,
    productName,
    sourceLabel: evidence[0]?.source ?? '연결 근거',
    targetTrend,
    applicationTarget,
    analysisBaseDate: report.meta.analysisBaseDate,
    generatedAt: report.meta.generatedAt,
    evidenceCount: getEvidenceCount(report),
    summary,
    criteria: createCriteria(report, riskData),
    evidence,
    followUpChecks,
    status: '신청 초안',
  }
}
