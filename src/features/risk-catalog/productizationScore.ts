import type { RiskExplorationMetricScores } from '../../domain/risk/riskExplorationDemo'

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export type ProductizationScores = { market: number; pml: number; manageability: number; legalReadiness: number; evidence: number; total: number }

/** 대시보드·위험 탐색·위험 상세가 함께 사용하는 100점 상품화 종합점수 산식입니다. */
export function calculateProductizationScores(scores: RiskExplorationMetricScores): ProductizationScores {
  const market = clamp((scores.demand * 0.45 + scores.moralHazard * 0.15 + scores.adverseSelection * 0.2 + scores.dataConfidence * 0.2) * 20)
  const pml = clamp((scores.fortuity * 0.45 + scores.accumulation * 0.35 + scores.adverseSelection * 0.2) * 20)
  const manageability = clamp(100 - pml * 0.55)
  const legalReadiness = clamp(100 - scores.legalExposure * 20)
  const evidence = clamp(scores.dataConfidence * 20)
  const toFive = (value: number) => Number((value / 20).toFixed(1))
  return { market: toFive(market), pml: toFive(pml), manageability: toFive(manageability), legalReadiness: toFive(legalReadiness), evidence: toFive(evidence), total: toFive(market * 0.35 + pml * 0.2 + manageability * 0.15 + legalReadiness * 0.15 + evidence * 0.15) }
}
