/**
 * 상품화 종합평가 화면에서만 사용하는 프로토타입 표시 데이터입니다.
 * 실제 평가 기준과 수치는 report.productFeasibility.assessment에서 읽습니다.
 */
export const FEASIBILITY_PRIORITY_DEFINITIONS = [
  {
    criterionId: 'coverage_gap',
    title: '기존 보험·타사 상품 중복 및 보장 공백',
    owner: '상품개발',
    fallbackSummary: '기존 보험과 일부 중복될 수 있으나 책임 확정 전 손해와 보상한도 초과손해의 보장 공백을 확인해야 합니다.',
    action: '기존 보험과 신규 보장의 중복 범위를 구분하고 보완할 보장 범위를 확정합니다.',
    output: '기존 보험 비교표 및 신규 특약 보장 범위안',
  },
  {
    criterionId: 'moral_hazard_control',
    title: '고의·도덕적 해이 통제 기준',
    owner: '보상·법무',
    fallbackSummary: '발화 원인과 고의사고 여부를 구분할 객관적인 조사자료와 지급 제외 기준이 필요합니다.',
    action: '발화 원인 조사자료와 고의사고·면책 기준을 정리합니다.',
    output: '사고 인정 및 면책 기준안',
  },
  {
    criterionId: 'pml_accumulation',
    title: '최대가능손해와 인수 한도',
    owner: '계리·인수 / 재보험',
    fallbackSummary: '다수 차량과 시설에 피해가 동시에 발생할 수 있으므로 PML을 기준으로 보상한도와 재보험 필요성을 검토해야 합니다.',
    action: '주차장 규모별 최대 동시 피해와 시설 복구비를 반영한 PML을 산출합니다.',
    output: 'PML 추정표 및 보상한도안',
  },
] as const

export const FEASIBILITY_EXPECTED_OUTPUTS: Record<string, string> = {
  actual_market_demand: '잠재 계약자 목록 및 수요 확인 결과',
  risk_pooling: '위험군 분류 및 분산 가능성 검토표',
  fortuity: '우연성·사고 인정 기준 검토 메모',
  insurable_interest: '계약자·피보험자·피해자 역할 정리표',
  moral_hazard_control: '사고 인정 및 면책 기준안',
  gambling_like_structure: '보험 목적·손해 보전 구조 검토 의견',
  loss_verifiability: '손해 확인·산정 기준표',
  pml_accumulation: 'PML 추정표 및 보상한도안',
  liability_clarity: '책임주체 및 구상관계 검토표',
  wording_clarity: '약관 검토 의견 및 초안 수정본',
  pricing_data_readiness: '요율 검토용 데이터 목록',
  coverage_gap: '기존 보험 비교표 및 신규 보장 범위안',
}

export const FEASIBILITY_PROTOTYPE_PROFILE = {
  insuranceTarget: '기업',
  insuranceArea: '기업성 보험',
  insuranceType: '일반보험',
  developmentForm: '기존 상품의 특약 후보',
  linkedInsurance: '자동차보험·화재보험·배상책임보험',
} as const

/** 상품화 종합평가 상단과 정량지표에서만 사용하는 화면용 mock 설정입니다. */
export const FEASIBILITY_JUDGMENT_CARDS = [
  {
    id: 'insurability',
    title: '보험상품 성립 요건',
    status: 'pass',
    items: ['피보험이익 확인 가능', '사고의 우연성 인정 가능', '실제 손해 범위 내 보상 구조 가능'],
    summary: '필수 기준 3/3 충족',
  },
  {
    id: 'commercialization-evidence',
    title: '실제 상품화 사례',
    status: 'additional_check',
    items: ['동일 위험을 보장하는 실제 보험상품 확인', '보험금 지급 및 손해 산정 구조 확인', '선보상·구상 및 중복보상 조정 사례 확인'],
    pendingItems: ['현재 제안과 기존 상품의 보장 범위 비교 필요'],
    summary: '상품화 가능성을 뒷받침하는 검증 사례',
  },
  {
    id: 'quantitative-underwriting',
    title: '정량·인수 조건',
    status: 'needs_review',
    pendingItems: ['최대가능손해(PML) 검증 필요', '실제 계약 수요 및 가입 의향 확인 필요', '보험료·손해율 산출을 위한 내부자료 보완 필요', '보상한도와 재보험 조건 검토 필요'],
    summary: '정량 근거 보완 후 최종 판단',
  },
] as const

