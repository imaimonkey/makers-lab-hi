export type WordingCoverageOptionId = 'adjacent-vehicle' | 'facility-damage' | 'suppression-cost'

export type WordingStatusType = 'satisfied' | 'needs-improvement' | 'decision-required' | 'failed' | 'not-evaluated'

type WordingConfidence = '높음' | '보통' | '낮음'

export type WordingDecisionDetail = {
  id: string
  question: string
  recommendation: string
  rationale: string
  assumptions: string[]
  basis: string
  confidence: WordingConfidence
  statusType?: WordingStatusType
}

export type WordingClauseArticle = {
  articleNumber: number
  title: string
  content: string
}

export type WordingClauseEvidence = {
  sourceType: string
  clauses: string[]
  reflected: string
  assumption: string
  simulation: string
  limitation: string
  confidence: WordingConfidence
}

export type WordingCoverageClauseDraft = {
  id: WordingCoverageOptionId
  title: string
  summary: string
  proposalReason: string
  status: { label: string; type: WordingStatusType }
  paymentRequirements: string[]
  decisionItems: WordingDecisionDetail[]
  previewClause: string
  coveredLosses: string[]
  excludedLosses: string[]
  fullDraftArticles: WordingClauseArticle[]
  keyTerms: string[]
  evidence: WordingClauseEvidence[]
}

export const WORDING_ANALYSIS_RISK = {
  label: '분석 대상 위험',
  description: '지하주차장 또는 충전 중인 전기자동차에서 화재가 발생해 인접 차량과 건물·주차장 시설로 손해가 확산되는 위험',
  riskId: 'RSK-EVFIRE-001',
  riskType: '기업성 일반보험 검토 대상',
  affected: '인접 차량, 건물·주차장 시설, 충전설비',
  basis: '발생 가능한 손해와 기존 보험의 보장 공백 분석',
} as const

const ARTICLE_TITLES = [
  '목적',
  '용어의 정의',
  '보상하는 손해',
  '보험금 지급요건',
  '보상하지 않는 손해',
  '손해의 조사와 확정',
  '보험금의 청구',
  '보험금의 지급절차',
  '보험금의 지급한도와 자기부담금',
  '다른 보험과의 관계 및 구상',
  '중복보상의 조정',
  '준용규정',
] as const

function makeArticles(coverageTitle: string): WordingClauseArticle[] {
  return ARTICLE_TITLES.map((title, index) => ({
    articleNumber: index + 1,
    title,
    content: index === 1
      ? `이 특별약관에서 사용하는 용어는 다음과 같이 정의합니다.\n\n1. ${coverageTitle}: 보험증권에 기재된 보장 대상과 그에 부수하는 손해를 말합니다.\n2. 직접손해: 화재와 직접적인 인과관계가 확인되는 물리적 손해를 말합니다.\n3. 기존 보험: 사고 당시 적용될 수 있는 자동차보험, 재산보험 또는 배상책임보험을 말합니다.`
      : `${coverageTitle}에 관한 ${title}을 정하고, 보험금 지급에 필요한 확인자료와 기존 보험과의 관계를 규정합니다.`,
  }))
}

