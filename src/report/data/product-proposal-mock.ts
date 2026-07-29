import { FEASIBILITY_PML_DATA, type FeasibilityPmlScenarioId } from './product-feasibility-mock'

export type ProposalStatusTone = 'neutral' | 'success' | 'caution' | 'info' | 'danger' | 'muted'

export type ProposalPricingMetric = {
  id: string
  label: string
  value: string
  description: string
  basis: string
  requiredData: string
  tone: ProposalStatusTone
  isMock: boolean
}

export type ProposalRoleDefinition = {
  id: string
  label: string
  proposal: string
  status: string
  statusTone: ProposalStatusTone
  decision: string
}

export type ProposalClaimStep = {
  id: string
  label: string
  description: string
  owner: string
  materials: string[]
  highlighted?: boolean
}

export type ProposalCoverageItem = {
  id: string
  title: string
  coveredObject: string
  existingRelationship: string
  status: string
  decision: string
}

export type ProposalUnderwritingFactor = {
  id: string
  title: string
  status: string
  statusTone: ProposalStatusTone
  check: string
  impact: string
}

export type ProposalDepartmentAction = {
  id: string
  department: string
  actions: string[]
  materials: string
  output: string
  linkedTab?: 'feasibility' | 'coverage-gap' | 'wording' | 'evidence'
}

export type ProposalAlternative = {
  id: string
  title: string
  status: string
  statusTone: ProposalStatusTone
  advantage: string
  limitation: string
  requiredData: string
}

export const PROPOSAL_HERO_FACTS = [
  ['보험 대상', '기업·기관'],
  ['보험 영역', '기업성 보험'],
  ['보험 종목', '일반보험'],
  ['개발 형태', '기존 상품의 특약 우선 검토'],
  ['계약 형태', '단체계약형'],
  ['연계 보험', '자동차보험·화재보험·배상책임보험'],
  ['주요 계약자 후보', '주차시설 운영자·건물 소유자'],
  ['주요 보호 대상', '제3자 차량 소유자 및 시설 관계자'],
] as const

export const PROPOSAL_HERO_BULLETS = [
  { label: '가입 대상', text: '주차시설 운영자 또는 건물 소유자' },
  { label: '보장 대상', text: '제3자 차량과 주차장 시설의 직접손해' },
  { label: '핵심 역할', text: '기존 보험 적용 후 발생한 보장 공백 보완' },
] as const

export const PROPOSAL_RECOMMENDATION_REASONS = [
  {
    id: 'customer',
    title: '실제 계약자 후보가 명확함',
    description: '주차시설 운영자, 건물 소유자와 충전사업자 등 보험료를 부담하고 위험관리를 수행할 기업 고객을 설정할 수 있습니다.',
  },
  {
    id: 'gap',
    title: '기존 보험 적용 후 보장 공백이 존재함',
    description: '자동차보험·화재보험·배상책임보험으로 일부 손해는 보장 가능하지만, 책임 확정 전 손해·보상한도 초과손해와 일부 시설손해에는 보장 공백이 발생할 수 있습니다.',
  },
  {
    id: 'accumulation',
    title: '누적손해를 시설 단위로 관리할 수 있음',
    description: '다수 차량과 주차장 시설에 동시에 발생할 수 있는 손해를 주차장 단위로 평가하여 인수조건과 보상한도를 검토할 수 있습니다.',
  },
] as const

export const PROPOSAL_RECOMMENDATION_DETAILS = [
  '대상 차량 명부를 통해 보험대상과 노출 규모를 식별하고 관리하는 구조입니다.',
  '기존 보험의 적용 여부와 보상액을 확인한 뒤 남는 직접 재산손해를 보완하는 방향입니다.',
  '제조·수입사, 협회·기관 등 단체계약 후보와 위험관리 책임을 연결할 수 있습니다.',
  '책임 확정 전 선지급 및 사후 구상 방식은 기존 보험의 지급 순서와 구상 기준 확인 후 보상·법무 부서가 결정해야 합니다.',
] as const

