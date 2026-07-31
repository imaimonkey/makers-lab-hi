import type { RiskExplorationRecord } from './riskExplorationDemo'

export const riskCandidateQuantificationKeys = ['market', 'fortuity', 'legalExposure', 'pml'] as const
export type RiskCandidateQuantificationKey = (typeof riskCandidateQuantificationKeys)[number]

export type RiskCandidateQuantificationMetric = {
  key: RiskCandidateQuantificationKey
  label: string
  value: string
  sub: string
  color: 'orange' | 'blue' | 'purple' | 'red'
  official: string[]
  assumption: string[]
  formula: string[]
  result: string
  numericValue: number | null
  unit: string
  confidence: '기사 기반' | '확인 필요'
  evidenceIds: string[]
  uncertainty: string[]
}

export type RiskCandidateQuantification = Record<RiskCandidateQuantificationKey, RiskCandidateQuantificationMetric>

const confirmationMetric = (
  key: RiskCandidateQuantificationKey,
  label: string,
  color: RiskCandidateQuantificationMetric['color'],
  sub: string,
  formula: string,
): RiskCandidateQuantificationMetric => ({
  key,
  label,
  value: '확인 필요',
  sub,
  color,
  official: [],
  assumption: ['공식 입력값 또는 독립 출처 확인 필요'],
  formula: [formula],
  result: '계산 보류',
  numericValue: null,
  unit: '',
  confidence: '확인 필요',
  evidenceIds: [],
  uncertainty: ['공식 입력값 또는 독립 출처 확인 필요'],
})

const attachmentPrototypeMetrics: Record<string, {
  marketScore: number
  pml: string
}> = {
  'ev-battery-fire': { marketScore: 84, pml: '약 53억 원' },
  'generative-ai-copyright': { marketScore: 78, pml: '약 25억 원' },
  'commercial-drone': { marketScore: 69, pml: '약 12억 원' },
  'autonomous-level4': { marketScore: 72, pml: '약 80억 원' },
  'deepfake-phishing': { marketScore: 73, pml: '약 5억 원' },
  'urban-flooding': { marketScore: 86, pml: '약 500억 원' },
  'enterprise-ransomware': { marketScore: 82, pml: '약 100억 원' },
  'ess-ups-battery-fire': { marketScore: 80, pml: '약 150억 원' },
  'heatwave-health-income-loss': { marketScore: 74, pml: '약 8억 원' },
  'platform-worker-transit-accident': { marketScore: 77, pml: '약 12억 원' },
}

/**
 * 위험 후보 카드에 표시하는 1차 수치화 어댑터입니다.
 * 상품화 종합평가 기준 자료가 없는 지표는 임의 추정하지 않고 확인 필요 상태로 남깁니다.
 */
