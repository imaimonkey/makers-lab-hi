import type { IconName } from '../../shared/components/AppIcon'

export type RiskRadarKpi = {
  label: string
  value: number
  unit: string
  description: string
  meta: string
  icon: IconName
  tone: 'orange' | 'navy' | 'blue'
}

export type RiskRadarPriorityRisk = {
  id: string
  detailRiskId: string
  title: string
  marketGrade: 'S' | 'A'
  score: number
  summary: string
}

export type RiskRadarCandidate = {
  id: string
  detailRiskId: string
  title: string
  description: string
  tags: string[]
  keywords: string[]
}

export type RiskRadarRegulation = {
  id: string
  source: string
  title: string
  description: string
  relatedRisk: string
  detailRiskId: string
}

export type RiskRadarMarketTrend = {
  id: string
  company: string
  title: string
  status: '배타적사용권 부여' | '배타적사용권 신청' | '신상품 출시'
  statusKey: 'granted' | 'applied' | 'launched'
  statusLabel: string
  summary: string
  date: string
  sourceType: string
  detailRiskId: string
}

export type RiskRadarMarketUpdate = {
  id: string
  source: string
  date: string
  title: string
  reviewPoint: string
  keyword: string
}

export type ExclusiveRight = Pick<RiskRadarMarketTrend, 'id' | 'company' | 'title' | 'statusKey' | 'statusLabel' | 'summary' | 'date' | 'sourceType'> & {
  sourceUrl: string | null
}

export type RecentInsuranceProduct = {
  id: string
  company: string
  title: string
  summary: string
  date: string
  sourceType: string
  sourceUrl: string | null
}

export type MarketUpdate = {
  id: string | number
  type: string
  source: string
  date: string
  title: string
  insight: string
  relatedTopic: string
  sourceUrl: string | null
}

export type GlobalInsuranceInsight = {
  id: string
  organization: string
  title: string
  summary: string
  relatedRisk: string
  keyword: string
}

export type RiskRadarScrap = {
  id: string
  title: string
  conclusion: string
  reportId: string
}

export type RiskRadarKeyword = {
  label: string
  tone: 'tech' | 'loss' | 'issue'
  size: 'sm' | 'md' | 'lg'
  filter: string
}

export type RiskRadarSourceShare = {
  label: string
  share: number
  role: string
  tone: 'orange' | 'navy' | 'blue' | 'mist'
}

export const riskRadarKpis: RiskRadarKpi[] = [
  { label: '신규 위험 후보', value: 15, unit: '건', description: '최근 30일 동안 수집·분석된 전체 위험 후보', meta: '최근 30일', icon: 'radar', tone: 'orange' },
  { label: '상품화 검토 후보', value: 8, unit: '건', description: '최소 상품화 검토 기준을 충족한 위험', meta: '검토 기준 충족', icon: 'report', tone: 'navy' },
  { label: '법·규제 연계 위험', value: 3, unit: '건', description: '최근 법령·감독 변화와 연결된 위험', meta: '최근 30일', icon: 'shield', tone: 'blue' },
]

export const riskRadarPriorityRisks: RiskRadarPriorityRisk[] = [
  {
    id: 'priority-ev-battery-fire',
    detailRiskId: 'ev-battery-fire',
    title: '전기차 배터리 화재',
    marketGrade: 'A',
    score: 4.4,
    summary: '지하주차장 내 배터리 열폭주와 인접 차량·시설의 2차 피해 가능성을 함께 검토하는 위험입니다.',
  },
  {
    id: 'priority-medical-liability',
    detailRiskId: 'medical-liability-insurance',
    title: '의료기관 책임보험 의무',
    marketGrade: 'S',
    score: 4.0,
    summary: '의료기관의 책임보험 가입 의무 변화가 신규 보장 수요로 이어질 가능성을 살펴봅니다.',
  },
  {
    id: 'priority-ai-transparency',
    detailRiskId: 'ai-transparency-obligation',
    title: '생성형 AI 투명성 의무',
    marketGrade: 'A',
    score: 3.9,
    summary: 'AI 콘텐츠 표시·설명 의무 변화에 따라 기업의 관리·배상 책임이 확대될 수 있습니다.',
  },
  {
    id: 'priority-mydata-transfer',
    detailRiskId: 'mydata-portability-demand',
    title: '마이데이터 전송사고',
    marketGrade: 'A',
    score: 3.9,
    summary: '개인정보 전송 오류와 오발송으로 인한 분쟁·배상책임 위험을 검토합니다.',
  },
  {
    id: 'priority-commercial-drone',
    detailRiskId: 'commercial-drone',
    title: '상업용 드론 사고',
    marketGrade: 'A',
    score: 3.7,
    summary: '드론 운항자·플랫폼·시설 사이 책임 분리와 제3자 손해를 확인하는 위험입니다.',
  },
]