export const PROPOSAL_RECOMMENDATION_DETAIL_BLOCKS = [
  { id: 'basis', title: '판단 근거', items: ['대상 차량 명부로 보험대상과 노출 규모를 식별할 수 있습니다.', '기존 보험 지급 후 남는 직접 재산손해를 보완하는 구조입니다.'] },
  { id: 'coverage-gap', title: '연결된 보장 공백', items: ['책임 미확정 손해', '대물배상·화재보험 한도 초과손해', '보험 목적에 포함되지 않은 시설손해'] },
  { id: 'assumptions', title: '적용 가정', items: ['시설 단위 단체계약', '기존 보험 지급액 차감 후 잔여손해 보장', 'PML과 시설 위험요인에 따른 한도·자기부담금 조정'] },
  { id: 'confidence', title: '분석 신뢰도', items: ['보통 이하', '프로토타입 시나리오 기반 1차 추정', '실제 데이터 연결 시 자동 보정'] },
] as const

export const PROPOSAL_PRICING_METRICS: ProposalPricingMetric[] = [
  {
    id: 'premium',
    label: '예상 보험료 수준',
    value: '1차 산출 필요',
    description: '사고 빈도, 평균 손해액, 시설 규모와 보상한도 확정 후 산출해야 합니다.',
    basis: '현재 수치 없음 · 프로토타입 검토값',
    requiredData: '시설 규모, 계약 규모, 사고 빈도, 평균 손해액',
    tone: 'muted',
    isMock: true,
  },
  {
    id: 'loss-ratio',
    label: '예상 연간 손해율',
    value: '공개자료 기반 러프한 추정 필요',
    description: '유사 담보의 손해율과 사고 빈도·평균 손해액 자료 확인이 필요합니다.',
    basis: '내부 손해 데이터 미연결 · 프로토타입 검토값',
    requiredData: '유사 담보 손해율, 사고 빈도, 평균 손해액',
    tone: 'muted',
    isMock: true,
  },
  {
    id: 'pml',
    label: '최대가능손해(PML)',
    value: '시설 규모별 1차 추정 필요',
    description: '최대 동시 피해 차량 수, 시설 복구비와 소화·진압 비용을 포함해 산출해야 합니다.',
    basis: '금액 미산출 · 프로토타입 검토값',
    requiredData: '최대 동시 피해 차량 수, 시설 복구비, 소화·진압 비용',
    tone: 'muted',
    isMock: true,
  },
  {
    id: 'per-accident-limit',
    label: '사고당 보상한도',
    value: 'PML 산출 후 확정',
    description: '시설 단위 누적손해와 기존 보험의 보상한도를 함께 비교해야 합니다.',
    basis: '한도 미확정 · 프로토타입 검토값',
    requiredData: 'PML, 기존 보험 한도, 최대 동시 피해 시나리오',
    tone: 'info',
    isMock: true,
  },
  {
    id: 'aggregate-limit',
    label: '계약기간 중 총 보상한도',
    value: '1차 설계 필요',
    description: '반복 사고와 계약기간 중 누적 위험을 반영하여 별도로 검토해야 합니다.',
    basis: '한도 미확정 · 프로토타입 검토값',
    requiredData: '계약기간, 반복 사고 가능성, 누적 위험 시나리오',
    tone: 'info',
    isMock: true,
  },
  {
    id: 'deductible',
    label: '자기부담금',
    value: '시설 위험도·방재 수준별 검토',
    description: '피해자 신속 보상 목적과 소액손해 관리의 균형을 고려해야 합니다.',
    basis: '조건 미확정 · 프로토타입 검토값',
    requiredData: '시설 위험도, 방재 수준, 손해 규모 분포',
    tone: 'info',
    isMock: true,
  },
  {
    id: 'reinsurance',
    label: '재보험 필요성',
    value: '대형 화재 및 누적손해 기준 추가 확인',
    description: '다수 차량과 시설 손해가 동시에 발생하는 시나리오를 기준으로 판단해야 합니다.',
    basis: '출재 여부 미확정 · 프로토타입 검토값',
    requiredData: 'PML, 손해 분포, 최대 누적손해 시나리오, 보유한도',
    tone: 'caution',
    isMock: true,
  },
  {
    id: 'confidence',
    label: '산출 신뢰도',
    value: '낮음',
    description: '공개자료 기반의 검토 단계이며 내부 계약·손해 데이터 확인 후 보정이 필요합니다.',
    basis: '공개자료·프로토타입 mock 기반',
    requiredData: '실제 계약·손해 데이터, 내부 요율 기초자료',
    tone: 'caution',
    isMock: true,
  },
]