export function getRiskCandidateQuantification(record: RiskExplorationRecord): RiskCandidateQuantification {
  const demandEvidence = record.metricEvidence?.demand
  const evidenceText = (evidence?: { quotes: string[]; reasons: string[] }) => evidence?.quotes?.length ? evidence.quotes : evidence?.reasons ?? []
  const reference = attachmentPrototypeMetrics[record.id]
  const hasPrototypeReference = Boolean(reference)
  const marketScore = reference?.marketScore ?? Math.round(record.metricScores.demand * 20)
  const marketGrade = marketScore >= 90 ? 'S' : marketScore >= 75 ? 'A' : marketScore >= 60 ? 'B' : 'C'
  const fortuityEvidence = record.metricEvidence?.fortuity
  const legalExposureEvidence = record.metricEvidence?.legalExposure
  const normalizeFivePointScore = (score: number) => Number.isFinite(score) && score > 0 ? Math.round(score * 10) / 10 : null
  const fortuityScore = normalizeFivePointScore(record.metricScores.fortuity)
  const legalExposureScore = normalizeFivePointScore(record.metricScores.legalExposure)
  const fivePointValue = (score: number | null) => score === null ? '확인 필요' : `${score.toFixed(1)} / 5`
  return {
    market: {
      key: 'market',
      label: '시장성',
      value: `${marketGrade} · ${marketScore}점`,
      sub: '상품화 종합평가 시장성 기준 · SAMPLE',
      color: 'orange',
      official: evidenceText(demandEvidence).length ? evidenceText(demandEvidence) : ['기사의 수요·확산 신호'],
      assumption: demandEvidence?.uncertainty?.length ? demandEvidence.uncertainty : ['공개 시장자료 미연결', '운영 판단 전 독립 출처 확인 필요'],
      formula: [demandEvidence?.scoreRationale || '시장 성장성 + 실제 시장 수요·제도 필요성 + 상품화 검증 + 구매 접근성'],
      result: `${marketScore}/100 · ${marketGrade}등급`,
      numericValue: marketScore,
      unit: '/100',
      confidence: '기사 기반',
      evidenceIds: demandEvidence?.sourceIds ?? record.evidenceIds ?? [],
      uncertainty: demandEvidence?.uncertainty ?? ['독립 출처 확인 필요'],
    },
    fortuity: {
      key: 'fortuity', label: '우연성', value: fivePointValue(fortuityScore), sub: '상품화 종합평가 우연성 기준 · SAMPLE', color: 'blue',
      official: evidenceText(fortuityEvidence).length ? evidenceText(fortuityEvidence) : ['기사의 우연한 사고·통제 가능성 신호'],
      assumption: fortuityEvidence?.uncertainty?.length ? fortuityEvidence.uncertainty : ['고의·사전 발생·통제 가능성은 별도 확인 필요'],
      formula: [fortuityEvidence?.scoreRationale || '우연한 사고 가능성 + 사전 통제 여부 + 고의·예측 가능성 구분'], result: `${fivePointValue(fortuityScore)} · 약관·사고 정의 확인 필요`, numericValue: fortuityScore, unit: '/5', confidence: fortuityScore === null ? '확인 필요' : '기사 기반', evidenceIds: fortuityEvidence?.sourceIds ?? record.evidenceIds ?? [], uncertainty: fortuityEvidence?.uncertainty ?? ['우연성 판단을 위한 독립 근거 확인 필요'],
    },
    legalExposure: {
      key: 'legalExposure', label: '법률 및 규제 리스크', value: fivePointValue(legalExposureScore), sub: '상품화 종합평가 법률·규제 리스크 기준 · SAMPLE', color: 'purple',
      official: evidenceText(legalExposureEvidence).length ? evidenceText(legalExposureEvidence) : ['관련 법률·규제·책임 범위 확인 필요'],
      assumption: legalExposureEvidence?.uncertainty?.length ? legalExposureEvidence.uncertainty : ['법령 원문·책임 주체·개정 가능성 확인 필요'],
      formula: [legalExposureEvidence?.scoreRationale || '법률·규제 노출 수준 + 책임주체 명확성 + 약관·보장조건 확인 필요성'], result: `${fivePointValue(legalExposureScore)} · 법률·규제 원문 확인 필요`, numericValue: legalExposureScore, unit: '/5', confidence: legalExposureScore === null ? '확인 필요' : '기사 기반', evidenceIds: legalExposureEvidence?.sourceIds ?? record.evidenceIds ?? [], uncertainty: legalExposureEvidence?.uncertainty ?? ['법률·규제 리스크의 공식 근거 확인 필요'],
    },
    pml: hasPrototypeReference ? {
      key: 'pml', label: 'PML', value: reference?.pml ?? '확인 필요', sub: '기준 gross loss · 상품화 종합평가', color: 'red',
      official: ['후보별 공개 사고사례·손해 범위'], assumption: ['단일사고·누적·시설/긴급대응 손해는 첨부 프로토타입 가정'],
      formula: ['단일사고 손해 + 동시다발 누적손해 + 시설·긴급대응 비용'], result: `${reference?.pml ?? '확인 필요'} · 보수·기준·확대 시나리오 확인 필요`, numericValue: Number(reference?.pml.replace(/[^0-9.]/g, '') ?? 0), unit: '억원', confidence: '기사 기반', evidenceIds: record.evidenceIds ?? [], uncertainty: ['실제 손해액·누적 범위 확인 필요'],
    } : confirmationMetric(
      'pml',
      'PML',
      'red',
      '상품화 종합평가 PML 기준 · SAMPLE',
      'PML = 단일사고 손해 + 동시다발 누적손해 + 시설·긴급대응 비용',
    ),
  }
}