export const riskRadarTopPriority = {
  detailRiskId: 'ev-battery-fire',
  reportId: 'RPT-EVFIRE-001-20260228',
  title: '전기차 배터리 화재',
  summary: '지하주차장 내 배터리 열폭주와 인접 차량·시설의 2차 피해 가능성이 함께 검토되는 위험입니다.',
  marketScore: 'A · 84점',
  totalScore: '4.4 / 5점',
}

export const riskRadarCandidates: RiskRadarCandidate[] = [
  {
    id: 'candidate-ev-battery-fire',
    detailRiskId: 'ev-battery-fire',
    title: '전기차 배터리 화재',
    description: '배터리 열폭주와 지하주차장 내 연쇄 피해 가능성',
    tags: ['모빌리티', '법·규제', '사고 사례'],
    keywords: ['전기차 화재', '배터리 열폭주', '보장 공백', '배상책임'],
  },
  {
    id: 'candidate-medical-liability',
    detailRiskId: 'medical-liability-insurance',
    title: '의료기관 책임보험 의무',
    description: '책임보험 가입 의무 신설에 따른 신규 보험 수요',
    tags: ['의료', '법령 개정'],
    keywords: ['책임보험 의무', '법·규제 변화', '배상책임'],
  },
  {
    id: 'candidate-ai-transparency',
    detailRiskId: 'ai-transparency-obligation',
    title: '생성형 AI 투명성 의무',
    description: 'AI 콘텐츠 표시·설명 의무 변화에 따른 기업 책임 확대',
    tags: ['AI·디지털', '법·규제'],
    keywords: ['생성형 AI', '법·규제 변화', '기업 책임 확대', '배상책임'],
  },
  {
    id: 'candidate-mydata-transfer',
    detailRiskId: 'mydata-portability-demand',
    title: '마이데이터 전송사고',
    description: '개인정보 전송 오류와 오발송에 따른 배상책임 위험',
    tags: ['개인정보', '배상책임'],
    keywords: ['마이데이터', '배상책임', '보장 공백'],
  },
]

export const riskRadarRegulations: RiskRadarRegulation[] = [
  {
    id: 'regulation-medical-liability',
    source: '국회 · 공포',
    title: '의료기관 책임보험 가입 의무 신설',
    description: '보건의료기관의 책임보험 또는 책임공제 가입 의무가 마련됐습니다.',
    relatedRisk: '의료기관 책임보험',
    detailRiskId: 'medical-liability-insurance',
  },
  {
    id: 'regulation-disaster-insurance',
    source: '행정안전부 · 고시',
    title: '재난안전의무보험 운영 기준 개정',
    description: '의무보험의 관리·운영 기준과 책임 범위가 정비됐습니다.',
    relatedRisk: '의무보험 확대',
    detailRiskId: 'medical-liability-insurance',
  },
  {
    id: 'regulation-ev-safety',
    source: '정책성 보험 · 안전관리',
    title: '전기차 화재안심보험 및 배터리 안전관리',
    description: '전기차 화재 확산과 충전시설 위험에 대응하는 정책이 추진되고 있습니다.',
    relatedRisk: '전기차 배터리 화재',
    detailRiskId: 'ev-battery-fire',
  },
]

