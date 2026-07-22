import type { ExplorationCategory } from './riskExplorationDemo'

export type ScreeningMetricKey = 'demand' | 'fortuity' | 'accumulation' | 'measurability' | 'adverseSelection' | 'moralHazard' | 'dataConfidence' | 'legalExposure'

export type ScreeningInsight = {
  title: string
  reasons: string[]
  sources: string[]
  judgment: string
  tone: 'positive' | 'warning' | 'critical'
}

export type ScreeningReference = {
  type: string
  title: string
  description: string
  date: string
  categories: ExplorationCategory[]
  tone: 'red' | 'yellow' | 'blue' | 'gray'
}

const insight = (title: string, reasons: string[], sources: string[], judgment: string, tone: ScreeningInsight['tone'] = 'warning'): ScreeningInsight => ({ title, reasons, sources, judgment, tone })

/** seoyeon 브랜치 TOP-5 셀별 설명을 현재 도메인 계약으로 옮긴 SAMPLE 데이터입니다. */
export const screeningInsights: Record<string, Record<ScreeningMetricKey, ScreeningInsight>> = {
  'ev-battery-fire': {
    demand: insight('시장 수요 · 92%', ['건물주 및 입주민 보험 문의 증가', '지하주차장 화재 사고 후 관심 증가'], ['검색량 API · 샘플', '고객센터 비식별 집계 · 샘플'], '시장 전환 가능성을 우선 검토할 항목입니다.', 'positive'),
    fortuity: insight('우연성 · 4.0 / 5.0', ['예측하기 어려운 셀 발화', '충전 도중 급격한 열폭주'], ['소방 화재 통계 · 원문 확인 필요'], '보험사고의 우연성 성립 여부를 약관과 함께 검토합니다.', 'positive'),
    accumulation: insight('누적위험 · 5.0', ['지하주차장 연쇄 화재 시 고액 손해', '유독가스와 제연 한계로 피해 확대'], ['재난안전 연구자료 · 원문 확인 필요'], '보유한도와 재보험 구조 검토가 필요합니다.', 'critical'),
    measurability: insight('측정 가능성 · 4.0', ['배터리 용량별 손해 구분 가능'], ['보험 손해율 통계 · 원문 확인 필요'], '세부 데이터 정의가 확보되면 요율 검토가 가능합니다.', 'positive'),
    adverseSelection: insight('역선택 통제성 · 높음', ['BMS 사전 진단 데이터 요구 가능'], ['인수심사 가이드 · 샘플'], '노후 차종과 관리 상태를 구분할 수 있는지 확인합니다.', 'positive'),
    moralHazard: insight('도덕적 해이 · 보통', ['충전기 방치 등 관리 부실 가능성'], ['이상거래 탐지 분석 · 샘플'], '자기부담금과 점검 조건의 통제 효과를 검토합니다.'),
    dataConfidence: insight('데이터 신뢰도 · 85%', ['3년 공공데이터 연동을 가정'], ['공공데이터포털 · 원문 확인 필요'], '표본 정의와 최신성 확인 후 통계 신뢰도를 판단합니다.', 'positive'),
    legalExposure: insight('규제·법적 · 고위험', ['제조사 과실 입증과 구상 분쟁 장기화 가능성'], ['법률 연구보고서 · 원문 확인 필요'], '책임 귀속과 구상 절차의 법무 검토가 필요합니다.', 'critical'),
  },
  'generative-ai-copyright': {
    demand: insight('시장 수요 · 78%', ['IT 기업의 지식재산 소송 대비 문의 증가'], ['기업 B2B 설문 · 샘플'], '기업용 특약 수요를 별도 검증합니다.', 'positive'),
    fortuity: insight('우연성 · 3.0 / 5.0', ['학습데이터 중복이 결과물에 우연히 표출될 가능성'], ['AI 윤리 가이드 · 원문 확인 필요'], '고의 사용과 우연한 침해를 구분해야 합니다.'),
    accumulation: insight('누적위험 · 4.0', ['동일 모델 사용 기업의 집단 소송 가능성'], ['해외 판례 DB · 원문 확인 필요'], '모델별 누적 한도와 보상한도 검토가 필요합니다.'),
    measurability: insight('측정 가능성 · 4.0', ['콘텐츠 유사도 비교 도구 활용 가능'], ['저작권위원회 자료 · 원문 확인 필요'], '직접손해와 방어비용의 산정 기준을 분리합니다.', 'positive'),
    adverseSelection: insight('역선택 통제성 · 보통', ['사전 필터링과 데이터 관리 체계 점검 필요'], ['인수심사 가이드 · 샘플'], '관리체계가 확인된 기업의 조건부 인수를 검토합니다.'),
    moralHazard: insight('도덕적 해이 · 낮음', ['고의 도용은 면책 검토 대상'], ['법무 검토안 · 샘플'], '고의성과 관리 소홀의 경계를 약관에 명시해야 합니다.', 'positive'),
    dataConfidence: insight('데이터 신뢰도 · 72%', ['국내 데이터 누적 기간이 짧음'], ['빅데이터 분석 · 샘플'], '불확실성을 반영한 안전율 검토가 필요합니다.'),
    legalExposure: insight('규제·법적 · 중위험', ['정부 가이드라인과 판례가 형성 중'], ['정부 공청회 · 원문 확인 필요'], '법령·가이드라인 개정 추이를 지속 관찰합니다.'),
  },
  'commercial-drone': {
    demand: insight('시장 수요 · 64%', ['물류사의 드론 상용화 실증 확대'], ['국토교통 사업 발표 · 원문 확인 필요'], '의무보험 기준 변화와 실제 가입 수요를 함께 봅니다.', 'positive'),
    fortuity: insight('우연성 · 4.0 / 5.0', ['돌풍과 기체 낙하 등 불시 사고'], ['항공안전 연구자료 · 원문 확인 필요'], '통상적인 운항 중 사고의 우연성을 검토합니다.', 'positive'),
    accumulation: insight('누적위험 · 3.0', ['현재는 단발성 개별 사고가 중심'], ['사고 DB · 샘플'], '관제 장애로 인한 동시 사고 가능성은 별도 확인합니다.', 'positive'),
    measurability: insight('측정 가능성 · 3.0', ['비행 로그와 블랙박스 분석 가능'], ['드론 안전기관 자료 · 원문 확인 필요'], '로그 표준화 여부가 손해사정 가능성을 좌우합니다.'),
    adverseSelection: insight('역선택 통제성 · 보통', ['기체 정비 이력 검수 가능'], ['항공 안전기준 · 원문 확인 필요'], '정비 기록 제출과 운항 자격 조건을 검토합니다.'),
    moralHazard: insight('도덕적 해이 · 낮음', ['원격 비행 제어 기록 보존 가능'], ['이상행위 검증자료 · 샘플'], '로그 위변조 방지 수준을 먼저 확인합니다.', 'positive'),
    dataConfidence: insight('데이터 신뢰도 · 68%', ['지자체 실증 운행 데이터 활용 가능'], ['드론 산업협회 · 원문 확인 필요'], '상용 운항 데이터가 축적될 때까지 불확실성을 기록합니다.'),
    legalExposure: insight('규제·법적 · 중위험', ['의무 배상책임 한도 상향 논의'], ['국토교통 법안 · 원문 확인 필요'], '표준 약관과 운영자 책임 범위를 확인합니다.'),
  },
  'autonomous-level4': {
    demand: insight('시장 수요 · 58%', ['완성차 업체의 무인셔틀 도입'], ['자동차공학 자료 · 원문 확인 필요'], '신규 차종 전용 담보의 실제 수요를 검증합니다.', 'positive'),
    fortuity: insight('우연성 · 4.0 / 5.0', ['센서의 예측하기 어려운 오작동'], ['교통안전 연구자료 · 원문 확인 필요'], '시스템 오류와 관리 소홀을 구분해야 합니다.', 'positive'),
    accumulation: insight('누적위험 · 4.0', ['OTA 업데이트 오류가 다수 차량에 동시 전파될 가능성'], ['소프트웨어 안전자료 · 원문 확인 필요'], '동일 버전 차량의 누적 손해 시나리오가 필요합니다.'),
    measurability: insight('측정 가능성 · 2.0', ['해킹과 기체 오류의 원인 규명이 복잡'], ['포렌식 연구자료 · 원문 확인 필요'], '손해사정 난이도와 증거 보존 조건을 우선 검토합니다.', 'critical'),
    adverseSelection: insight('역선택 통제성 · 낮음', ['임의 소프트웨어 개조 확인이 어려움'], ['인수심사 검토 · 샘플'], '순정 소프트웨어와 업데이트 이력을 가입 조건으로 검토합니다.', 'critical'),
    moralHazard: insight('도덕적 해이 · 보통', ['비상 시 운전자 주의 의무 태만 가능성'], ['사고 조사자료 · 원문 확인 필요'], '제어권 이양 기록과 운전자 상태를 함께 봅니다.'),
    dataConfidence: insight('데이터 신뢰도 · 52%', ['국내 실제 사고 표본이 적음'], ['보험 데이터 연구자료 · 원문 확인 필요'], '초기 단계 불확실성이 높아 추가 데이터가 필요합니다.', 'critical'),
    legalExposure: insight('규제·법적 · 고위험', ['제조사와 운전자 책임 분쟁 가능성'], ['법원 판례 · 원문 확인 필요'], '책임 주체와 구상 프로세스 정립이 선행되어야 합니다.', 'critical'),
  },
  'deepfake-phishing': {
    demand: insight('시장 수요 · 71%', ['음성 합성 송금 사기 신고 증가'], ['금융감독 경보 · 원문 확인 필요'], '사이버 피싱 보장의 수요와 지불의사를 검증합니다.', 'positive'),
    fortuity: insight('우연성 · 3.0 / 5.0', ['외부의 지능형 소셜 엔지니어링'], ['사이버범죄 통계 · 원문 확인 필요'], '피보험자의 관리 소홀과 외부 사기를 구분합니다.'),
    accumulation: insight('누적위험 · 2.0', ['현재는 표적형 개별 범죄가 중심'], ['보안업체 분석 · 원문 확인 필요'], '플랫폼 취약점 악용 시 집단 피해 가능성은 남습니다.', 'positive'),
    measurability: insight('측정 가능성 · 3.0', ['계좌 이체 금액으로 직접 피해 측정 가능'], ['금융보안 자료 · 원문 확인 필요'], '간접손해와 회수액을 차감하는 기준이 필요합니다.'),
    adverseSelection: insight('역선택 통제성 · 낮음', ['보안 취약 사업장의 가입 집중 가능성'], ['인수심사 가이드 · 샘플'], '이중 승인 절차 등 통제 수준을 인수 조건으로 검토합니다.', 'critical'),
    moralHazard: insight('도덕적 해이 · 높음', ['내부자 공모와 자작극 가능성'], ['이상거래 검수 · 샘플'], '수사기관 신고와 거래 증빙을 보상 조건으로 검토합니다.', 'critical'),
    dataConfidence: insight('데이터 신뢰도 · 60%', ['신종 피싱 데이터 수집 초기'], ['금융 통계 · 원문 확인 필요'], '사고 유형별 보상한도 세분화가 필요합니다.'),
    legalExposure: insight('규제·법적 · 중위험', ['금융기관과 보험사의 과실 보상 논의'], ['금융 가이드 · 원문 확인 필요'], '약관상 보상 기준과 책임 분담을 명확히 해야 합니다.'),
  },
}