export const PROPOSAL_ROLE_DEFINITIONS: ProposalRoleDefinition[] = [
  { id: 'policyholder', label: '보험계약자', proposal: '주차시설 운영자 또는 건물 소유자', status: '후보 확정 가능 · 실무 확정 필요', statusTone: 'info', decision: '실제 계약 권한과 보험료 부담 주체를 확정합니다.' },
  { id: 'insured', label: '피보험자', proposal: '시설 운영자 및 관리 책임자', status: '피보험자 범위 결정 필요', statusTone: 'info', decision: '피보험이익과 시설 관리 책임의 연결 범위를 결정합니다.' },
  { id: 'payer', label: '보험료 부담자', proposal: '보험계약자인 기업·기관', status: '우선 제안 가능', statusTone: 'neutral', decision: '보험료 부담과 계약자 역할의 일치 여부를 확인합니다.' },
  { id: 'beneficiary', label: '피해자·보험금 수령 대상', proposal: '인접 차량 소유자 등 손해를 입은 제3자', status: '제3자 직접청구 여부 검토', statusTone: 'caution', decision: '보험금 수령 방식과 직접청구 가능 여부를 검토합니다.' },
  { id: 'risk-manager', label: '위험관리 주체', proposal: '시설 운영자·건물 관리자·충전사업자', status: '각 주체의 책임 범위 결정 필요', statusTone: 'info', decision: '안전관리·점검 의무와 책임 분담 기준을 정합니다.' },
  { id: 'claimant', label: '청구 주체', proposal: '피보험자 또는 약관에서 인정한 피해자', status: '보험금 청구 방식 검토 필요', statusTone: 'info', decision: '사고 접수와 손해 입증에 필요한 청구 자료를 확정합니다.' },
]

export const PROPOSAL_CLAIM_FLOW: ProposalClaimStep[] = [
  { id: 'notice', label: '사고 접수 및 보장 대상 확인', description: '사고 사실과 명부·보험증권상 보장 대상을 확인합니다.', owner: '보상·영업', materials: ['사고접수서', '소방서 확인자료', '보험증권 또는 대상 차량 명부'] },
  { id: 'existing', label: '기존 자동차보험·화재보험·배상책임보험의 적용 여부 확인', description: '기존 보험의 보장 범위, 지급 진행과 중복 여부를 확인합니다.', owner: '보상·법무', materials: ['기존 보험증권', '보상 진행내역', '관련 약관'] },
  { id: 'gap', label: '기존 보험 적용 후 보장 공백 산정', description: '기존 보험에서 보상되지 않은 직접손해와 초과손해를 산정합니다.', owner: '보상·손해사정', materials: ['손해사정 결과', '기존 보험 지급액', '손해액 증빙'], highlighted: true },
  { id: 'endorsement', label: '신규 특약의 보장 범위와 지급금액 산정', description: '특약상 지급요건과 보상한도에 따라 지급대상과 금액을 검토합니다.', owner: '상품개발·보상', materials: ['약관상 지급요건', '보상한도', '손해액 산정자료'] },
  { id: 'payment', label: '보험금 지급', description: '확정된 지급요건과 지급 절차에 따라 보험금을 지급합니다.', owner: '보상', materials: ['보험금 청구서', '손해 입증자료', '지급 승인 기록'] },
  { id: 'recovery', label: '책임주체 확정 후 구상 여부 검토', description: '책임 조사자료를 바탕으로 구상 가능성과 범위를 검토합니다.', owner: '보상·법무', materials: ['책임 조사자료', '제조사·시설관리자 책임 판단', '구상 관련 자료'] },
]

export const PROPOSAL_COVERAGE_ITEMS: ProposalCoverageItem[] = [
  { id: 'third-party-vehicle', title: '제3자 차량의 직접 재산손해', coveredObject: '인접 차량 등 화재로 손상된 제3자 차량', existingRelationship: '자동차보험 대물배상 및 자기차량손해와 일부 중복 가능', status: '보완 후 제안 가능', decision: '책임 미확정 시 지급 여부와 기존 보험 적용 순서' },
  { id: 'facility-fire', title: '건물·주차장 시설의 직접 화재손해', coveredObject: '건물·주차장·충전설비의 직접 화재손해', existingRelationship: '건물 화재보험과 보험 목적·한도 중복 여부 확인', status: '조건부 검토', decision: '충전설비 포함 범위와 보험가입금액·보상한도' },
  { id: 'firefighting-cost', title: '소화·진압 과정에서 발생한 필요하고 합리적인 비용', coveredObject: '화재 확산 방지를 위한 필요하고 합리적인 소화·진압 비용', existingRelationship: '화재보험·시설관리 비용 보장과 적용 관계 확인', status: '추가 확인 필요', decision: '비용의 인정 범위와 증빙 기준' },
  { id: 'remaining-direct-loss', title: '기존 보험 적용 후 보상되지 않은 직접손해', coveredObject: '기존 보험의 지급 후 남은 약정 대상 직접 재산손해', existingRelationship: '자동차·화재·배상책임보험의 지급 순서와 구상관계 확인', status: '핵심 보완 후보', decision: '중복보상 방지와 잔여손해 산정 기준' },
]

