import type { ReportResult, RiskSourceData } from '../types'
import { REPORT_LIST_LAYOUT_MOCKS } from '../data/report-list-mock'

export type GeneratedReportListItem = {
  reportId: string
  riskId: string
  riskName: string
  targetType: '가계' | '기업' | '혼합'
  status: string
  /** 상품화 평가 결과와 실무 검토 진행 상태를 분리해 표현합니다. */
  productizationDecision: string
  workflowStatus: '실무자 미검토' | '검토 필요' | '검토 중' | '검토 완료' | '초안 생성'
  priority: '우선 검토' | '일반'
  reviewFlags: string[]
  riskSummary: string
  generatedAt: string | null
  assessmentSummary: string
  shortConclusion: string
  detailHref: string
  detailAvailable: boolean
}

const PRIMARY_REPORT_SHORT_CONCLUSIONS: Record<string, string> = {
  'RPT-EVFIRE-001-20260228': '상품화 검토는 가능하나 책임주체와 요율자료 확인이 필요함',
}

/**
 * 원본 리포트에는 아직 실무 워크플로우 메타데이터가 없으므로 목록 표시용
 * 최소 메타데이터만 reportId에 매핑합니다. 향후 API/저장소로 교체할 지점입니다.
 */
const PROTOTYPE_WORKFLOW_METADATA: Record<string, Pick<GeneratedReportListItem, 'workflowStatus' | 'priority'>> = {
  'RPT-EVFIRE-001-20260228': {
    workflowStatus: '실무자 미검토',
    priority: '우선 검토',
  },
}

const STATUS_LABELS: Record<string, string> = {
  reviewable: '검토 가능',
  conditional: '추가 확인 필요',
  needs_more_data: '추가 자료 필요',
  redesign: '상품 구조 재검토',
  not_viable: '현재 상품화 곤란',
}

const AI_PRODUCT_JUDGMENT_LABELS: Record<string, string> = {
  review_worthy: '상품성 있음',
  additional_check_required: '추가 확인 필요',
  likely_initial_rejection: '상품화 어려움 가능성 높음',
}

const asText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

const displayStatus = (value: unknown): string => {
  const raw = asText(value)
  return STATUS_LABELS[raw.toLowerCase()] ?? (raw || '상태 확인 필요')
}

const isReviewFlagStatus = (value: unknown): boolean => {
  const normalized = asText(value).toLowerCase()
  return normalized.includes('보완') || normalized.includes('미평가') || normalized.includes('추가')
    || normalized === 'needs_review' || normalized === 'additional_check' || normalized === 'unknown'
}

const collectReviewFlags = (report: ReportResult): string[] => {
  const feasibility = report.productFeasibility
  const commercialCriteria = feasibility.assessment?.criteria ?? []
  const commercialFlags = commercialCriteria
    .filter((criterion) => isReviewFlagStatus(criterion.status))
    .map((criterion) => asText(criterion.title))
    .filter(Boolean)
  if (commercialFlags.length) return [...new Set(commercialFlags)]

  return feasibility.items
    .filter((item) => isReviewFlagStatus(item.status))
    .map((item) => asText(item.criterion))
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
}

export const createGeneratedReportList = (
  riskData: RiskSourceData,
  report: ReportResult,
  options: { includeLayoutMocks?: boolean } = {},
): GeneratedReportListItem[] => {
  const reportId = asText(report.meta.reportId) || report.meta.sourceRiskId
  const riskId = report.meta.sourceRiskId || riskData.meta.riskId
  const riskName = riskData.risk.shortTitle || riskData.risk.title || report.meta.riskTitle
  const selectionPreview = riskData.selectionPreview as { oneLineReason?: unknown }
  const productFeasibility = report.productFeasibility
  const assessment = productFeasibility.assessment
  const riskSummary =
    asText(selectionPreview.oneLineReason) ||
    asText(riskData.risk.formalDefinition) ||
    asText(report.riskGapSummary.definition)
  const assessmentSummary =
    asText(assessment?.aiProductJudgmentReason) ||
    asText(productFeasibility.overallAssessment?.conclusion) ||
    asText(productFeasibility.interpretation) ||
    '상품화 평가 결과를 확인할 수 있습니다.'
  const rawStatus = assessment?.overallStatus || productFeasibility.overallStatus || report.meta.dataStatus
  const productizationDecision = AI_PRODUCT_JUDGMENT_LABELS[asText(assessment?.aiProductJudgment)] ?? displayStatus(rawStatus)
  const workflowMetadata = PROTOTYPE_WORKFLOW_METADATA[reportId] ?? {
    workflowStatus: '실무자 미검토' as const,
    priority: '일반' as const,
  }

  const primaryReport: GeneratedReportListItem = {
    reportId,
    riskId,
    riskName,
    targetType: '혼합',
    status: productizationDecision,
    productizationDecision,
    ...workflowMetadata,
    reviewFlags: collectReviewFlags(report),
    riskSummary,
    generatedAt: report.meta.generatedAt || riskData.meta.preparedAt || null,
    assessmentSummary,
    shortConclusion: PRIMARY_REPORT_SHORT_CONCLUSIONS[reportId] || '상품화 검토 결과를 확인할 수 있습니다.',
    detailHref: `?reportId=${encodeURIComponent(reportId)}`,
    detailAvailable: true,
  }

  const layoutMocks: GeneratedReportListItem[] = REPORT_LIST_LAYOUT_MOCKS.map((item) => ({
    ...item,
    status: item.productizationDecision,
    generatedAt: item.generatedAt,
    detailHref: '#',
    detailAvailable: false,
  }))

  return options.includeLayoutMocks === false ? [primaryReport] : [primaryReport, ...layoutMocks]
}