export const screeningLaws: ScreeningReference[] = [
  { tone: 'red', type: '국회 / 발의', title: '전기차 화재 예방 및 피해보상 특별법', description: '지하주차장 소방시설 의무와 피해보상 기준 변화', date: '최근 1일 · SAMPLE', categories: ['corporate', 'individual', 'legal'] },
  { tone: 'yellow', type: '과기부 / 가이드라인', title: '생성형 AI 저작권 및 출처 표기 지침', description: '학습 데이터 출처와 무단 이용 책임 기준 변화', date: '최근 12시간 · SAMPLE', categories: ['corporate', 'legal', 'department'] },
  { tone: 'blue', type: '국토부 / 개정예고', title: '상업용 드론 및 자율주행 안전기준 강화', description: '드론 배송 사업자의 제3자 배상책임 기준 변화', date: '최근 2일 · SAMPLE', categories: ['corporate', 'legal', 'customer'] },
  { tone: 'red', type: '금융위 / 가이드라인', title: '딥페이크 금융사기 예방 지침', description: '본인확인 절차와 피해 발생 시 책임 소재 논의', date: '최근 3일 · SAMPLE', categories: ['individual', 'customer', 'legal'] },
]

export const screeningCases: ScreeningReference[] = [
  { tone: 'gray', type: '대법원 판례', title: '지하주차장 배터리 열폭주 관련 PL 판단', description: '결함 입증과 유독가스 2차 피해 구상 쟁점', date: '최근 판례 · SAMPLE', categories: ['corporate', 'individual', 'legal'] },
  { tone: 'gray', type: '손해사정 이슈', title: 'AI 환각에 의한 기업 손실', description: '잘못된 AI 생성 정보로 인한 영업손실 분쟁', date: '시장 동향 · SAMPLE', categories: ['corporate', 'department'] },
  { tone: 'gray', type: '사고 사례', title: '자율주행 Level 4 제어권 이양 오류', description: '차량 제어권 전환 과정의 과실 분쟁', date: '사고 사례 · SAMPLE', categories: ['individual', 'corporate', 'legal'] },
  { tone: 'gray', type: '금융감독 신호', title: '음성 복제 딥페이크 자금 갈취', description: '소상공인을 겨냥한 Voice AI 피싱 피해', date: '사고 사례 · SAMPLE', categories: ['individual', 'customer'] },
]
