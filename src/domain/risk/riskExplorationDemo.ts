export type ExplorationCategory = 'individual' | 'corporate' | 'legal' | 'department' | 'customer'

export type RiskExplorationRecord = {
  id: string
  title: string
  summary: string
  tags: string[]
  categories: ExplorationCategory[]
  demand: string
  fortuity: string
  accumulation: string
  measurability: string
  adverseSelection: string
  moralHazard: string
  dataConfidence: string
  legalExposure: string
  score: number
  gap: string
  nextAction: string
}

/**
 * 후보 비교 렌즈용 샘플 데이터입니다. 실제 시장 수요·손해율·약관 판단을
 * 대체하지 않으며, 각 값은 공식 출처 연동 전 워크벤치 시연을 위한 예시입니다.
 */
export const riskExplorationRecords: RiskExplorationRecord[] = [
  {
    id: 'ev-battery-fire',
    title: '전기차 배터리 화재',
    summary: '보급 확대에 따른 배터리 열폭주와 지하주차장 2차 피해',
    tags: ['기업', '개인', '자동차'],
    categories: ['corporate', 'individual', 'legal'],
    demand: '매우 높음 · 92%',
    fortuity: '높음 · 4/5',
    accumulation: '높음 · 5/5',
    measurability: '높음 · 4/5',
    adverseSelection: '통제 가능',
    moralHazard: '보통',
    dataConfidence: '85%',
    legalExposure: '높음',
    score: 4.35,
    gap: '배터리·주차장 단위의 손해 데이터 세분화',
    nextAction: '공공 화재 통계와 제조사 BMS 지표의 정의 확인',
  },
  {
    id: 'generative-ai-copyright',
    title: '생성형 AI 저작권',
    summary: 'AI 콘텐츠 저작권 분쟁과 학습 데이터 출처·사용 책임',
    tags: ['기업', '내부책임'],
    categories: ['corporate', 'legal', 'department'],
    demand: '높음 · 78%',
    fortuity: '보통 · 3/5',
    accumulation: '높음 · 4/5',
    measurability: '높음 · 4/5',
    adverseSelection: '부분 통제',
    moralHazard: '낮음',
    dataConfidence: '72%',
    legalExposure: '중간',
    score: 3.68,
    gap: '국내 판례와 손해액 산정 모수 부족',
    nextAction: '기업 보안·저작권 관리 수준별 가입 조건 검토',
  },
  {
    id: 'commercial-drone',
    title: '상업용 드론 배송 사고',
    summary: '도심 운항 확대에 따른 제3자 인명·대물 배상책임',
    tags: ['기업', '배상책임'],
    categories: ['corporate', 'legal', 'customer'],
    demand: '보통 · 64%',
    fortuity: '높음 · 4/5',
    accumulation: '낮음 · 3/5',
    measurability: '보통 · 3/5',
    adverseSelection: '부분 통제',
    moralHazard: '낮음',
    dataConfidence: '68%',
    legalExposure: '중간',
    score: 2.94,
    gap: '비행 로그·정비 이력의 표준화',
    nextAction: '운항 사업자별 의무보험과 보상한도 변화 모니터링',
  },
  {
    id: 'autonomous-level4',
    title: '자율주행 Level 4 사고',
    summary: '운전자 개입이 없는 자율주행 시스템의 책임 주체 불확실성',
    tags: ['자동차', '제조물책임'],
    categories: ['individual', 'corporate', 'legal'],
    demand: '보통 · 58%',
    fortuity: '높음 · 4/5',
    accumulation: '높음 · 4/5',
    measurability: '낮음 · 2/5',
    adverseSelection: '낮음',
    moralHazard: '보통',
    dataConfidence: '52%',
    legalExposure: '높음',
    score: 2.52,
    gap: '소프트웨어 오류와 운전자 과실 분리 기준',
    nextAction: '사고 데이터 보존·포렌식 책임을 상품 조건에 반영할지 검토',
  },
  {
    id: 'deepfake-phishing',
    title: '소상공인 딥페이크 피싱',
    summary: '생성형 음성·영상 복제로 인한 기업 자금 갈취와 사기 피해',
    tags: ['개인', '기업', '금융'],
    categories: ['individual', 'corporate', 'customer'],
    demand: '높음 · 71%',
    fortuity: '보통 · 3/5',
    accumulation: '낮음 · 2/5',
    measurability: '보통 · 3/5',
    adverseSelection: '낮음',
    moralHazard: '높음',
    dataConfidence: '60%',
    legalExposure: '중간',
    score: 2.1,
    gap: '신종 피싱 사고의 분류·공모 여부 판별',
    nextAction: '금융기관·수사기관 확인 절차와 보상 기준을 먼저 정의',
  },
]