export const PROPOSAL_EXCLUDED_ITEMS = [
  { title: '발화 차량 자체의 손해', note: '자기차량손해 등 별도 담보와의 관계를 확인해야 합니다.' },
  { title: '신체손해', note: '신체손해 보장 여부는 별도 상품·담보로 검토합니다.' },
  { title: '휴차료·영업중단 등 간접손해', note: '직접 재산손해와 분리하여 보장 필요성을 검토합니다.' },
  { title: '고의 사고', note: '보험의 우연성과 면책 기준에 따라 제외 검토합니다.' },
  { title: '기존 보험에서 이미 보상된 손해', note: '중복보상 방지를 위해 보장 대상에서 제외합니다.' },
  { title: '보험 목적에 포함되지 않은 시설·설비 손해', note: '보험 목적과 가입금액 확인 후 별도 결정합니다.' },
] as const

export const PROPOSAL_UNDERWRITING_FACTORS: ProposalUnderwritingFactor[] = [
  { id: 'parking-scale', title: '주차장 규모', status: '추가자료 필요', statusTone: 'info', check: '주차면 수, 층수, 지하 구조, 최대 수용 차량', impact: '규모가 클수록 PML과 보상한도 증가 가능' },
  { id: 'charger-density', title: '충전기 수와 밀집도', status: '조건부 인수', statusTone: 'caution', check: '완속·급속 충전기 수, 배치, 충전 구역 밀집도', impact: '충전기 밀도가 높을수록 위험도 가중 검토' },
  { id: 'fire-protection', title: '방재설비', status: '조건부 인수', statusTone: 'caution', check: '스프링클러, 감지·경보장치, 질식소화포, 배연설비', impact: '우수한 방재설비에는 보험료 할인 또는 자기부담금 완화 검토' },
  { id: 'vehicle-battery', title: '차량·배터리 관리정보', status: '추가자료 필요', statusTone: 'info', check: '대상 차량 명부, 충전 기록, 배터리 이상 이력', impact: '정보 확보 수준에 따라 인수 가능 여부와 조건 결정' },
  { id: 'incident-history', title: '사고·고장 이력', status: '인수 보류', statusTone: 'danger', check: '화재, 과열, 충전기 고장, 안전점검 이력', impact: '사고 빈도에 따라 보험료와 자기부담금 조정 검토' },
  { id: 'accumulation', title: '최대 동시 피해 규모', status: '추가자료 필요', statusTone: 'info', check: '화재 확산 가능 구역과 동시 피해 차량 수', impact: 'PML, 사고당 보상한도와 재보험 필요성 판단' },
  { id: 'management', title: '시설 관리 수준', status: '조건부 인수', statusTone: 'caution', check: '정기점검, 비상대응 매뉴얼, 관리 인력', impact: '관리 수준에 따라 인수 조건 또는 할인·할증 검토' },
]

