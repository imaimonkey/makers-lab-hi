export type ExplorationCategory = 'individual' | 'corporate' | 'legal' | 'department' | 'customer'

export const riskExplorationMetricKeys = [
  'demand',
  'fortuity',
  'accumulation',
  'measurability',
  'adverseSelection',
  'moralHazard',
  'dataConfidence',
  'legalExposure',
] as const

export type RiskExplorationMetricKey = (typeof riskExplorationMetricKeys)[number]
export type RiskExplorationMetricScores = Record<RiskExplorationMetricKey, number>

export type RiskExplorationMetricEvidence = {
  reasons: string[]
  sourceIds: string[]
  quotes: string[]
  judgment: string
  scoreRationale: string
  confidence: string
  evidenceStatus?: 'verified' | 'pending'
  counterEvidence: string[]
  uncertainty: string[]
}

export type RiskExplorationDisplay = {
  /** Seoyeon parity labels; these are presentation values, not scoring inputs. */
  demandVal: string
  fortVal: string
  fortuityDots: number
  accumVal: string
  accumulationDots: number
  measVal: string
  measurabilityDots: number
  adverseVal: string
  moralVal: string
  dataVal: string
  dataConfidencePercent: number
  riskLabel: string
  /** Legacy branch-compatible label retained alongside the canonical field. */
  riskSub: string
  legalRiskSub: string
}

export type RiskExplorationRecord = {
  id: string
  detailRiskId: string
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
  metricScores: RiskExplorationMetricScores
  metricEvidence?: Partial<Record<RiskExplorationMetricKey, RiskExplorationMetricEvidence>>
  evidenceIds?: string[]
  articleId?: string
  sourceName?: string
  collectedAt?: string
  facts?: string[]
  metrics?: Array<{ label: string; value: string; sourceHint?: string }>
  display: RiskExplorationDisplay
  gap: string
  nextAction: string
}

const inverseMetricKeys = new Set<RiskExplorationMetricKey>([
  'accumulation',
  'moralHazard',
  'legalExposure',
])

const MIN_METRIC_SCORE = 1
const MAX_METRIC_SCORE = 5

const clampMetricScore = (score: number) => Math.min(MAX_METRIC_SCORE, Math.max(MIN_METRIC_SCORE, score))

/**
 * 8개 평가 지표를 동일 가중치로 계산합니다.
 * 누적위험·도덕적 해이·규제/법적 위험은 원점수가 높을수록 불리하므로 역점수화합니다.
 */
export function calculateRiskExplorationScore(scores: RiskExplorationMetricScores): number {
  const total = riskExplorationMetricKeys.reduce((sum, key) => {
    const score = clampMetricScore(scores[key])
    const weightedScore = inverseMetricKeys.has(key)
      ? MIN_METRIC_SCORE + MAX_METRIC_SCORE - score
      : score
    return sum + weightedScore
  }, 0)

  return total / riskExplorationMetricKeys.length
}

/**
 * 후보 비교 렌즈용 샘플 데이터입니다. 실제 시장 수요·손해율·약관 판단을
 * 대체하지 않으며, 각 값은 공식 출처 연동 전 워크벤치 시연을 위한 예시입니다.
 */
