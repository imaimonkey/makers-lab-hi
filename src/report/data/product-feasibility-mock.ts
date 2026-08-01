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

/**
 * 전기차 지하주차장 화재 프로토타입의 기준별 상세 근거입니다.
 * 상태와 분리해 표시하며, 실제 API가 연결되면 같은 필드로 교체할 수 있습니다.
 */
export const FEASIBILITY_CRITERION_DETAILS = {
  insurable_interest: {
    aiSummary: '보장 대상과 경제적 손해를 부담하는 주체를 구분할 수 있어 피보험이익이 성립하는 구조입니다.',
    rationale: ['인접 차량 소유자는 차량 손상에 대한 경제적 이해관계가 있습니다.', '건물·주차장 소유자 또는 관리자는 시설 손상에 대한 경제적 이해관계가 있습니다.', '계약자·피보험자·보험목적과 직접 재산손해를 약관에 특정할 수 있습니다.'],
    materials: ['전기차화재안심보험 상품자료', '화재보험 및 배상책임보험 약관', '인접 차량·시설 손해 시나리오'],
    assumptions: ['계약 대상은 기업·법인 또는 시설 운영주체입니다.', '보장 대상은 직접 재산손해로 한정합니다.'],
    limitations: ['실제 계약 구조에 따라 계약자와 피보험자의 범위는 조정이 필요합니다.'],
    reviewerChecks: ['계약자와 피보험자 역할 확정', '시설 소유자·관리자·입주자 관계 확인'],
  },
  fortuity: {
    aiSummary: '화재 발생 여부와 시점을 사전에 확정하기 어렵고, 고의 사고를 별도 통제할 수 있어 우연성이 인정됩니다.',
    rationale: ['화재 발생 시점과 확산 범위를 사전에 예측하기 어렵습니다.', '배터리 결함, 충전 과정, 외부 충격 등 다양한 원인이 존재합니다.', '소방서·경찰서 사고확인 자료로 사고 발생 여부를 확인할 수 있습니다.'],
    materials: ['전기차 화재 사고자료', '화재사고 사실확인원', '기존 화재보험 면책구조'],
    assumptions: ['정상적인 차량 사용과 충전 상태를 전제로 합니다.', '고의행위와 불법 개조는 보장 대상에서 제외합니다.'],
    limitations: ['화재 원인이 장기간 불명확한 사고가 존재할 수 있습니다.'],
    reviewerChecks: ['고의사고 판별 기준', '불법 개조와 관리 위반의 면책 범위'],
  },
  gambling_like_structure: {
    aiSummary: '실제 발생한 직접 재산손해를 기준으로 지급하고 중복보상을 조정할 수 있어 실손보상 원칙을 충족합니다.',
    rationale: ['견적서·영수증·손해사정 자료로 실제 손해액을 확인할 수 있습니다.', '보험가입금액·보상한도 내 지급과 자기부담금 설정이 가능합니다.', '자동차보험·화재보험 등에서 지급받은 금액을 조정할 수 있습니다.'],
    materials: ['보험금 청구서류 기준', '중복보상 조정 조항', '보상한도 및 자기부담금 조항'],
    assumptions: ['보험금은 실제 손해를 초과하지 않는 범위에서 지급합니다.', '기존 보험금은 지급 순서에 따라 공제합니다.'],
    limitations: ['기존 보험의 지급 순서와 선보상 범위는 실무 확정이 필요합니다.'],
    reviewerChecks: ['중복보험 지급 순서', '자기부담금과 보상한도'],
  },
  moral_hazard_control: {
    aiSummary: '사고 확인서류, 면책기준, 중복보상 조정과 구상 절차로 고의·보험사기 위험을 통제할 수 있습니다.',
    rationale: ['소방서·경찰서 화재사고 확인자료를 요구할 수 있습니다.', '손해액 증빙자료와 타 보험 가입내역을 확인할 수 있습니다.', '허위·과장 청구, 불법 구조변경, 미인증 충전설비 사용을 심사 기준으로 구분할 수 있습니다.'],
    materials: ['소방·경찰 사고 확인자료', '손해액 증빙 및 타 보험 가입내역', '기존 약관의 면책·구상 조항'],
    assumptions: ['고의 또는 허위 청구는 보상 대상에서 제외합니다.', '책임자에 대한 사후 구상 절차를 적용할 수 있습니다.'],
    limitations: ['사고조사 결과와 보험사기 판단에 따라 지급 시점이 달라질 수 있습니다.'],
    reviewerChecks: ['고의사고 조사 기준', '미인증 충전설비 면책 기준', '사고조사와 보험사기 탐지 절차'],
  },
  coverage_gap: {
    aiSummary: '기존 보험이 일부 손해를 보장하지만 책임 미확정·한도 초과 손해에는 보장 공백이 존재합니다.',
    rationale: ['자동차보험은 법률상 배상책임 성립이 필요한 경우가 있습니다.', '자차 미가입 차량은 직접 손해 보장이 어려울 수 있습니다.', '화재보험은 보험목적과 가입금액에 따라 범위가 제한됩니다.', '제조사 책임 확정 전 보상이 지연될 수 있습니다.'],
    materials: ['자동차보험·화재보험 약관', '시설소유자배상책임보험·생산물배상책임보험', '전기차화재안심보험 상품자료', '보장 공백 비교표'],
    assumptions: ['기존 보험을 우선 적용한 뒤 남는 직접손해를 보완합니다.', '중복 지급액은 신규 보장에서 조정합니다.'],
    limitations: ['기존 보장과 신규 보장의 최종 범위는 실제 약관 비교가 필요합니다.'],
    reviewerChecks: ['기존 보장과 신규 보장 영역 비교', '중복보상 조정 순서', '보장 공백의 최종 범위'],
  },
  actual_market_demand: {
    aiSummary: '전기차·충전시설 확대, 국내 출시 현황·신규성 검토와 잠재 계약 규모를 고려하면 시장 수요가 존재하는 것으로 판단됩니다.',
    rationale: ['전기차와 충전시설이 증가하고 있습니다.', '지하주차장 화재에 대한 사회적 관심과 보험 수요가 커지고 있습니다.', '동일 위험을 다루는 실제 보험상품 사례가 확인됩니다.', '공동주택·업무시설·충전사업자 등 잠재 계약자가 존재합니다.'],
    materials: ['시장성 A · 84점', '기준 TAM 약 121억 원/년, 추정 범위 65억~191억 원', '전기차·충전시설 시장자료와 유사 보험상품 자료'],
    assumptions: ['의무관리대상 공동주택 17,189개를 기본 시장으로 사용합니다.', '시설 단위 연간 계약을 가정합니다.'],
    limitations: ['실제 가입 의향과 계약 전환율 자료는 아직 확보되지 않았습니다.'],
    reviewerChecks: ['잠재 고객 인터뷰', '예상 계약 수', '지불 의향과 판매 채널'],
  },
  pml_accumulation: {
    aiSummary: '대형 지하주차장 화재 시나리오로 최대 손해 범위를 산출할 수 있고, 보상한도와 재보험 구조를 적용할 수 있습니다.',
    rationale: ['전소·부분 피해 차량과 시설비를 분리해 계산할 수 있습니다.', '보수적·기준·확대 시나리오별 손해 범위를 산출할 수 있습니다.', '사고당 보상한도와 누적 보상한도, 재보험 조건을 적용할 수 있습니다.'],
    materials: ['보수적 시나리오 약 35억 원', '기준 시나리오 약 53억 원', '확대 시나리오 약 79억 원', '기준: 전소 87대·부분 피해 783대·시설·긴급대응 10억 원'],
    assumptions: ['전소 차량 87대 × 4,000만 원을 기준으로 합니다.', '부분·그을림 피해 차량 783대 × 100만 원과 시설·긴급대응 비용 10억 원을 합산합니다.'],
    limitations: ['실제 차량가액과 시설 복구비에 따라 결과가 변동합니다.'],
    reviewerChecks: ['인수 한도', '자기부담금', '재보험 필요성', '시설 규모별 PML 구간'],
  },
  loss_verifiability: {
    aiSummary: '사고 발생과 손해 규모를 공적 문서와 객관적인 손해자료로 확인할 수 있습니다.',
    rationale: ['소방서·경찰서 화재사고 사실확인원으로 사고를 확인할 수 있습니다.', '차량 수리·교체 견적서와 시설 복구비 견적서를 사용할 수 있습니다.', '손해사정 보고서와 기존 보험 지급내역을 함께 확인할 수 있습니다.', '차량가액과 감가 기준을 적용할 수 있습니다.'],
    materials: ['소방·경찰 화재사고 사실확인원', '차량 수리·교체 견적서', '시설 복구비 견적서', '손해사정 보고서와 기존 보험 지급내역'],
    assumptions: ['전손·부분손해 기준과 감가상각 기준을 적용합니다.'],
    limitations: ['긴급대응비용의 인정 범위는 사고별 증빙 수준에 따라 달라질 수 있습니다.'],
    reviewerChecks: ['전손·부분손해 판단 기준', '감가상각 기준', '긴급대응비용 인정 범위'],
  },
  risk_pooling: {
    aiSummary: '시설 단위로 다수 계약을 구성하고 지역·규모별 인수한도를 적용해 위험을 분산할 수 있습니다.',
    rationale: ['전국 공동주택과 업무시설로 계약 대상을 분산할 수 있습니다.', '시설 규모와 충전기 수에 따라 위험군을 구분할 수 있습니다.', '지역별 포트폴리오 한도와 고위험 시설 인수 제한을 설정할 수 있습니다.'],
    materials: ['기본 시장 대상 시설 17,189개', '시설당 위험 발생 빈도 약 0.08~0.12%/년', '시설 규모·충전설비·지역별 노출 시나리오'],
    assumptions: ['시설당 계약 단위로 위험을 묶고 지역별 누적한도를 적용합니다.'],
    limitations: ['동일 지역과 동일 시공 방식에 따른 누적위험은 별도 관리가 필요합니다.'],
    reviewerChecks: ['지역별 누적한도', '시설별 최대 인수한도', '고위험군 분류기준'],
  },
  wording_clarity: {
    aiSummary: '보장 대상, 지급요건, 보장·비보장 손해와 중복보상 순서를 약관 문장으로 구체화할 수 있습니다.',
    rationale: ['보험기간과 대상 장소를 명시할 수 있습니다.', '전기차 화재로 인한 직접 재산손해를 정의할 수 있습니다.', '사고확인자료, 보상한도·자기부담금과 기존 보험 공제 순서를 적을 수 있습니다.', '고의·간접손해 등 면책 후보를 구분할 수 있습니다.'],
    materials: ['기존 화재보험·배상책임보험 약관', '선택 보장 항목별 지급요건 mock 초안', '핵심 보상조항 및 보장·제외 범위 초안'],
    assumptions: ['발화 차량 미확정 상황의 지급기준과 선보상·구상 구조를 별도 조항으로 정합니다.'],
    limitations: ['법무·준법 검토 전에는 최종 약관 효력을 확정할 수 없습니다.'],
    reviewerChecks: ['발화 차량 미확정 시 지급기준', '기존 보험 지급 전 선보상 여부', '간접손해의 보장 범위'],
  },
  liability_clarity: {
    aiSummary: '사고 관련 책임자를 유형별로 구분하고 책임 확정 전 선보상과 사후 구상 구조를 적용할 수 있습니다.',
    rationale: ['발화 차량 소유자·운전자, 제조사·수입사, 충전시설 소유자·관리자를 구분할 수 있습니다.', '건물·주차장 시설관리자와 기타 법률상 배상책임자를 분리할 수 있습니다.', '책임이 즉시 확정되지 않아도 피해자 선보상 후 구상 구조를 적용할 수 있습니다.'],
    materials: ['화재 원인·책임주체 시나리오', '시설소유자배상책임보험과 생산물배상책임보험 자료', '선보상·구상 관련 기존 약관 구조'],
    assumptions: ['책임비율 확정 전에는 약정된 지급요건에 따라 선보상하고 사후 구상합니다.'],
    limitations: ['복합 원인 사고는 책임비율 확정에 시간이 걸릴 수 있습니다.'],
    reviewerChecks: ['선보상 요건', '구상권 행사 범위', '책임비율 분쟁 처리'],
  },
  pricing_data_readiness: {
    aiSummary: '공개 통계·사고자료·시설정보·상품자료로 위험을 추적하고 사고 빈도와 손해액을 1차 추정할 수 있습니다.',
    rationale: ['전기차 등록·충전시설·화재 사고 통계와 시설 현황을 확보할 수 있습니다.', '보험상품·약관과 공개 사고 피해 규모를 함께 활용할 수 있습니다.', '시장성 A · 84점, TAM 65억~191억 원, 빈도 0.08~0.12%/년, PML 35억~79억 원을 산출했습니다.'],
    materials: ['전기차 등록 통계와 충전시설 현황', '전기차 화재 사고 통계 및 소방·경찰 자료', '시장성·TAM·빈도·PML 산출 결과', '보험상품·약관과 공개 사고 피해 규모'],
    assumptions: ['공개자료와 시나리오 계산을 이용한 1차 추정치입니다.', '내부 계약·보험금·보험료 자료가 연결되면 결과를 보정합니다.'],
    limitations: ['내부 계약 데이터, 실제 지급보험금, 보험료율·손해율 자료는 아직 확보되지 않았습니다.'],
    reviewerChecks: ['내부 사고·보험금 데이터 연계', '계약별 노출량 확보', '시설 위험등급 데이터 확보'],
  },
} as const

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
    title: '국내 출시 현황 및 차별화 가능성',
    status: 'additional_check',
    items: ['국내 유사상품·특약의 보장 범위 확인', '겹치는 보장과 남는 보장 공백 비교', '차별화 요소와 공식 출처 확인'],
    pendingItems: ['현재 제안과 기존 상품의 보장 범위 비교 필요'],
    summary: '국내 출시 현황과 차별화 가능성을 확인하는 검토 기준',
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
  damageBasis: {
    totalLossVehicles: 87,
    partialDamageVehicles: 783,
    categories: ['전소 차량 손해', '부분·그을림 피해 차량 손해', '시설 복구·긴급대응 비용'],
  },
  assumptions: [
    '주차장 화재 1건에서 최대 동시 피해 차량 수를 전소 87대·부분 피해 783대로 가정',
    '차량당 손해액과 시설 복구·긴급대응 비용을 보수적·기준·확대 시나리오로 적용',
    '실제 손해액이 아닌 상품화 종합평가의 공개자료 기반 1차 추정값',
  ],
  references: ['상품화 종합평가 PML 산정표', '공개 사고사례 기반 시나리오', '시설 복구·긴급대응 비용 적용 가정'],
  scenarios: [
    {
      id: 'low' as FeasibilityPmlScenarioId,
      label: '보수적',
      result: 3_500_000_000,
      calculation: '전소 차량 87대 × 3,000만 원 + 부분 피해 783대 × 50만 원 + 시설비 5억 원',
      breakdown: {
        totalLossVehicleDamage: 2_610_000_000,
        partialDamageVehicleDamage: 391_500_000,
        facilityEmergencyCost: 500_000_000,
      },
    },
    {
      id: 'base' as FeasibilityPmlScenarioId,
      label: '기준',
      result: 5_300_000_000,
      calculation: '전소 차량 87대 × 4,000만 원 + 부분 피해 783대 × 100만 원 + 시설비 10억 원',
      breakdown: {
        totalLossVehicleDamage: 3_480_000_000,
        partialDamageVehicleDamage: 783_000_000,
        facilityEmergencyCost: 1_000_000_000,
      },
    },
    {
      id: 'high' as FeasibilityPmlScenarioId,
      label: '확대',
      result: 7_900_000_000,
      calculation: '전소 차량 87대 × 5,000만 원 + 부분 피해 783대 × 200만 원 + 시설비 20억 원',
      breakdown: {
        totalLossVehicleDamage: 4_350_000_000,
        partialDamageVehicleDamage: 1_566_000_000,
        facilityEmergencyCost: 2_000_000_000,
      },
    },
  ],
  basis: ['시설 규모', '최대 동시 피해 차량', '시설 복구·긴급대응 비용'],
} as const

export const FEASIBILITY_FOLLOW_UP_TASKS = [
  { id: 'demand', title: '실제 수요 확인', items: ['실제 가입 의향 확인', '잠재 계약 수 추정'], output: '수요조사 결과' },
  { id: 'coverage-gap', title: '보장 공백 확정', items: ['기존 보험과 보장 범위 비교', '신규 보장 공백 확정'], output: '보장 비교표' },
  { id: 'pricing-loss-ratio', title: '보험료·손해율 검토', items: ['사고 빈도와 평균 손해액 검증', '보험료와 예상 손해율 산출'], output: '보험료·손해율 시뮬레이션' },
  { id: 'underwriting', title: '인수 조건 검토', items: ['PML과 보상한도 검토', '인수조건과 재보험 필요성 검토'], output: '인수조건 검토안' },
  { id: 'claims-standard', title: '보상 기준 확정', items: ['사고 인정 기준 확인', '중복보상 및 구상 절차 검토'], output: '보상·구상 기준안' },
] as const
