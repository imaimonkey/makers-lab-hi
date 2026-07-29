import {
  calculateRiskExplorationScore,
  riskExplorationRecords,
  type RiskExplorationMetricScores,
  type RiskExplorationRecord,
} from './riskExplorationDemo'
import { demoRisks, type ProductRisk } from './riskRadarDemo'
import { sampleRiskDetails } from './sampleData'
import type { RadarRiskCandidate } from './riskRadarTypes'
import { getRadarArticleId, getWorkbenchRiskId } from './riskRadarMappings'

export type CandidatePipelineStatus =
  | '수집'
  | '본문 확보'
  | 'AI 분석'
  | '교차검증'
  | '법령 검토'

export type CandidateStatus =
  | '후보 대기'
  | '상세 검토 요청'
  | '검증 중'
  | '후보 등록 요청'
  | '검토 완료'
  | '보류'

export type CandidateEvidenceStatus = 'linked' | 'pending' | 'unavailable'

export type CandidateListViewModel = {
  id: string
  detailRiskId?: string
  articleId?: string
  title: string
  summary: string
  categories: string[]
  tags: string[]
  metricScores: RiskExplorationMetricScores | null
  screeningScore: {
    value: number | null
    scale: '0-5'
    meaning: 'candidate-prioritization'
    formulaVersion: string
    asOf: string
    isMock: boolean
  }
  evidence: {
    ids: string[]
    count: number
    status: CandidateEvidenceStatus
  }
  pipelineStatus: CandidatePipelineStatus
  candidateStatus: CandidateStatus
  nextAction?: string
  canonicalMappingStatus: 'mapped' | 'pending'
}

export const CANDIDATE_SCREENING_FORMULA_VERSION = 'risk-screening.v1'
export const CANDIDATE_SCREENING_AS_OF = '2026-07-23T00:00:00.000Z'

function candidatePipelineStatus(record: RiskExplorationRecord): CandidatePipelineStatus {
  if (record.dataConfidence.includes('없음')) return '본문 확보'
  if (record.legalExposure.includes('높음')) return '법령 검토'
  if (record.dataConfidence.includes('보강')) return '교차검증'
  return 'AI 분석'
}

function candidateStatus(record: RiskExplorationRecord): CandidateStatus {
  const score = calculateRiskExplorationScore(record.metricScores)
  if (record.demand.includes('높음') || score >= 4) return '상세 검토 요청'
  return '후보 대기'
}

function evidenceFor(record: RiskExplorationRecord) {
  const evidence = sampleRiskDetails[record.detailRiskId]?.evidence ?? []
  return {
    ids: evidence.map((item) => item.id),
    count: evidence.length,
    status: evidence.length ? 'linked' as const : 'unavailable' as const,
  }
}

export function toCandidateListViewModel(record: RiskExplorationRecord): CandidateListViewModel {
  return {
    id: record.id,
    detailRiskId: record.detailRiskId,
    articleId: getRadarArticleId(record.detailRiskId),
    title: record.title,
    summary: record.summary,
    categories: record.categories,
    tags: record.tags,
    metricScores: record.metricScores,
    screeningScore: {
      value: calculateRiskExplorationScore(record.metricScores),
      scale: '0-5',
      meaning: 'candidate-prioritization',
      formulaVersion: CANDIDATE_SCREENING_FORMULA_VERSION,
      asOf: CANDIDATE_SCREENING_AS_OF,
      isMock: true,
    },
    evidence: evidenceFor(record),
    pipelineStatus: candidatePipelineStatus(record),
    candidateStatus: candidateStatus(record),
    nextAction: record.nextAction,
    canonicalMappingStatus: record.detailRiskId ? 'mapped' : 'pending',
  }
}

const explorationByDetailId = new Map(
  riskExplorationRecords.map((record) => [record.detailRiskId, toCandidateListViewModel(record)]),
)

export const candidateListViewModels = riskExplorationRecords.map(toCandidateListViewModel)

export function getCandidateViewModelById(id: string) {
  return candidateListViewModels.find((candidate) => candidate.id === id)
    ?? Array.from(explorationByDetailId.values()).find((candidate) => candidate.detailRiskId === id)
}

export function getCandidateViewModelForProductRisk(risk: ProductRisk) {
  return explorationByDetailId.get(getWorkbenchRiskId(risk) ?? '')
}

export function toRadarCandidateViewModel(candidate: RadarRiskCandidate): CandidateListViewModel {
  const canonical = getCandidateViewModelById(candidate.id)
    ?? (candidate.articleId ? candidateListViewModels.find((item) => item.articleId === candidate.articleId) : undefined)
  if (canonical) {
    return {
      ...canonical,
      id: candidate.id,
      articleId: candidate.articleId ?? canonical.articleId,
      pipelineStatus: candidate.status.includes('본문') ? '본문 확보' : canonical.pipelineStatus,
      candidateStatus: candidate.eligibleForProductReview ? '상세 검토 요청' : canonical.candidateStatus,
      nextAction: candidate.promotionBlockReason ?? canonical.nextAction,
    }
  }

  return {
    id: candidate.id,
    detailRiskId: undefined,
    articleId: candidate.articleId,
    title: candidate.name,
    summary: candidate.riskInterpretation?.riskEnvironment ?? 'API 후보의 위험 정의가 아직 연결되지 않았습니다.',
    categories: [],
    tags: [],
    metricScores: null,
    screeningScore: {
      value: null,
      scale: '0-5',
      meaning: 'candidate-prioritization',
      formulaVersion: CANDIDATE_SCREENING_FORMULA_VERSION,
      asOf: new Date().toISOString(),
      isMock: false,
    },
    evidence: { ids: [], count: 0, status: 'pending' },
    pipelineStatus: candidate.status.includes('본문') ? '본문 확보' : 'AI 분석',
    candidateStatus: '후보 대기',
    nextAction: candidate.promotionBlockReason ?? 'canonical mapping과 근거 연결을 확인합니다.',
    canonicalMappingStatus: 'pending',
  }
}

export const productRiskViewModels = demoRisks.map(getCandidateViewModelForProductRisk)