export const FEASIBILITY_QUANTITATIVE_MOCK = [
  {
    id: 'marketability',
    title: '시장성',
    value: 'A · 78점',
    grade: 'A',
    items: ['전기차·충전시설 시장 확대', '실제 보험상품 사례 확인', '기업·시설의 잠재 보장 수요'],
    pendingItems: ['실제 가입 의향과 계약 규모 확인 필요'],
    formula: '프로젝트 내부 평가모형 · 실제 수요조사 후 보정',
    confidence: '보통',
  },
  {
    id: 'data-readiness',
    title: '데이터 준비도',
    value: 'B · 60점',
    grade: 'B',
    items: ['상품·약관 자료 확보', '전기차·충전시설 통계 확보', '화재 사고자료 일부 확보'],
    pendingItems: ['사고별 실제 손해액 부족', '내부 계약·보험금·보험료 데이터 미확보'],
    formula: '확보 자료의 범위와 손해액 연결 수준을 기준으로 한 mock 평가',
    confidence: '보통',
  },
] as const

export type FeasibilityPmlScenarioId = 'low' | 'base' | 'high'

/** 상품화 종합평가와 상품개발 제안이 함께 참조하는 PML 프로토타입 산출값입니다. */
export const FEASIBILITY_PML_DATA = {
  unit: 'KRW',
  source: '상품화 종합평가',
  confidence: '보통',
  baseScenario: 'base' as FeasibilityPmlScenarioId,
  range: { low: 3_500_000_000, high: 7_900_000_000 },
  scenarios: [
    {
      id: 'low' as FeasibilityPmlScenarioId,
      label: '보수적',
      result: 3_500_000_000,
      calculation: '전소 차량 87대 × 3,000만 원 + 부분 피해 783대 × 50만 원 + 시설비 5억 원',
    },
    {
      id: 'base' as FeasibilityPmlScenarioId,
      label: '기준',
      result: 5_300_000_000,
      calculation: '전소 차량 87대 × 4,000만 원 + 부분 피해 783대 × 100만 원 + 시설비 10억 원',
    },
    {
      id: 'high' as FeasibilityPmlScenarioId,
      label: '확대',
      result: 7_900_000_000,
      calculation: '전소 차량 87대 × 5,000만 원 + 부분 피해 783대 × 200만 원 + 시설비 20억 원',
    },
  ],
  basis: ['시설 규모', '최대 동시 피해 차량', '시설 복구·긴급대응 비용'],
} as const

export const FEASIBILITY_FOLLOW_UP_TASKS = [
  { id: 'sales', department: '영업부서', items: ['실제 가입 의향 확인', '잠재 계약 수 추정'], output: '수요조사 결과' },
  { id: 'product', department: '상품개발부서', items: ['기존 보험과 보장 범위 비교', '보장 공백 확정'], output: '보장 비교표' },
  { id: 'actuarial', department: '계리부서', items: ['사고 빈도와 평균 손해액 검증', '보험료와 예상 손해율 산출'], output: '보험료·손해율 시뮬레이션' },
  { id: 'underwriting', department: '언더라이팅부서', items: ['PML과 보상한도 검토', '인수조건과 재보험 필요성 검토'], output: '인수조건 검토안' },
  { id: 'claims-legal', department: '보상·법무부서', items: ['사고 인정 기준 확인', '중복보상과 구상 절차 검토'], output: '보상·구상 기준안' },
] as const
