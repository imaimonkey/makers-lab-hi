import type { SampleRiskAssessment, SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'

const assessmentEvidenceTags: Record<string, string[]> = {
  '신규성': ['assessment:demand', 'risk:'],
  '증가성': ['assessment:demand'],
  '피해 심각성': ['risk:', 'assessment:fortuity', 'assessment:accumulation'],
  '확산 가능성': ['risk:', 'assessment:accumulation'],
  '보험 사각지대 가능성': ['decision:gap-review', 'assessment:legal-review'],
  '근거 신뢰도': ['assessment:data-confidence'],
}

export function getAssessmentEvidence(label: string, riskId: string, evidence: SampleRiskEvidence[]): SampleRiskEvidence[] {
  const tags = assessmentEvidenceTags[label] ?? []
  return evidence.filter((item) => item.supports.some((support) => tags.some((tag) => tag === 'risk:' ? support === `risk:${riskId}` : support === tag)))
}

export function getSafeSourceUrl(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null
  try {
    const url = new URL(sourceUrl)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function getAssessmentScore(detail: SampleRiskDetail, label: string, fallback: number): number {
  return detail.assessments.find((item) => item.label === label)?.score ?? fallback
}

export type JudgmentSignalDetail = {
  label: string
  score: number
  note: string
  basis: string
  calculation: string
  aiComment: string
  evidence: SampleRiskEvidence[]
}

function scoreCalculation(score: number): string {
  return `${(score / 20).toFixed(1)} ÷ 5 × 100 = ${score}점`
}

/**
 * 판단 상세에서 점수와 그 점수를 만든 자료·계산·AI 해석을 같은 단위로 묶습니다.
 * 실제 운영에서는 aiComment를 서버 모델 응답으로 교체하고, evidence는 검증된 원문만 연결합니다.
 */
export function buildJudgmentSignalDetails(
  risk: SampleRiskCandidate,
  detail: SampleRiskDetail,
): JudgmentSignalDetail[] {
  const getAssessment = (label: string) => detail.assessments.find((item) => item.label === label)
  const increase = getAssessment('증가성')
  const severity = getAssessment('피해 심각성')
  const confidence = getAssessment('근거 신뢰도')

  return [
    {
      label: '신호 강도',
      score: risk.signalStrength,
      note: '비교용 수요 신호의 현재값',
      basis: increase?.inputs ?? `수요 신호 ${(risk.signalStrength / 20).toFixed(1)} / 5 · 비교 레코드 ${risk.signalStrength}점`,
      calculation: increase?.calculation ?? scoreCalculation(risk.signalStrength),
      aiComment: increase ? buildAssessmentAiSummary(increase) : '비교 레코드의 수요 신호가 현재 수준으로 관찰됩니다. 실제 가입 수요나 사고 증가로 단정하지 않고 원자료를 확인해야 합니다.',
      evidence: getAssessmentEvidence('증가성', risk.id, detail.evidence),
    },
    {
      label: '피해 심각성',
      score: severity?.score ?? risk.signalStrength,
      note: '사고 시 손실 규모와 누적 영향',
      basis: severity?.inputs ?? detail.primaryLoss,
      calculation: severity?.calculation ?? scoreCalculation(severity?.score ?? risk.signalStrength),
      aiComment: severity ? buildAssessmentAiSummary(severity) : '사고 발생 시 손실 규모와 누적 영향을 함께 확인해야 합니다. 실제 손해액은 공식 통계와 원문 확인 전에는 확정하지 않습니다.',
      evidence: getAssessmentEvidence('피해 심각성', risk.id, detail.evidence),
    },
    {
      label: '근거 신뢰도',
      score: confidence?.score ?? 50,
      note: '공식 원문·독립 출처 확인 수준',
      basis: confidence?.inputs ?? '공식 원문·독립 출처·표본·최신 시각 확인 대기',
      calculation: confidence?.calculation ?? scoreCalculation(confidence?.score ?? 50),
      aiComment: confidence ? buildAssessmentAiSummary(confidence) : '출처 검증이 끝나기 전까지는 SAMPLE 판단으로 남깁니다. 원문, 표본, 발행일을 확인한 뒤 신뢰도를 갱신해야 합니다.',
      evidence: getAssessmentEvidence('근거 신뢰도', risk.id, detail.evidence),
    },
  ]
}

/**
 * 화면에서 바로 이해할 수 있는 SAMPLE용 정성 해석입니다.
 * 운영 전환 시에는 원문 근거와 모델 버전을 포함한 서버 응답으로 교체합니다.
 */
export function buildAiQualitativeSummary(risk: SampleRiskCandidate, detail: SampleRiskDetail): string {
  const severity = getAssessmentScore(detail, '피해 심각성', risk.signalStrength)
  const blindSpot = getAssessmentScore(detail, '보험 사각지대 가능성', 50)
  const confidence = getAssessmentScore(detail, '근거 신뢰도', 50)
  const signalRead = risk.signalStrength >= 80
    ? '수요 신호가 강하게 나타나'
    : risk.signalStrength >= 65
      ? '수요 신호가 비교적 뚜렷하게 나타나'
      : '수요 신호가 관찰되고 있어'
  const lossRead = severity >= 70
    ? '사고가 발생했을 때 손실 규모와 누적 영향을 함께 살펴볼 필요가 있습니다.'
    : '손실이 실제로 얼마나 커질지는 추가 확인이 필요합니다.'
  const gapRead = blindSpot >= 70
    ? '기존 상품과 책임 범위 사이의 공백 가능성도 함께 검토할 만합니다.'
    : '기존 상품·약관과의 차이는 원문을 대조해 확인해야 합니다.'
  const evidenceRead = confidence >= 70
    ? '다만 이 문장은 SAMPLE 해석이므로 공식 원문과 실제 손실 데이터 확인 전에는 가설로 봅니다.'
    : '근거 신뢰도가 아직 충분하지 않아 공식 원문·독립 출처·최신 시각 확인 전에는 판단을 보류합니다.'

  return `‘${risk.title}’ 후보는 ${signalRead} 우선 확인할 가치가 있습니다. ${lossRead} ${gapRead} ${evidenceRead}`
}

export function buildAssessmentAiSummary(item: SampleRiskAssessment): string {
  switch (item.label) {
    case '신규성':
      return '기존 위험과 다른 원인이나 노출 형태가 보이는지 먼저 살펴볼 단계입니다. 새로운 위험으로 확정하려면 유사 위험과의 비교가 필요합니다.'
    case '증가성':
      return '비교 레코드에서 관심 신호가 커지고 있는 모습입니다. 실제 가입 수요나 사고 증가로 단정하지 않고 원자료를 확인해야 합니다.'
    case '피해 심각성':
      return '사고가 발생했을 때 손실 규모와 여러 대상에 미치는 누적 영향을 함께 검토할 필요가 있습니다. 실제 손해액은 아직 확정하지 않습니다.'
    case '확산 가능성':
      return '한 건의 사고를 넘어 조직·지역·산업 단위로 번질 가능성을 살펴보는 지표입니다. 확산 경로와 책임 주체를 추가로 확인해야 합니다.'
    case '보험 사각지대 가능성':
      return '현재 상품·약관만으로 책임과 보장 범위를 설명하기 어려운 구간이 있을 수 있습니다. 원문 확인 전에는 보장 공백으로 확정하지 않습니다.'
    case '근거 신뢰도':
      return '공식 원문·독립 출처·표본·최신 시각이 얼마나 갖춰졌는지를 보여줍니다. 출처 검증이 끝나기 전까지는 SAMPLE 판단으로 남깁니다.'
    default:
      return item.interpretation ?? item.note
  }
}

export function buildTrendAiSummary(risk: SampleRiskCandidate, trendRise: number): string {
  const trendRead = trendRise >= 30
    ? '최근 관측에서 상승 흐름이 뚜렷합니다.'
    : trendRise >= 15
      ? '최근 관측에서 완만한 상승 흐름이 보입니다.'
      : '최근 관측의 변화 폭은 아직 제한적입니다.'
  return `AI 해석 보조 · SAMPLE: ‘${risk.title}’ 신호는 ${trendRead} 다만 추세 지수는 수요·관측 변화의 비교값이며, 실제 사고 빈도나 손해액을 의미하지 않습니다.`
}