export const riskExplorationRecords: RiskExplorationRecord[] = [
  {
    id: 'ev-battery-fire',
    detailRiskId: 'ev-battery-fire',
    title: '전기차 배터리 화재',
    summary: '보급 확대에 따른 배터리 열폭주와 지하주차장 2차 피해',
    tags: ['기업', '개인', '자동차'],
    categories: ['corporate', 'individual', 'legal'],
    demand: '매우 높음 · 92%',
    fortuity: '높음 · 4/5',
    accumulation: '높음 · 5/5',
    measurability: '높음 · 4/5',
    adverseSelection: '높음',
    moralHazard: '보통',
    dataConfidence: '85%',
    legalExposure: '높음',
    metricScores: {
      demand: 4.6,
      fortuity: 4,
      accumulation: 5,
      measurability: 4,
      adverseSelection: 5,
      moralHazard: 3,
      dataConfidence: 4.25,
      legalExposure: 5,
    },
    display: {
      demandVal: '매우 높음 (92%)', fortVal: '●●●●○', fortuityDots: 4,
      accumVal: '●●●●●', accumulationDots: 5, measVal: '●●●●○', measurabilityDots: 4,
      adverseVal: '높음', moralVal: '보통', dataVal: '85%', dataConfidencePercent: 85,
      riskLabel: '🔴 고위험', riskSub: '제조물 책임법 존재', legalRiskSub: '제조물 책임법 존재',
    },
    gap: '배터리·주차장 단위의 손해 데이터 세분화',
    nextAction: '공공 화재 통계와 제조사 BMS 지표의 정의 확인',
  },
  {
    id: 'generative-ai-copyright',
    detailRiskId: 'generative-ai-copyright',
    title: '생성형 AI 저작권',
    summary: 'AI 콘텐츠 저작권 분쟁과 학습 데이터 출처·사용 책임',
    tags: ['기업', '내부책임'],
    categories: ['corporate', 'legal', 'department'],
    demand: '높음 · 78%',
    fortuity: '보통 · 3/5',
    accumulation: '높음 · 4/5',
    measurability: '높음 · 4/5',
    adverseSelection: '보통',
    moralHazard: '낮음',
    dataConfidence: '72%',
    legalExposure: '중간',
    metricScores: {
      demand: 3.9,
      fortuity: 3,
      accumulation: 4,
      measurability: 4,
      adverseSelection: 3,
      moralHazard: 1,
      dataConfidence: 3.6,
      legalExposure: 3,
    },
    display: {
      demandVal: '높음 (78%)', fortVal: '●●●○○', fortuityDots: 3,
      accumVal: '●●●●○', accumulationDots: 4, measVal: '●●●●○', measurabilityDots: 4,
      adverseVal: '보통', moralVal: '낮음', dataVal: '72%', dataConfidencePercent: 72,
      riskLabel: '🟡 중위험', riskSub: '저작권법 변화 가능성', legalRiskSub: '저작권법 변화 가능성',
    },
    gap: '국내 판례와 손해액 산정 모수 부족',
    nextAction: '기업 보안·저작권 관리 수준별 가입 조건 검토',
  },
  {
    id: 'commercial-drone',
    detailRiskId: 'commercial-drone',
    title: '상업용 드론 배송 사고',
    summary: '도심 운항 확대에 따른 제3자 인명·대물 배상책임',
    tags: ['기업', '배상책임'],
    categories: ['corporate', 'legal', 'customer'],
    demand: '보통 · 64%',
    fortuity: '높음 · 4/5',
    accumulation: '보통 · 3/5',
    measurability: '보통 · 3/5',
    adverseSelection: '보통',
    moralHazard: '낮음',
    dataConfidence: '68%',
    legalExposure: '중간',
    metricScores: {
      demand: 3.2,
      fortuity: 4,
      accumulation: 3,
      measurability: 3,
      adverseSelection: 3,
      moralHazard: 1,
      dataConfidence: 3.4,
      legalExposure: 3,
    },
    display: {
      demandVal: '보통 (64%)', fortVal: '●●●●○', fortuityDots: 4,
      accumVal: '●●●○○', accumulationDots: 3, measVal: '●●●○○', measurabilityDots: 3,
      adverseVal: '보통', moralVal: '낮음', dataVal: '68%', dataConfidencePercent: 68,
      riskLabel: '🟡 중위험', riskSub: '항공안전법 강화', legalRiskSub: '항공안전법 강화',
    },
    gap: '비행 로그·정비 이력의 표준화',
    nextAction: '운항 사업자별 의무보험과 보상한도 변화 모니터링',
  },
  {
    id: 'autonomous-level4',
    detailRiskId: 'autonomous-level4',
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
    metricScores: {
      demand: 2.9,
      fortuity: 4,
      accumulation: 4,
      measurability: 2,
      adverseSelection: 1,
      moralHazard: 3,
      dataConfidence: 2.6,
      legalExposure: 5,
    },
    display: {
      demandVal: '보통 (58%)', fortVal: '●●●●○', fortuityDots: 4,
      accumVal: '●●●●○', accumulationDots: 4, measVal: '●●○○○', measurabilityDots: 2,
      adverseVal: '낮음', moralVal: '보통', dataVal: '52%', dataConfidencePercent: 52,
      riskLabel: '🔴 고위험', riskSub: '책임 주체 법적 논란', legalRiskSub: '책임 주체 법적 논란',
    },
    gap: '소프트웨어 오류와 운전자 과실 분리 기준',
    nextAction: '사고 데이터 보존·포렌식 책임을 상품 조건에 반영할지 검토',
  },
  {
    id: 'deepfake-phishing',
    detailRiskId: 'deepfake-phishing',
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
    metricScores: {
      demand: 3.55,
      fortuity: 3,
      accumulation: 2,
      measurability: 3,
      adverseSelection: 1,
      moralHazard: 5,
      dataConfidence: 3,
      legalExposure: 3,
    },
    display: {
      demandVal: '높음 (71%)', fortVal: '●●●○○', fortuityDots: 3,
      accumVal: '●●○○○', accumulationDots: 2, measVal: '●●●○○', measurabilityDots: 3,
      adverseVal: '낮음', moralVal: '높음', dataVal: '60%', dataConfidencePercent: 60,
      riskLabel: '🟡 중위험', riskSub: '전자금융거래법 개정', legalRiskSub: '전자금융거래법 개정',
    },
    gap: '신종 피싱 사고의 분류·공모 여부 판별',
    nextAction: '금융기관·수사기관 확인 절차와 보상 기준을 먼저 정의',
  },
  {
    id: 'urban-flooding',
    detailRiskId: 'urban-flooding',
    title: '집중호우·도시침수',
    summary: '국지성 호우로 인한 지하공간·상가·주택 침수와 영업중단',
    tags: ['기업', '개인', '기후'],
    categories: ['corporate', 'individual', 'legal'],
    demand: '높음 · 76%',
    fortuity: '높음 · 4/5',
    accumulation: '높음 · 5/5',
    measurability: '높음 · 4/5',
    adverseSelection: '보통',
    moralHazard: '낮음',
    dataConfidence: '82%',
    legalExposure: '높음',
    metricScores: {
      demand: 3.8,
      fortuity: 4,
      accumulation: 5,
      measurability: 4,
      adverseSelection: 3,
      moralHazard: 1,
      dataConfidence: 4.1,
      legalExposure: 5,
    },
    display: {
      demandVal: '높음 (76%)', fortVal: '●●●●○', fortuityDots: 4,
      accumVal: '●●●●●', accumulationDots: 5, measVal: '●●●●○', measurabilityDots: 4,
      adverseVal: '보통', moralVal: '낮음', dataVal: '82%', dataConfidencePercent: 82,
      riskLabel: '🔴 고위험', riskSub: '자연재해 누적손해', legalRiskSub: '자연재해 누적손해',
    },
    gap: '주소·층수·방재시설·침수 이력을 결합한 표준 위험등급',
    nextAction: '지역별 집적도와 재난지원금·보험금 중복 기준 확인',
  },
  {
    id: 'enterprise-ransomware',
    detailRiskId: 'enterprise-ransomware',
    title: '기업 랜섬웨어·업무중단',
    summary: '랜섬웨어 감염으로 인한 데이터 훼손·복구비와 영업중단',
    tags: ['기업', '사이버', '배상책임'],
    categories: ['corporate', 'legal'],
    demand: '높음 · 74%',
    fortuity: '보통 · 3/5',
    accumulation: '높음 · 5/5',
    measurability: '보통 · 3/5',
    adverseSelection: '보통',
    moralHazard: '보통',
    dataConfidence: '70%',
    legalExposure: '높음',
    metricScores: {
      demand: 3.7,
      fortuity: 3,
      accumulation: 5,
      measurability: 3,
      adverseSelection: 3,
      moralHazard: 3,
      dataConfidence: 3.5,
      legalExposure: 5,
    },
    display: {
      demandVal: '높음 (74%)', fortVal: '●●●○○', fortuityDots: 3,
      accumVal: '●●●●●', accumulationDots: 5, measVal: '●●●○○', measurabilityDots: 3,
      adverseVal: '보통', moralVal: '보통', dataVal: '70%', dataConfidencePercent: 70,
      riskLabel: '🔴 고위험', riskSub: '개인정보·배상책임 연계', legalRiskSub: '개인정보·배상책임 연계',
    },
    gap: '미신고 사고와 클라우드·공급망 누적노출 데이터',
    nextAction: '보안성숙도·백업·MFA 기준과 보장한도 연계 검토',
  },
  {
    id: 'ess-ups-battery-fire',
    detailRiskId: 'ess-ups-battery-fire',
    title: 'ESS·UPS 배터리 화재',
    summary: '데이터센터·공장 에너지저장장치의 열폭주와 장시간 운영중단',
    tags: ['기업', '에너지', '제조물책임'],
    categories: ['corporate', 'legal'],
    demand: '보통 · 67%',
    fortuity: '높음 · 4/5',
    accumulation: '높음 · 4/5',
    measurability: '높음 · 4/5',
    adverseSelection: '높음',
    moralHazard: '낮음',
    dataConfidence: '75%',
    legalExposure: '높음',
    metricScores: {
      demand: 3.35,
      fortuity: 4,
      accumulation: 4,
      measurability: 4,
      adverseSelection: 5,
      moralHazard: 1,
      dataConfidence: 3.75,
      legalExposure: 5,
    },
    display: {
      demandVal: '보통 (67%)', fortVal: '●●●●○', fortuityDots: 4,
      accumVal: '●●●●○', accumulationDots: 4, measVal: '●●●●○', measurabilityDots: 4,
      adverseVal: '높음', moralVal: '낮음', dataVal: '75%', dataConfidencePercent: 75,
      riskLabel: '🔴 고위험', riskSub: '화재안전기준 준수', legalRiskSub: '화재안전기준 준수',
    },
    gap: '배터리 계열·설치환경·안전설비별 손해 데이터 분리',
    nextAction: 'BMS 로그와 안전점검 이력을 활용한 인수 조건 검토',
  },
  {
    id: 'heatwave-health-income-loss',
    detailRiskId: 'heatwave-health-income-loss',
    title: '폭염 건강·소득손실',
    summary: '장기 폭염으로 인한 온열질환·작업중단과 취약계층 소득공백',
    tags: ['개인', '건강', '기후'],
    categories: ['individual', 'legal'],
    demand: '보통 · 66%',
    fortuity: '보통 · 3/5',
    accumulation: '높음 · 4/5',
    measurability: '높음 · 4/5',
    adverseSelection: '보통',
    moralHazard: '보통',
    dataConfidence: '79%',
    legalExposure: '중간',
    metricScores: {
      demand: 3.3,
      fortuity: 3,
      accumulation: 4,
      measurability: 4,
      adverseSelection: 3,
      moralHazard: 3,
      dataConfidence: 3.95,
      legalExposure: 3,
    },
    display: {
      demandVal: '보통 (66%)', fortVal: '●●●○○', fortuityDots: 3,
      accumVal: '●●●●○', accumulationDots: 4, measVal: '●●●●○', measurabilityDots: 4,
      adverseVal: '보통', moralVal: '보통', dataVal: '79%', dataConfidencePercent: 79,
      riskLabel: '🟡 중위험', riskSub: '지수형 보장 기준', legalRiskSub: '지수형 보장 기준',
    },
    gap: '기상지수와 실제 건강·소득손해 사이의 기초위험 검증',
    nextAction: '산재·건강보험과의 중복 및 객관적 지급 트리거 검토',
  },
  {
    id: 'platform-worker-transit-accident',
    detailRiskId: 'platform-worker-transit-accident',
    title: '플랫폼 종사자 이동 중 사고',
    summary: '배달·대리·퀵서비스 종사자의 업무 중 교통사고와 소득상실',
    tags: ['개인', '상해', '자동차'],
    categories: ['individual', 'legal'],
    demand: '보통 · 63%',
    fortuity: '높음 · 4/5',
    accumulation: '낮음 · 2/5',
    measurability: '높음 · 4/5',
    adverseSelection: '높음',
    moralHazard: '보통',
    dataConfidence: '73%',
    legalExposure: '중간',
    metricScores: {
      demand: 3.15,
      fortuity: 4,
      accumulation: 2,
      measurability: 4,
      adverseSelection: 5,
      moralHazard: 3,
      dataConfidence: 3.65,
      legalExposure: 3,
    },
    display: {
      demandVal: '보통 (63%)', fortVal: '●●●●○', fortuityDots: 4,
      accumVal: '●●○○○', accumulationDots: 2, measVal: '●●●●○', measurabilityDots: 4,
      adverseVal: '높음', moralVal: '보통', dataVal: '73%', dataConfidencePercent: 73,
      riskLabel: '🟡 중위험', riskSub: '산재·자동차보험 중복', legalRiskSub: '산재·자동차보험 중복',
    },
    gap: '플랫폼별 운행로그 표준화와 업무·비업무 운행 경계',
    nextAction: '산재·자동차보험 조정과 운행시간 기반 보장 조건 검토',
  },
]