export const riskRadarMarketTrends: RiskRadarMarketTrend[] = [
  {
    id: 'market-smart-factory',
    company: '한빛손해보험',
    title: '스마트팩토리 운영중단 보장 특약',
    status: '배타적사용권 부여',
    statusKey: 'granted',
    statusLabel: '배타적사용권 부여',
    summary: '설비 사고 이후 생산 재개 지연과 추가 복구비용을 함께 보장하는 구조입니다.',
    date: '2026.08.04',
    sourceType: '협회 공시',
    detailRiskId: 'enterprise-ransomware',
  },
  {
    id: 'market-ai-liability',
    company: '새롬손해보험',
    title: 'AI 서비스 오류 배상책임 특약',
    status: '배타적사용권 신청',
    statusKey: 'applied',
    statusLabel: '배타적사용권 신청',
    summary: '생성형 AI의 잘못된 결과로 발생한 제3자 손해와 대응비용을 보장합니다.',
    date: '2026.08.02',
    sourceType: '협회 공시',
    detailRiskId: 'generative-ai-copyright',
  },
  {
    id: 'market-ev-charging',
    company: '다온손해보험',
    title: '전기차 충전시설 종합안심보험',
    status: '신상품 출시',
    statusKey: 'launched',
    statusLabel: '신상품 출시',
    summary: '충전시설 재물손해와 이용자 배상책임을 하나의 계약으로 구성했습니다.',
    date: '2026.07.31',
    sourceType: '보험사 자료',
    detailRiskId: 'ev-battery-fire',
  },
]

export const riskRadarMarketUpdates: RiskRadarMarketUpdate[] = [
  {
    id: 'market-update-ai-control',
    source: '금융당국 정책자료',
    date: '08.04',
    title: '금융권 AI 활용 내부통제 기준 마련 추진',
    reviewPoint: '기업의 AI 관리 책임과 전문인배상 보장 수요에 연결될 수 있습니다.',
    keyword: '생성형 AI',
  },
  {
    id: 'market-update-ev-safety',
    source: '안전관리 공식자료',
    date: '08.03',
    title: '지하주차장 전기차 충전시설 안전기준 강화 논의',
    reviewPoint: '시설관리자의 책임 범위와 화재 관련 보장 구조 검토에 참고할 수 있습니다.',
    keyword: '전기차 화재',
  },
]

export const industryProductTrends: RiskRadarMarketTrend[] = riskRadarMarketTrends

export const exclusiveRights: ExclusiveRight[] = riskRadarMarketTrends
  .filter((item) => item.statusKey !== 'launched')
  .map(({ id, company, title, statusKey, statusLabel, summary, date, sourceType }) => ({
    id,
    company,
    title,
    statusKey,
    statusLabel,
    summary,
    date,
    sourceType,
    sourceUrl: null,
  }))

export const recentInsuranceProducts: RecentInsuranceProduct[] = [
  {
    id: 'recent-product-ev-charging',
    company: '다온손해보험',
    title: '전기차 충전시설 종합안심보험',
    summary: '충전시설 재물손해와 이용자 배상책임을 하나의 계약으로 구성했습니다.',
    date: '2026.07.31',
    sourceType: '보험사 자료',
    sourceUrl: null,
  },
  {
    id: 'recent-product-cyber-recovery',
    company: '미래손해보험',
    title: '중소기업 사이버 복구비용 특약',
    summary: '사이버 사고 이후 데이터 복구비와 영업중단 비용을 보장합니다.',
    date: '2026.07.29',
    sourceType: '보험사 자료',
    sourceUrl: null,
  },
  {
    id: 'recent-product-commercial-drone',
    company: '새롬손해보험',
    title: '상업용 드론 운항 배상책임보험',
    summary: '상업용 드론 사고로 발생한 제3자 신체·재물 손해를 보장합니다.',
    date: '2026.07.26',
    sourceType: '보험사 자료',
    sourceUrl: null,
  },
]

