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
  category?: string
  score: number
  summary: string
  detectionSummary: string
  evidence: RiskRadarEvidence[]
}

export type RiskRadarEvidence = {
  type: string
  title: string
  source: string
  date: string
  sourceUrl: string | null
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
  statusDetail: string
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
  displayDate: string
  title: string
  insight: string
  relatedTopic: string
  sourceUrl: string | null
}

export type GlobalInsuranceInsight = {
  id: string
  organization: string
  date: string
  displayDate: string
  title: string
  summary: string
  relatedRisk: string
  sourceType: string
  sourceTitle: string
  sourceUrl: string | null
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
  count?: number
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
    detectionSummary: '사고 피해 확대와 충전시설 관리주체의 책임 변화가 여러 자료에서 함께 확인됐습니다.',
    evidence: [
      { type: '사고 사례', title: '지하주차장 화재로 인접 차량과 공동시설까지 피해가 확대된 사례', source: '소방·안전 공식자료', date: '2026.07', sourceUrl: null },
      { type: '법·규제', title: '충전시설 점검과 관리주체의 안전관리 책임 강화', source: '시설안전 정책자료', date: '2026.06', sourceUrl: null },
      { type: '보험 연구', title: '배터리 열폭주가 대형손실로 확대될 가능성 검토', source: '보험 전문연구', date: '2026.05', sourceUrl: null },
    ],
  },
  {
    id: 'priority-medical-liability',
    detailRiskId: 'medical-liability-insurance',
    title: '의료기관 책임보험 의무',
    marketGrade: 'S',
    score: 4.0,
    summary: '의료기관의 책임보험 가입 의무 변화가 신규 보장 수요로 이어질 가능성을 살펴봅니다.',
    detectionSummary: '의무가입 제도 변화와 의료분쟁 손해, 해외 의무보험 사례가 함께 연결됐습니다.',
    evidence: [
      { type: '법·규제', title: '의료기관 책임보험 가입 의무 도입과 보장 범위 논의', source: '국회·보건 정책자료', date: '2026.07', sourceUrl: null },
      { type: '분쟁 사례', title: '의료사고 배상과 분쟁조정에서 반복적으로 확인되는 손해 유형', source: '분쟁조정 공식자료', date: '2026.06', sourceUrl: null },
      { type: '보험 연구', title: '의료배상책임의 보험성 및 잠재 수요 검토', source: '보험 전문연구', date: '2026.05', sourceUrl: null },
      { type: '해외 보험자료', title: '의료기관 의무보험의 가입 대상과 보장 구조 비교', source: '글로벌 보험 리포트', date: '2026.04', sourceUrl: null },
    ],
  },
  {
    id: 'priority-ai-transparency',
    detailRiskId: 'ai-transparency-obligation',
    title: '생성형 AI 투명성 의무',
    marketGrade: 'A',
    score: 3.9,
    summary: 'AI 콘텐츠 표시·설명 의무 변화에 따라 기업의 관리·배상 책임이 확대될 수 있습니다.',
    detectionSummary: 'AI 규제 변화와 오정보·저작권 분쟁, 기술 E&O 보장 사례가 함께 포착됐습니다.',
    evidence: [
      { type: '법·규제', title: 'AI 생성물 표시와 설명 의무 강화 움직임', source: '디지털 정책자료', date: '2026.07', sourceUrl: null },
      { type: '분쟁 사례', title: '오정보·저작권·명예훼손과 관련한 기업 책임 가능성', source: '법률·분쟁 자료', date: '2026.06', sourceUrl: null },
      { type: '해외 보험자료', title: 'AI 책임과 기술 E&O 관련 해외 보장 사례', source: '글로벌 보험 리포트', date: '2026.05', sourceUrl: null },
    ],
  },
  {
    id: 'priority-mydata-transfer',
    detailRiskId: 'mydata-portability-demand',
    title: '마이데이터 전송사고',
    marketGrade: 'A',
    score: 3.9,
    summary: '개인정보 전송 오류와 오발송으로 인한 분쟁·배상책임 위험을 검토합니다.',
    detectionSummary: '데이터 전송 확대와 개인정보 안전조치 의무, 실제 전송 오류 사례가 핵심 근거로 확인됐습니다.',
    evidence: [
      { type: '법·규제', title: '전송요구권 확대와 데이터 안전조치 의무 강화', source: '개인정보 정책자료', date: '2026.07', sourceUrl: null },
      { type: '사고 사례', title: '오발송·전송 오류로 발생한 개인정보 유출과 대응비용', source: '공식 사고자료', date: '2026.06', sourceUrl: null },
    ],
  },
  {
    id: 'priority-commercial-drone',
    detailRiskId: 'commercial-drone',
    title: '상업용 드론 사고',
    marketGrade: 'A',
    score: 3.7,
    summary: '드론 운항자·플랫폼·시설 사이 책임 분리와 제3자 손해를 확인하는 위험입니다.',
    detectionSummary: '운항 확대와 제3자 피해 사례, 사업용 드론 보험 구조가 주요 근거로 연결됐습니다.',
    evidence: [
      { type: '사고 사례', title: '추락·충돌로 발생한 제3자 신체 및 재물 피해', source: '항공안전 공식자료', date: '2026.07', sourceUrl: null },
      { type: '법·규제', title: '상업용 드론 운항과 안전관리 기준 변화', source: '항공 정책자료', date: '2026.06', sourceUrl: null },
      { type: '해외 보험자료', title: '사업용 드론 전용 배상책임보험의 보장 구조 비교', source: '글로벌 보험 리포트', date: '2026.05', sourceUrl: null },
    ],
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

export const exclusiveRights: ExclusiveRight[] = [
  {
    id: 'hanwha-child-insurance-2026',
    company: '한화손해보험',
    title: '성조숙증 등 진단검사지원비 보장',
    statusKey: 'granted',
    statusLabel: '배타적사용권 부여',
    summary: '성조숙증 등의 진단 과정에서 발생하는 검사비를 보장하는 어린이보험 신담보입니다.',
    statusDetail: '6개월 부여',
    date: '2026.07.28',
    sourceType: '보험업계 기사',
    sourceUrl: 'https://www.etoday.co.kr/news/view/2606253',
  },
  {
    id: 'hyundai-fetal-test-2026',
    company: '현대해상',
    title: '태아이상 진단 후 융모막·양수검사 비용 보장 특약',
    statusKey: 'applied',
    statusLabel: '배타적사용권 신청',
    summary: '태아이상 진단 후 시행하는 융모막검사와 양수검사 비용을 보장하는 특약입니다.',
    statusDetail: '손해보험협회 심사 대기',
    date: '2026.07.28',
    sourceType: '보험업계 기사',
    sourceUrl: 'https://www.etoday.co.kr/news/view/2606253',
  },
]

const parseProductDate = (value: string) => {
  const [year, month, day] = value.split('.').map(Number)
  return Date.UTC(year, month - 1, day)
}

export const recentInsuranceProducts: RecentInsuranceProduct[] = [
  {
    id: 'lotte-water-play-2026',
    company: '롯데손해보험',
    title: 'CREW 물놀이 갈땐 보험',
    summary: '물놀이 중 발생할 수 있는 골절·수술·후유장해와 국내여행 중 배상책임 등을 보장하는 생활밀착형 보험입니다.',
    date: '2026.07.07',
    sourceType: '롯데손해보험 공식 상품',
    sourceUrl: 'https://alice.lotteins.co.kr/product/waterPlay/main',
  },
  {
    id: 'kyobo-modu-jikim-2026',
    company: '교보생명',
    title: '교보모두지킴종신보험',
    summary: '납입보험료 상당액을 생활·노후자금으로 활용한 이후에도 사망보장을 유지할 수 있도록 설계한 종신보험입니다.',
    date: '2026.06.29',
    sourceType: '교보생명 공식 뉴스룸',
    sourceUrl: 'https://news.kyobo.com/%EB%B3%B4%ED%97%98%EB%A3%8C-%EB%8F%8C%EB%A0%A4%EB%B0%9B%EC%95%84%EB%8F%84-%EC%82%AC%EB%A7%9D%EB%B3%B4%EC%9E%A5-%EA%B7%B8%EB%8C%80%EB%A1%9C-%EA%B5%90%EB%B3%B4%EB%AA%A8%EB%91%90%EC%A7%80%ED%82%B4/',
  },
  {
    id: 'kb-healthcare-plus-2026',
    company: 'KB손해보험',
    title: 'KB 헬스케어+ 건강보험',
    summary: '건강관리 플랫폼과 보험 보장을 결합하고 암·뇌·심장질환 등 주요 질병 보장을 강화한 건강관리형 보험입니다.',
    date: '2026.06.15',
    sourceType: 'KB손해보험 공식 뉴스룸',
    sourceUrl: 'https://insight.kbinsure.co.kr/260615-kbhealthcareplus-healthinsurance/',
  },
].sort((left, right) => parseProductDate(right.date) - parseProductDate(left.date))

export const marketUpdates: MarketUpdate[] = [
  {
    id: 'insurance-commission-reform-2026',
    type: '국내 정책',
    source: '금융위원회 보험과',
    date: '2026.06.30',
    displayDate: '06.30',
    title: '보험 판매수수료 제도개선 7월 시행',
    insight: 'GA 1,200%룰 확대와 대형 GA의 판매수수료 비교·설명 의무 강화로 상품별 수수료와 판매채널 전략을 함께 검토할 필요가 있습니다.',
    relatedTopic: '판매채널·상품 비교설명',
    sourceUrl: 'https://www.fsc.go.kr/no010101/87217',
  },
  {
    id: 'actuarial-kics-standards-2026',
    type: '계리·건전성',
    source: '금융위원회 보험과',
    date: '2026.06.29',
    displayDate: '06.29',
    title: '신규담보 손해율 가정·K-ICS 기준 강화',
    insight: '통계가 충분하지 않은 신규담보에 보수적 손해율 가정이 적용돼 신담보의 가격·수익성·출시 전략에 영향을 줄 수 있습니다.',
    relatedTopic: '신규담보 손해율·상품가격',
    sourceUrl: 'https://www.fsc.go.kr/po010106/87205',
  },
]

export const globalInsuranceInsights: GlobalInsuranceInsight[] = [
  {
    id: 'swiss-re-ai-infrastructure-2026',
    organization: 'SWISS RE',
    date: '2026.07.08',
    displayDate: '07.08',
    title: 'AI 인프라 투자와 복합 기업위험',
    summary: 'AI 데이터센터와 에너지 인프라 확대에 따라 재물·기술·사이버·배상책임·영업중단 위험이 함께 커질 수 있습니다.',
    relatedRisk: 'AI 데이터센터·공급망·기업휴지',
    sourceType: 'Swiss Re Institute 공식자료',
    sourceTitle: 'World insurance in 2026: Shock absorbers in a fragmenting world',
    sourceUrl: 'https://www.swissre.com/press-release/USD-750-billion-AI-investment-boom-and-geopolitical-fragmentation-reshape-insurance-landscape-says-Swiss-Re-Institute/a615185d-97e1-4b52-a6df-a614257d8b2b',
  },
  {
    id: 'munich-re-personal-cyber-2026',
    organization: 'MUNICH RE',
    date: '2026.07.02',
    displayDate: '07.02',
    title: '개인 사이버보험의 보호 격차',
    summary: '계정 해킹·신원도용·온라인 사기가 늘지만 위험 인식은 낮아 개인 사이버보험의 보장과 서비스 확대가 필요합니다.',
    relatedRisk: '개인 사이버·디지털 사기',
    sourceType: 'Munich Re 공식 인사이트',
    sourceTitle: 'Global Cyber Risk and Insurance Survey 2026: Personal Lines',
    sourceUrl: 'https://www.munichre.com/en/insights/cyber/global-cyber-risk-and-insurance-survey-2026-personal-lines.html',
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