export const PROPOSAL_DEPARTMENT_ACTIONS: ProposalDepartmentAction[] = [
  { id: 'sales', department: '영업부서', actions: ['주차시설 운영자, 건물 소유자와 충전사업자의 가입 의향 확인', '예상 계약 규모와 보험료 수용 수준 조사', '우선 제안 고객군 선정'], materials: '잠재 계약자 목록, 시설 유형별 현황, 수요 인터뷰', output: '잠재 고객 목록 및 수요 검증 결과', linkedTab: 'evidence' },
  { id: 'product', department: '상품개발', actions: ['기존 보험과 신규 담보의 중복 범위 구분', '특약형·독립 상품 중 개발 형태 확정', '보장 대상과 제외 범위 결정'], materials: '자동차보험·화재보험·배상책임보험 약관과 기존 특약', output: '상품 개발안 및 신규 보장 범위안', linkedTab: 'wording' },
  { id: 'actuarial', department: '계리·인수', actions: ['사고 빈도와 평균 손해액 추정', '최대가능손해(PML) 산출', '예상 보험료·손해율·보상한도·자기부담금 제안', '시설 위험도별 인수조건 검토'], materials: '사고 통계, 시설 규모, 최대 동시 피해 차량 수, 시설 복구비', output: '요율 가정안, PML 추정표 및 인수조건안', linkedTab: 'feasibility' },
  { id: 'claims-legal', department: '보상·법무', actions: ['발화 차량 인정 기준 결정', '기존 보험과 신규 특약의 지급 순서 검토', '책임 확정 전 선지급 및 사후 구상 방식 검토', '면책 및 보상 제외 기준 확정'], materials: '사고 조사 기준, 기존 보험 보상사례, 관련 약관과 판례', output: '사고 인정·보험금 지급·구상 기준안', linkedTab: 'wording' },
  { id: 'reinsurance', department: '재보험', actions: ['대형 화재 및 다수 차량 누적손해 위험 검토', '회사 보유한도와 출재 필요성 검토'], materials: 'PML 결과, 손해 분포, 최대 누적손해 시나리오', output: '재보험 필요성 및 보유한도 검토안', linkedTab: 'feasibility' },
  { id: 'data-ai', department: '데이터·AI', actions: ['상품 제안에 활용된 출처와 산출 근거 정리', '누락된 내부 데이터 항목 식별', '실제 데이터 연동 후 가격·손해지표 재계산'], materials: '근거자료 목록, 내부 계약·손해 데이터, 데이터 정의서', output: '데이터 확보 목록 및 분석 업데이트 결과', linkedTab: 'evidence' },
]

export const PROPOSAL_EVIDENCE_CATEGORIES = [
  '보장 공백 분석 결과',
  '상품화 종합평가 결과',
  '기존 보험과의 중복관계',
  '공개 사고사례 및 시장자료',
  '약관화 검토 결과',
] as const

export const PROPOSAL_LIMITATIONS = [
  '실제 내부 계약 및 손해 데이터 미확보',
  '타사 비공개 기업성 상품·특약 확인 제한',
  '시설 규모별 실제 사고 빈도와 평균 손해액 미확보',
  '예상 보험료와 손해율 미산출',
  'PML 및 재보험 필요성 미확정',
] as const

export const PROPOSAL_REQUIRED_DATA = [
  '현대해상 기존 기업성 보험·특약',
  '실제 지급·손해사정 사례',
  '사고 빈도 및 평균 손해액',
  '시설 유형별 계약 규모',
  '보험료 수용 수준과 가입 의향',
  '재보험 보유한도 관련 자료',
] as const

export const PROPOSAL_ALTERNATIVES: ProposalAlternative[] = [
  { id: 'personal-endorsement', title: '개인 대상 특약', status: '후순위 검토', statusTone: 'info', advantage: '개별 차량 가입으로 판매 접점을 넓힐 수 있습니다.', limitation: '표준화된 위험률, 가계성 보험 규제와 판매 절차 추가 검토가 필요합니다.', requiredData: '개인 가입 수요, 표준 위험률, 판매·규제 검토자료' },
  { id: 'standalone', title: '독립 신상품', status: '장기 대안', statusTone: 'neutral', advantage: '보장 공백과 계약 구조를 독립된 상품으로 설계할 수 있습니다.', limitation: '실제 수요, 손해 데이터와 요율 산출 근거 확보가 필요합니다.', requiredData: '계약 수요, 사고·손해 데이터, 요율 기초자료' },
  { id: 'facility-liability', title: '시설 운영자 배상책임 확장형', status: '비교 대안', statusTone: 'caution', advantage: '시설 운영자와 관리 책임을 기존 배상책임 구조에 연결하기 쉽습니다.', limitation: '시설 관리상 법률상 책임이 성립하지 않는 사고의 보장 공백이 남을 수 있습니다.', requiredData: '시설 책임 기준, 사고 조사자료, 기존 배상책임 약관' },
]

export const PROPOSAL_RECOMMENDATION_DISPLAY = [
  {
    id: 'contract',
    title: '계약 대상이 명확함',
    bullets: ['가입 후보 · 주차시설 운영자·건물 소유자', '보험료 부담과 시설 위험관리를 하나의 계약에 연결'],
  },
  {
    id: 'coverage-gap',
    title: '기존 보험 적용 후 보장 공백 존재',
    bullets: ['자동차·화재·배상책임보험은 일부 손해만 적용', '책임 미확정·한도 초과·시설손해에 보장 공백 발생'],
  },
  {
    id: 'accumulation',
    title: '시설 단위 누적위험 관리 가능',
    bullets: ['다수 차량과 시설의 동시 피해 반영', '시설 위험도에 따라 한도·자기부담금 차등 적용'],
  },
] as const