function makeDecisions(coverageTitle: string, id: WordingCoverageOptionId): WordingDecisionDetail[] {
  return [
    {
      id: `${id}-cause`,
      question: `${coverageTitle}의 사고 원인과 책임주체가 확정되지 않은 경우에도 보상할 것인가?`,
      recommendation: '복수의 객관적 자료로 발화 사실과 손해의 직접 관련성이 확인되면 우선 보상하는 기준을 검토합니다.',
      rationale: '단일 자료만으로 원인을 확정하기 어려운 사고에서 지급을 유보하면 피해 회복이 지연될 수 있습니다.',
      assumptions: ['소방·경찰·감정자료를 확보할 수 있음', '발화 위치와 손해 발생의 시간적 선후를 확인할 수 있음'],
      basis: '발화 원인 확정 전 보험금 지급 기준과 손해의 직접성',
      confidence: '보통',
      statusType: 'decision-required',
    },
    {
      id: `${id}-existing-first`,
      question: '기존 보험의 보상과 새 담보의 지급 순서를 어떻게 정할 것인가?',
      recommendation: '기존 보험의 보상 범위와 지급 여부를 먼저 확인하되, 긴급 복구가 필요한 손해는 선지급 후 정산하는 안을 검토합니다.',
      rationale: '중복보상과 구상관계를 정리하면서도 피해자의 복구 지연을 줄일 수 있습니다.',
      assumptions: ['기존 보험의 지급내역을 확인할 수 있음', '사후 구상·정산 절차를 약관에 둘 수 있음'],
      basis: '기존 보험과 보완 담보의 보상 순서 및 구상관계',
      confidence: '보통',
      statusType: 'needs-improvement',
    },
    {
      id: `${id}-limit`,
      question: '사고당 보상한도와 자기부담금을 얼마로 정할 것인가?',
      recommendation: '다수 차량·시설 손해가 동시에 발생하는 시나리오를 기준으로 사고당 한도, 자기부담금과 PML을 함께 검토합니다.',
      rationale: '손해가 누적되는 사고 특성상 개별 피해액뿐 아니라 사고 전체의 최대 손실을 반영해야 합니다.',
      assumptions: ['차량·시설별 손해자료를 확보할 수 있음', '사고 규모별 시나리오와 PML을 산출할 수 있음'],
      basis: '다수 목적물 동시손해와 최대가능손해 검토',
      confidence: '낮음',
      statusType: 'not-evaluated',
    },
  ]
}

function makeEvidence(coverageTitle: string): WordingClauseEvidence[] {
  return [
    {
      sourceType: '전기차 화재 관련 공개자료',
      clauses: ['목적 및 용어의 정의', '보상하는 손해'],
      reflected: `${coverageTitle}의 보장 대상과 직접손해 범위를 구분해 반영`,
      assumption: '공개자료는 구조와 보장 조건을 검토하기 위한 mock 근거로 사용',
      simulation: '사고당 한도와 자기부담금은 프로토타입 가정치',
      limitation: '실제 약관 원문과 사고별 손해자료의 추가 확인 필요',
      confidence: '보통',
    },
    {
      sourceType: '보험 상품·약관 구조 참고자료',
      clauses: ['보험금 지급요건', '다른 보험과의 관계 및 구상'],
      reflected: '기존 보험의 보상 순서와 중복보상 조정 구조를 반영',
      assumption: '기존 보험의 실제 가입조건과 지급내역은 별도 확인',
      simulation: '선지급 후 정산 가능성은 실무 검토용 가정',
      limitation: '책임주체와 면책조건 확정 전에는 적용 범위가 달라질 수 있음',
      confidence: '보통',
    },
    {
      sourceType: '상품개발 검토용 mock 자료',
      clauses: ['보험금의 지급한도와 자기부담금', '준용규정'],
      reflected: '손해 범위, 한도, 자기부담금과 추가 확인사항을 연결',
      assumption: '정확한 요율·인수기준은 계리·인수 검토에서 확정',
      simulation: '실제 산출값이 아닌 프로토타입 시나리오',
      limitation: '공식 상품·법무 검토 전 확정 문구로 사용할 수 없음',
      confidence: '낮음',
    },
  ]
}

const WORDING_PAYMENT_REQUIREMENTS: Record<WordingCoverageOptionId, string[]> = {
  'adjacent-vehicle': [
    '보험기간 중 보험증권에 기재된 지하주차장에서 전기자동차 화재가 발생할 것',
    '해당 화재로 인해 인접한 제3자의 차량에 직접적인 물리적 손해가 발생할 것',
    '화재 발생 사실과 인접 차량의 손해 범위가 소방·경찰·감정자료 등 객관적인 자료로 확인될 것',
    '기존 자동차보험이나 다른 보상제도에서 이미 지급된 금액과 중복되지 않을 것',
  ],
  'facility-damage': [
    '보험기간 중 보험증권에 기재된 지하주차장에서 전기자동차 화재가 발생할 것',
    '해당 화재로 인해 건물, 주차장 구조물 또는 충전설비에 직접적인 물리적 손해가 발생할 것',
    '손해를 입은 건물·시설 또는 충전설비가 보험증권상 보장 대상에 포함될 것',
    '화재 발생 사실과 복구비용이 소방 확인자료·감정자료·복구견적서 등으로 확인될 것',
  ],
  'suppression-cost': [
    '보험기간 중 약관에서 정한 보장 대상 전기자동차 화재가 발생할 것',
    '화재의 확산을 막거나 추가 손해를 줄이기 위해 지출한 비용일 것',
    '소화·진압, 화재 차량 이동·견인 또는 긴급 안전조치에 필요하고 합리적으로 지출한 비용일 것',
    '영수증·작업기록·출동기록·견인확인서 등 객관적인 자료로 비용을 확인할 수 있을 것',
  ],
}

