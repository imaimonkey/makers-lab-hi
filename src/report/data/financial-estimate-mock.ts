import { FEASIBILITY_PML_DATA } from './product-feasibility-mock'
import { PROPOSAL_PRICING_SCENARIO_OUTPUTS } from './product-proposal-mock'

export type EstimateConfidence = 'high' | 'medium' | 'low'

export type FinancialEstimate = {
  marketGrade: 'S' | 'A' | 'B' | 'C'
  marketScore: number
  tamRange: {
    min: number
    base: number
    max: number
    unit: '억원/년'
  }
  pmlRange: {
    min: number
    base: number
    max: number
    unit: '억원'
  }
  recommendedLimitRange: {
    min: number
    base: number
    max: number
    unit: '억원'
  }
  premiumRange: {
    min: number
    base: number
    max: number
    unit: '원'
    basis: '계약당'
  }
  expectedLossRatioRange: {
    min: number
    base: number
    max: number
    unit: '%'
  }
  reinsuranceNeed: {
    status: '필요' | '검토' | '불필요'
    reason: string
  }
  assumptions: string[]
  evidenceIds: string[]
  analyzedAt: string
  confidence: EstimateConfidence
}

const toEok = (value: number) => Number((value / 100_000_000).toFixed(1))

const baseScenario = PROPOSAL_PRICING_SCENARIO_OUTPUTS.find((scenario) => scenario.id === 'base') ?? PROPOSAL_PRICING_SCENARIO_OUTPUTS[0]
const lowScenario = PROPOSAL_PRICING_SCENARIO_OUTPUTS.find((scenario) => scenario.id === 'low') ?? PROPOSAL_PRICING_SCENARIO_OUTPUTS[0]
const highScenario = PROPOSAL_PRICING_SCENARIO_OUTPUTS.find((scenario) => scenario.id === 'high') ?? PROPOSAL_PRICING_SCENARIO_OUTPUTS[PROPOSAL_PRICING_SCENARIO_OUTPUTS.length - 1]
const pmlBase = FEASIBILITY_PML_DATA.scenarios.find((scenario) => scenario.id === FEASIBILITY_PML_DATA.baseScenario) ?? FEASIBILITY_PML_DATA.scenarios[0]
const pmlLow = FEASIBILITY_PML_DATA.scenarios.find((scenario) => scenario.id === 'low') ?? FEASIBILITY_PML_DATA.scenarios[0]
const pmlHigh = FEASIBILITY_PML_DATA.scenarios.find((scenario) => scenario.id === 'high') ?? FEASIBILITY_PML_DATA.scenarios[FEASIBILITY_PML_DATA.scenarios.length - 1]

const reinsuranceStatus = baseScenario.reinsuranceDecision === '권고'
  ? '필요'
  : baseScenario.reinsuranceDecision === '검토'
    ? '검토'
    : '불필요'

export const createFinancialEstimate = ({ analyzedAt = '', evidenceIds = [] }: { analyzedAt?: string | null; evidenceIds?: string[] } = {}): FinancialEstimate => ({
  marketGrade: 'A',
  marketScore: 84,
  tamRange: { min: 65, base: 121, max: 191, unit: '억원/년' },
  pmlRange: { min: toEok(pmlLow.result), base: toEok(pmlBase.result), max: toEok(pmlHigh.result), unit: '억원' },
  recommendedLimitRange: { min: toEok(lowScenario.proposedLimit), base: toEok(baseScenario.proposedLimit), max: toEok(highScenario.proposedLimit), unit: '억원' },
  premiumRange: { min: lowScenario.proposedPremium, base: baseScenario.proposedPremium, max: highScenario.proposedPremium, unit: '원', basis: '계약당' },
  expectedLossRatioRange: { min: lowScenario.lossRatio, base: baseScenario.lossRatio, max: highScenario.lossRatio, unit: '%' },
  reinsuranceNeed: {
    status: reinsuranceStatus,
    reason: `기준 PML ${toEok(pmlBase.result)}억 원이 보유 한도와 재보험 검토 기준을 넘어설 수 있어 ${reinsuranceStatus === '필요' ? '재보험 연계를 권고합니다.' : '재보험 조건 확인이 필요합니다.'}`,
  },
  assumptions: [
    ...FEASIBILITY_PML_DATA.assumptions,
    `기준 시나리오 예상 손해율 ${baseScenario.lossRatio.toFixed(1)}% · 계약당 연보험료 ${Math.round(baseScenario.proposedPremium).toLocaleString('ko-KR')}원`,
    '공개자료와 유사상품 구조를 활용한 1차 범위 추정이며 실제 계약·손해 데이터 연결 후 보정합니다.',
  ],
  evidenceIds,
  analyzedAt: analyzedAt ?? '',
  confidence: 'medium',
})

export const PRODUCT_FINANCIAL_ESTIMATE = createFinancialEstimate()