export const PROPOSAL_CONTRACT_ROLE_SUMMARY = [
  { id: 'policyholder', title: '보험계약자', proposal: '주차시설 운영자 또는 건물 소유자', bullets: ['보험료 납부', '시설 위험관리 의무 부담'] },
  { id: 'insured', title: '피보험자', proposal: '시설 운영자 및 관리 책임자', bullets: ['약관상 책임 범위 내에서 보호'] },
  { id: 'beneficiary', title: '보험금 수령 대상', proposal: '손해를 입은 제3자 또는 피보험자', bullets: ['직접청구 적용 여부는 지급 구조에서 정의'], note: '기준 설정 · 제3자 직접청구 적용 여부' },
  { id: 'claimant', title: '청구 주체', proposal: '피보험자 또는 약관에서 인정한 피해자', bullets: ['사고자료와 손해증빙을 기준으로 청구'] },
] as const

export const PROPOSAL_CLAIM_FLOW_DISPLAY = [
  { id: 'incident', label: '사고 및 보장 대상 확인', bullets: ['화재 발생 사실', '보험증권상 시설·대상 확인'] },
  { id: 'existing-insurance', label: '기존 보험 지급액 확인', bullets: ['자동차·화재·배상책임보험 적용', '실제 지급액과 중복 범위 확인'] },
  { id: 'coverage-gap', label: '보장 공백 산정', marker: '핵심 산정 단계', bullets: ['미보상 직접손해 계산', '한도 초과와 제외 손해 구분'] },
  { id: 'new-coverage', label: '신규 담보 지급액 산정', bullets: ['지급요건 적용', '보상한도·자기부담금 반영'] },
  { id: 'payment-recovery', label: '보험금 지급 및 구상 검토', bullets: ['보험금 지급', '책임 확정 후 구상 가능성 검토'] },
] as const

export const PROPOSAL_COVERAGE_SUMMARY = {
  basic: [
    { title: '제3자 차량 직접손해', description: '화재·열·연기에 따른 직접 재산손해' },
    { title: '건물·주차장 시설 직접손해', description: '주차장 구조물과 보험 목적에 포함된 시설·설비 손해' },
    { title: '소화·진압 비용', description: '피해 확산 방지를 위해 필요하고 합리적으로 지출한 비용' },
  ],
  optional: { title: '기존 보험 적용 후 잔여 직접손해', description: '기존 보험 지급액을 제외한 약정 대상 직접손해' },
  excluded: ['발화 차량 자체 손해', '신체손해', '휴차료·영업중단 등 간접손해', '고의 사고와 이미 보상된 손해'],
} as const

export type ProposalPricingScenarioInput = {
  id: FeasibilityPmlScenarioId
  label: 'Low' | 'Base' | 'High'
  pmlScenarioId: FeasibilityPmlScenarioId
  annualEventProbability: number
  averageSeverityRateOfPml: number
  tailRiskLoad: number
  targetLossRatio: number
  expenseLoad: number
  uncertaintyLoad: number
  deductibleRate: number
  proposedLimitRateOfPml: number
  aggregateLimitRate: number
  retentionLimit: number
  reinsuranceCostRate: number
}

export type ProposalPricingScenarioOutput = {
  id: FeasibilityPmlScenarioId
  label: 'Low' | 'Base' | 'High'
  pml: number
  ordinaryExpectedLoss: number
  tailRiskAmount: number
  expectedAnnualLoss: number
  reinsuranceCost: number
  proposedPremium: number
  lossRatio: number
  proposedLimit: number
  aggregateLimit: number
  deductible: number
  reinsuranceDecision: '불필요' | '검토' | '권고'
  formula: string
  assumptions: string[]
  confidence: '낮음' | '보통'
  source: string
  isMock: boolean
}