function makeDraft(input: {
  id: WordingCoverageOptionId
  title: string
  summary: string
  proposalReason: string
  keyTerms: string[]
  coveredLosses: string[]
  excludedLosses: string[]
}): WordingCoverageClauseDraft {
  const { id, title, summary, proposalReason, keyTerms, coveredLosses, excludedLosses } = input
  return {
    id,
    title,
    summary,
    proposalReason,
    status: { label: '보완 후 약관 초안 작성 가능', type: 'needs-improvement' },
    paymentRequirements: WORDING_PAYMENT_REQUIREMENTS[id],
    decisionItems: makeDecisions(title, id),
    previewClause: `${title}에 대하여 사고와 직접 관련된 손해를 보상하되, 기존 보험과 중복되는 금액은 공제합니다. 구체적인 지급요건과 보상한도는 특별약관에서 정합니다.`,
    coveredLosses,
    excludedLosses,
    fullDraftArticles: makeArticles(title),
    keyTerms,
    evidence: makeEvidence(title),
  }
}

export const coverageClauseDrafts: readonly WordingCoverageClauseDraft[] = [
  makeDraft({
    id: 'adjacent-vehicle',
    title: '인접 차량 직접재산손해',
    summary: '발화 차량 주변 차량에 발생한 직접 재산손해를 보완하는 담보',
    proposalReason: '법률상 배상책임과 대물배상 한도 초과 손해가 남을 수 있어 보완 담보로 검토',
    keyTerms: ['발화 차량', '인접 차량', '직접 재산손해'],
    coveredLosses: ['인접 차량 직접 재산손해 · 화재와 직접 관련된 차량 물리손해', '긴급 이동·견인 비용 · 손해 확대 방지를 위해 필요한 비용'],
    excludedLosses: ['발화 차량 자체 손해 · 별도 자기차량손해 담보 대상', '간접손해 · 영업손실과 사고와 직접 관련 없는 비용', '기존 보험에서 이미 지급된 손해 · 중복보상 조정 대상'],
  }),
  makeDraft({
    id: 'facility-damage',
    title: '건물·주차장 시설 직접 화재손해',
    summary: '건물·주차장 구조물과 보험 목적에 포함된 충전설비의 직접 화재손해를 보완',
    proposalReason: '충전설비의 보험 목적 편입과 시설가액·보상한도 부족 여부를 확인해야 해 보완 담보로 검토',
    keyTerms: ['건물·주차장 시설', '충전설비', '보험 목적'],
    coveredLosses: ['건물·주차장 시설 직접 화재손해 · 화재로 발생한 물리적 손해', '보험 목적에 포함된 충전설비 손해 · 명세와 가입금액 확인 대상'],
    excludedLosses: ['보험 목적에 포함되지 않은 설비 · 별도 편입과 명세가 필요한 대상', '보험가입금액·보상한도 초과분 · 부족분은 보상되지 않을 수 있음', '영업중단 등 간접손해 · 별도 담보 검토 대상'],
  }),
  makeDraft({
    id: 'suppression-cost',
    title: '화재 진압·긴급조치 비용',
    summary: '화재 확산 방지와 손해 경감을 위해 지출한 긴급조치 비용을 보완',
    proposalReason: '기존 직접 재산손해 담보에서 소화·진압·견인 비용이 제외될 수 있어 추가 담보로 검토',
    keyTerms: ['긴급조치 비용', '손해 경감 비용', '객관적 증빙자료'],
    coveredLosses: ['화재 진압·긴급 방재 비용 · 사고 직후 손해 확대를 막기 위한 비용', '차량 이동·견인 비용 · 피해 확산 방지에 직접 필요한 비용'],
    excludedLosses: ['통상적인 유지·관리 비용 · 사고와 직접 관련 없는 비용', '설비 교체·개선 비용 · 원상복구를 넘어선 개선분', '객관적 증빙이 없는 비용 · 지급요건 확인이 어려운 비용'],
  }),
]