export const marketUpdates: MarketUpdate[] = [
  {
    id: 1,
    type: '국내 정책',
    source: '금융당국 정책자료',
    date: '08.04',
    title: '금융권 AI 활용 내부통제 기준 마련 추진',
    insight: '기업의 AI 관리 책임과 전문인배상 보장 수요에 연결될 수 있습니다.',
    relatedTopic: 'AI 전문인배상·관리책임',
    sourceUrl: null,
  },
  {
    id: 2,
    type: '안전관리',
    source: '시설안전 정책자료',
    date: '08.03',
    title: '지하주차장 전기차 충전시설 안전관리 기준 강화',
    insight: '충전시설 관리주체의 점검·대응 책임과 화재 관련 보장 수요 검토에 참고할 수 있습니다.',
    relatedTopic: '전기차 충전시설·시설관리자 책임',
    sourceUrl: null,
  },
]

export const globalInsuranceInsights: GlobalInsuranceInsight[] = [
  {
    id: 'global-insight-ai-aggregation',
    organization: 'SWISS RE',
    title: 'AI 책임과 사이버 집적위험',
    summary: 'AI 서비스 확산에 따른 제3자 책임과 다수 기업에 동시에 영향을 미치는 집적위험을 다룹니다.',
    relatedRisk: '생성형 AI 배상책임',
    keyword: '생성형 AI',
  },
  {
    id: 'global-insight-natural-catastrophe',
    organization: 'MUNICH RE',
    title: '자연재해와 시설 운영중단 위험',
    summary: '자연재해와 설비 손상이 기업의 생산중단 및 장기 복구비용으로 이어지는 위험을 다룹니다.',
    relatedRisk: '기업휴지·설비 위험',
    keyword: '기업휴지',
  },
]

export const riskRadarScraps: RiskRadarScrap[] = [
  { id: 'scrap-ev-fire', title: '전기차 지하주차장 화재', conclusion: '상품 개발 검토 가치 있음', reportId: 'RPT-EVFIRE-001-20260228' },
  { id: 'scrap-ai-data-center', title: 'AI 데이터센터 신형 설비 위험', conclusion: '신규 담보 검토 가능', reportId: 'SAMPLE-RPT-DIGITAL-002' },
  { id: 'scrap-ai-liability', title: '생성형 AI 저작권·배상책임', conclusion: '기업 배상책임 검토', reportId: 'SAMPLE-RPT-WORK-004' },
]

export const riskRadarKeywords: RiskRadarKeyword[] = [
  { label: '생성형 AI', tone: 'tech', size: 'lg', filter: '생성형 AI' },
  { label: '전기차 화재', tone: 'loss', size: 'lg', filter: '전기차 화재' },
  { label: '책임보험 의무', tone: 'issue', size: 'md', filter: '책임보험 의무' },
  { label: '마이데이터', tone: 'tech', size: 'md', filter: '마이데이터' },
  { label: '배상책임', tone: 'issue', size: 'lg', filter: '배상책임' },
  { label: '보장 공백', tone: 'issue', size: 'md', filter: '보장 공백' },
  { label: '법·규제 변화', tone: 'tech', size: 'sm', filter: '법·규제 변화' },
  { label: '배터리 열폭주', tone: 'loss', size: 'sm', filter: '배터리 열폭주' },
  { label: '기업 책임 확대', tone: 'issue', size: 'sm', filter: '기업 책임 확대' },
]

export const riskRadarSourceShares: RiskRadarSourceShare[] = [
  { label: '해외 보험·재보험', share: 30, role: '해외 보장 사례와 상품 구조 확인', tone: 'orange' },
  { label: '보험 전문연구', share: 25, role: '시장성·보험성 및 위험 특성 검토', tone: 'navy' },
  { label: '법령·감독자료', share: 35, role: '의무·책임 범위와 제도 변화 확인', tone: 'blue' },
  { label: '뉴스·공식자료', share: 10, role: '사고 사례와 산업 변화 확인', tone: 'mist' },
]