/** 상품화 종합평가 PML을 입력값으로 사용하는 명시적 프로토타입 시나리오입니다. */
export const PROPOSAL_PRICING_SCENARIO_INPUTS: ProposalPricingScenarioInput[] = [
  { id: 'low', label: 'Low', pmlScenarioId: 'low', annualEventProbability: 0.0008, averageSeverityRateOfPml: 0.008, tailRiskLoad: 0.0000015, targetLossRatio: 0.65, expenseLoad: 0.12, uncertaintyLoad: 0.05, deductibleRate: 0.3, proposedLimitRateOfPml: 0.65, aggregateLimitRate: 1.5, retentionLimit: 4_000_000_000, reinsuranceCostRate: 0.000001 },
  { id: 'base', label: 'Base', pmlScenarioId: 'base', annualEventProbability: 0.001, averageSeverityRateOfPml: 0.012, tailRiskLoad: 0.0000025, targetLossRatio: 0.6, expenseLoad: 0.15, uncertaintyLoad: 0.08, deductibleRate: 0.35, proposedLimitRateOfPml: 0.75, aggregateLimitRate: 1.5, retentionLimit: 3_000_000_000, reinsuranceCostRate: 0.000002 },
  { id: 'high', label: 'High', pmlScenarioId: 'high', annualEventProbability: 0.0012, averageSeverityRateOfPml: 0.018, tailRiskLoad: 0.000004, targetLossRatio: 0.55, expenseLoad: 0.18, uncertaintyLoad: 0.12, deductibleRate: 0.4, proposedLimitRateOfPml: 0.85, aggregateLimitRate: 1.5, retentionLimit: 2_000_000_000, reinsuranceCostRate: 0.000003 },
]

const roundWon = (value: number): number => Math.round(value / 1_000) * 1_000

export const PROPOSAL_PRICING_SCENARIO_OUTPUTS: ProposalPricingScenarioOutput[] = PROPOSAL_PRICING_SCENARIO_INPUTS.map((input) => {
  const pmlScenario = FEASIBILITY_PML_DATA.scenarios.find((scenario) => scenario.id === input.pmlScenarioId) ?? FEASIBILITY_PML_DATA.scenarios[0]
  const ordinaryExpectedLoss = roundWon(pmlScenario.result * input.annualEventProbability * input.averageSeverityRateOfPml)
  const tailRiskAmount = roundWon(pmlScenario.result * input.tailRiskLoad)
  const expectedAnnualLoss = ordinaryExpectedLoss + tailRiskAmount
  const reinsuranceCost = roundWon(pmlScenario.result * input.reinsuranceCostRate)
  const proposedPremium = roundWon((expectedAnnualLoss / input.targetLossRatio) + reinsuranceCost + (expectedAnnualLoss * (input.expenseLoad + input.uncertaintyLoad)))
  const lossRatio = Number(((expectedAnnualLoss / proposedPremium) * 100).toFixed(1))
  const proposedLimit = roundWon(pmlScenario.result * input.proposedLimitRateOfPml)
  const aggregateLimit = roundWon(proposedLimit * input.aggregateLimitRate)
  const deductible = roundWon(expectedAnnualLoss * input.deductibleRate)
  const reinsuranceDecision = pmlScenario.result > input.retentionLimit ? '권고' : pmlScenario.result > proposedLimit ? '검토' : '불필요'
  return {
    id: input.id,
    label: input.label,
    pml: pmlScenario.result,
    ordinaryExpectedLoss,
    tailRiskAmount,
    expectedAnnualLoss,
    reinsuranceCost,
    proposedPremium,
    lossRatio,
    proposedLimit,
    aggregateLimit,
    deductible,
    reinsuranceDecision,
    formula: '예상 연간 손해액 = PML × 연간 사고확률 × 평균 손해심도 + PML × 꼬리위험 가산율',
    assumptions: [
      `연간 사고확률 ${(input.annualEventProbability * 100).toFixed(2)}%`,
      `평균 손해심도 · PML의 ${(input.averageSeverityRateOfPml * 100).toFixed(1)}%`,
      `꼬리위험 가산율 ${(input.tailRiskLoad * 100).toFixed(3)}% · 목표 손해율 ${(input.targetLossRatio * 100).toFixed(0)}%`,
      `사업비 ${(input.expenseLoad * 100).toFixed(0)}% · 불확실성 가산 ${(input.uncertaintyLoad * 100).toFixed(0)}%`,
    ],
    confidence: input.id === 'base' ? '보통' : '낮음',
    source: '상품화 종합평가 PML · 보장 공백 분석 · 프로토타입 가정',
    isMock: true,
  }
})

