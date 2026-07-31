export type CoverageGapTone = 'warning' | 'success' | 'info' | 'muted'

export type CoverageGapFinding = {
  id: string
  category: string
  title: string
  cause: string
  impact: string
  linkedComparisonRows: string[]
  linkedSourceGapId: string
  severity: 'high' | 'medium'
  confidence: 'medium'
}

export type ProductDevelopmentInput = {
  id: string
  condition: string
  reason: string
  sourceGapIds: string[]
}

export const COVERAGE_GAP_ANALYSIS_PREMISE = '전기차가 지하주차장에서 주차 또는 충전 중 화재를 일으켜 인접 차량과 건물·주차장 시설에 직접손해가 확산된 상황을 기준으로 분석했습니다.'

export const COVERAGE_GAP_RESULT_CARDS = [
  {
    id: 'gap-status',
    title: '보장 공백',
    result: '확인됨',
    bullets: ['기존 보험은 일부 손해만 보장', '책임·가입·보험 목적·한도 조건에서 공백 발생'],
    tone: 'fact' as const,
  },
  {
    id: 'gap-significance',
    title: '상품개발 검토 가치',
    result: '있음',
    bullets: ['다수 차량·시설의 동시손해 가능', '기존 보험만으로 처리하기 어려운 직접손해 존재'],
    tone: 'success' as const,
  },
  {
    id: 'next-evaluation',
    title: '다음 판단 단계',
    result: '상품화 종합평가',
    bullets: ['시장성·우연성·도덕적 해이·PML 평가', '평가 결과로 상품개발 진행 여부 판단'],
    tone: 'info' as const,
  },
] as const

export const COVERAGE_GAP_CATEGORY_SUMMARY = [
  { id: 'responsibility', label: '책임 공백' },
  { id: 'scope', label: '범위 공백' },
  { id: 'limit', label: '한도 공백' },
  { id: 'accumulation', label: '누적손해 공백' },
] as const

export const COVERAGE_GAP_FINDINGS: CoverageGapFinding[] = [
  {
    id: 'responsibility-gap',
    category: '책임 공백',
    title: '책임 공백',
    cause: '법률상 배상책임이나 제조사·시설관리자의 책임이 확정되지 않으면',
    impact: '기존 배상책임보험의 지급이 지연되거나 적용되지 않을 수 있습니다.',
    linkedComparisonRows: ['COV-01', 'COV-04', 'COV-05'],
    linkedSourceGapId: 'GAP-01',
    severity: 'high',
    confidence: 'medium',
  },
  {
    id: 'scope-gap',
    category: '범위 공백',
    title: '범위 공백',
    cause: '자차 미가입 차량, 보험 목적에 포함되지 않은 충전설비와 기존 보험에서 제외된 손해는',
    impact: '보상 대상에서 빠질 수 있습니다.',
    linkedComparisonRows: ['COV-02', 'COV-03'],
    linkedSourceGapId: 'GAP-05',
    severity: 'high',
    confidence: 'medium',
  },
  {
    id: 'limit-gap',
    category: '한도 공백',
    title: '한도 공백',
    cause: '다수 차량과 건물·시설 손해가 동시에 발생하면',
    impact: '개별 보험의 가입금액 또는 사고당 보상한도를 초과할 수 있습니다.',
    linkedComparisonRows: ['COV-01', 'COV-03'],
    linkedSourceGapId: 'GAP-02',
    severity: 'high',
    confidence: 'medium',
  },
  {
    id: 'accumulation-gap',
    category: '누적손해 공백',
    title: '누적손해 공백',
    cause: '하나의 화재로 차량, 시설과 소화·진압 비용이 함께 발생하면',
    impact: '여러 보험으로 분리된 손해를 일관되게 처리하기 어렵습니다.',
    linkedComparisonRows: ['COV-01', 'COV-02', 'COV-03'],
    linkedSourceGapId: 'GAP-02',
    severity: 'high',
    confidence: 'medium',
  },
  {
    id: 'payment-procedure-gap',
    category: '지급절차 공백',
    title: '지급절차 공백',
    cause: '자동차보험·화재보험·배상책임보험의 적용 순서와 기존 보험 지급액 차감 방식이 정리되지 않으면',
    impact: '보상이 지연될 수 있습니다.',
    linkedComparisonRows: ['COV-01', 'COV-02', 'COV-03', 'COV-04', 'COV-05'],
    linkedSourceGapId: 'GAP-03',
    severity: 'medium',
    confidence: 'medium',
  },
]

export const COVERAGE_GAP_PRODUCT_INPUTS: ProductDevelopmentInput[] = [
  { id: 'existing-payment', condition: '기존 보험 지급액 차감', reason: '기존 보험에서 지급된 금액을 제외하고 남은 직접손해를 구분', sourceGapIds: ['payment-procedure-gap', 'scope-gap'] },
  { id: 'pre-liability-payment', condition: '책임 확정 전 지급 기준', reason: '책임 조사 중 보험금을 지급할지 사전에 기준 정의', sourceGapIds: ['responsibility-gap', 'payment-procedure-gap'] },
  { id: 'limits', condition: '사고당 총 보상한도', reason: '다수 차량과 시설의 동시 피해를 하나의 사고 한도에 반영', sourceGapIds: ['limit-gap', 'accumulation-gap'] },
  { id: 'accident-unit', condition: '하나의 사고 정의', reason: '동일 화재로 발생한 차량·시설 손해를 일관된 기준으로 처리', sourceGapIds: ['accumulation-gap', 'payment-procedure-gap'] },
  { id: 'loss-boundary', condition: '보장 범위 기준', reason: '직접·간접손해를 구분하고 자차 미가입 차량과 시설의 포함 범위 정의', sourceGapIds: ['scope-gap'] },
  { id: 'duplicate-exclusion', condition: '고의·중복보상 제외', reason: '고의 사고와 이미 보상된 손해를 지급 대상에서 제외', sourceGapIds: ['scope-gap', 'payment-procedure-gap'] },
]

export const COVERAGE_GAP_ASSUMPTIONS = [
  '동일 화재로 차량과 시설에 직접손해가 함께 발생합니다.',
  '자동차보험·화재보험·배상책임보험이 우선 적용됩니다.',
  '직접 재산손해를 중심으로 분석합니다.',
  '기존 보험에서 이미 지급된 손해는 중복 보장하지 않습니다.',
  '고의 사고와 허위 청구는 분석 대상에서 제외합니다.',
] as const

export const COVERAGE_GAP_LIMITATION = '현재 결과는 공개자료와 mock 데이터를 기준으로 한 AI 1차 판단이며, 실제 지급·약관 데이터 연결 후 공백의 범위와 우선순위가 조정될 수 있습니다.'