export const PROPOSAL_UNDERWRITING_DISPLAY = [
  { id: 'parking-scale', title: '주차장 규모', check: '주차면 수, 층수, 지하 구조, 최대 수용 차량', riskImpact: '최대 동시 피해와 PML 증가', pricingImpact: '규모가 클수록 보험료와 사고당 보상한도 상승', tags: [{ label: 'PML ↑', tone: 'risk' }, { label: '보험료 ↑', tone: 'risk' }] },
  { id: 'charger-density', title: '충전기 수와 밀집도', check: '완속·급속 충전기 수, 배치, 충전구역 밀집도', riskImpact: '화재 발생 및 확산 노출 증가', pricingImpact: '고밀도 시설에 위험가산 적용', tags: [{ label: '위험도 ↑', tone: 'risk' }, { label: '보험료 ↑', tone: 'risk' }] },
  { id: 'fire-protection', title: '방재설비', check: '스프링클러, 감지·경보장치, 배연설비, 진압장비', riskImpact: '화재 확산과 손해심도 감소', pricingImpact: '우수한 설비에 할인 또는 자기부담금 완화', tags: [{ label: '손해심도 ↓', tone: 'positive' }, { label: '보험료 ↓', tone: 'positive' }, { label: '자기부담금 ↓', tone: 'positive' }] },
  { id: 'vehicle-battery', title: '차량·배터리 관리정보', check: '대상 차량 명부, 충전기록, 배터리 이상 이력', riskImpact: '위험 분류와 사고 원인 판별 정확도 향상', pricingImpact: '정보 부족 시 불확실성 가산', tags: [{ label: '정보 부족 시 보험료 ↑', tone: 'neutral' }] },
  { id: 'incident-history', title: '사고·고장 이력', check: '화재, 과열, 충전기 고장, 안전점검 이력', riskImpact: '향후 사고빈도 증가 가능성', pricingImpact: '사고빈도에 따라 할증 및 자기부담금 상향', tags: [{ label: '사고빈도 ↑', tone: 'risk' }, { label: '보험료 ↑', tone: 'risk' }, { label: '자기부담금 ↑', tone: 'risk' }] },
  { id: 'accumulation', title: '최대 동시 피해 규모', check: '화재 확산 가능 구역과 동시 피해 차량 수', riskImpact: 'PML과 누적손해 증가', pricingImpact: '사고당 한도와 재보험 필요성 결정', tags: [{ label: 'PML ↑', tone: 'risk' }, { label: '재보험 가능성 ↑', tone: 'neutral' }] },
  { id: 'management', title: '시설 관리 수준', check: '정기점검, 비상대응 매뉴얼, 관리인력', riskImpact: '사고 예방과 초기 대응력 개선', pricingImpact: '관리 수준에 따라 할인·할증 차등', tags: [{ label: '관리 우수 시 보험료 ↓', tone: 'positive' }] },
] as const

export const PROPOSAL_DECISIONS = [
  { id: 'basic-optional', text: '기본 담보와 선택 담보 구분', status: '우선안' },
  { id: 'deduct-existing', text: '기존 보험 지급액 차감 방식', status: '약관 기준 설정' },
  { id: 'pre-liability-payment', text: '책임 확정 전 보험금 지급 여부', status: '약관 기준 설정' },
  { id: 'pml-limit', text: 'PML 기반 사고당 보상한도', status: 'AI 제안값' },
  { id: 'aggregate-limit', text: '계약기간 중 총 보상한도', status: 'AI 제안값' },
  { id: 'deductible-risk', text: '자기부담금과 위험등급 기준', status: '우선안' },
  { id: 'direct-claim', text: '제3자 직접청구 적용 여부', status: '약관 기준 설정' },
  { id: 'recovery', text: '보험금 지급 후 구상 구조', status: '약관 기준 설정' },
] as const

export const PROPOSAL_CALCULATION_EVIDENCE = {
  used: ['상품화 종합평가의 PML', '보장 공백 분석 결과', '기존 보험과의 중복관계', '기존 근거자료 페이지의 사고·시장 자료', '약관화 검토 결과'],
  methods: ['사고빈도 × 평균 보장손해', 'PML 기반 대형사고 위험가산', '시설 위험요인별 할인·할증', '기존 보험 지급액 차감', '목표 손해율을 활용한 제안 보험료 산정'],
  variables: ['연간 사고빈도', '사고당 평균 손해액', '최대가능손해(PML)', '기존 보험 지급 비율', '시설 방재 수준', '보상한도와 자기부담금'],
  confidence: '보통 이하',
  explanation: '공개자료와 프로토타입 시나리오 기반 1차 추정이며, 실제 데이터 연결 시 자동 보정됩니다.',
  limitation: '실제 내부 계약 및 손해 데이터 미확보',
} as const
