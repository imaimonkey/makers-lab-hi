export type ExplorationCategory = 'individual' | 'corporate' | 'legal' | 'department' | 'customer'
export type PrimaryRiskCategory = 'personal' | 'corporate' | 'regulatory'
export type RiskSignalOrigin = 'public-evidence' | 'department-intake' | 'customer-intake'

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

export type RiskExplorationContentInsight = {
  topic: string
  event: string
  facts: string[]
  signals: Array<{ label: string; value: string; basis: string; tone: string }>
  reviewActions: string[]
}

export type RiskExplorationRecord = {
  id: string
  detailRiskId: string
  title: string
  summary: string
  tags: string[]
  /** Legacy tag field retained for downstream contracts; use secondaryTags for screening display. */
  secondaryTags: string[]
  primaryCategory: PrimaryRiskCategory
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
  sourceUrl?: string
  collectedAt?: string
  contentInsight?: RiskExplorationContentInsight
  facts?: string[]
  metrics?: Array<{ label: string; value: string; sourceHint?: string }>
  /** 접수 원천과 검증 근거를 분리한다. 공개 근거가 접수 원문을 뜻하지는 않는다. */
  signalOrigin?: RiskSignalOrigin
  display: RiskExplorationDisplay
  gap: string
  nextAction: string
}

const MIN_METRIC_SCORE = 1
const MAX_METRIC_SCORE = 5

const clampMetricScore = (score: number) => Math.min(MAX_METRIC_SCORE, Math.max(MIN_METRIC_SCORE, score))

const primaryCategoryByRiskId: Record<string, PrimaryRiskCategory> = {
  'ai-transparency-obligation': 'regulatory',
  'mydata-portability-demand': 'regulatory',
  'heatwave-workplace-duty': 'regulatory',
  'kuam-urban-pilot': 'regulatory',
  'ai-voice-investigation': 'personal',
  'medical-liability-insurance': 'regulatory',
  'sns-impersonation-commerce': 'personal',
  'ota-delivery-consumer-disputes': 'personal',
  'ev-battery-fire': 'regulatory',
  'generative-ai-copyright': 'regulatory',
  'commercial-drone': 'regulatory',
  'autonomous-level4': 'regulatory',
  'deepfake-phishing': 'personal',
  'urban-flooding': 'regulatory',
  'enterprise-ransomware': 'corporate',
  'ess-ups-battery-fire': 'corporate',
  'heatwave-health-income-loss': 'personal',
  'platform-worker-transit-accident': 'personal',
}

export function getPrimaryRiskCategory(id: string, categories: ExplorationCategory[] = []): PrimaryRiskCategory {
  return primaryCategoryByRiskId[id]
    ?? (categories.includes('legal') ? 'regulatory' : categories.includes('individual') ? 'personal' : 'corporate')
}

type EvidenceBackedRecordInput = {
  id: string
  title: string
  summary: string
  tags: string[]
  categories: ExplorationCategory[]
  metricScores: RiskExplorationMetricScores
  sourceId: string
  sourceName: string
  sourceUrl: string
  collectedAt: string
  sourceQuote: string
  signalOrigin?: RiskSignalOrigin
  legalShort: string
  gap: string
  nextAction: string
}

function scoreLevel(score: number) {
  if (score >= 4) return '높음'
  if (score >= 3) return '보통'
  return '낮음'
}

function scoreDots(score: number) {
  const filled = Math.round(clampMetricScore(score))
  return `${'●'.repeat(filled)}${'○'.repeat(5 - filled)}`
}

function createEvidenceBackedRecord(input: EvidenceBackedRecordInput): RiskExplorationRecord {
  const { metricScores } = input
  const demandPercent = Math.round(clampMetricScore(metricScores.demand) * 20)
  const dataConfidencePercent = Math.round(clampMetricScore(metricScores.dataConfidence) * 20)
  const evidence = (scoreRationale: string): RiskExplorationMetricEvidence => ({
    reasons: [input.sourceQuote],
    sourceIds: [input.sourceId],
    quotes: [input.sourceQuote],
    judgment: '공식 공개자료에서 확인된 신호를 위험 후보 가설로 연결한 예비 판단입니다.',
    scoreRationale,
    confidence: '높음',
    evidenceStatus: 'verified',
    counterEvidence: ['공식 자료는 위험 신호를 보여주지만 사고 빈도·보험 손해액을 확정하지 않습니다.'],
    uncertainty: ['보험 청구·손해액·보장 공백은 별도 원문과 내부 데이터 확인이 필요합니다.'],
  })
  const screeningScore = calculateRiskExplorationScore(metricScores)

  return {
    id: input.id,
    detailRiskId: input.id,
    title: input.title,
    summary: input.summary,
    tags: input.tags,
    secondaryTags: input.tags,
    primaryCategory: getPrimaryRiskCategory(input.id, input.categories),
    categories: input.categories,
    demand: `${scoreLevel(metricScores.demand)} · ${demandPercent}%`,
    fortuity: `${scoreLevel(metricScores.fortuity)} · ${metricScores.fortuity}/5`,
    accumulation: `${scoreLevel(metricScores.accumulation)} · ${metricScores.accumulation}/5`,
    measurability: `${scoreLevel(metricScores.measurability)} · ${metricScores.measurability}/5`,
    adverseSelection: scoreLevel(metricScores.adverseSelection),
    moralHazard: scoreLevel(metricScores.moralHazard),
    dataConfidence: `${dataConfidencePercent}%`,
    legalExposure: scoreLevel(metricScores.legalExposure),
    metricScores,
    metricEvidence: {
      demand: evidence('공개 신호 강도 + 확산·제도 변화의 지속성 + 실제 노출 대상 확인'),
      legalExposure: evidence('법률·규제 변화의 직접성 + 책임 주체의 불확실성 + 준수 비용'),
      dataConfidence: evidence('공식 기관 원문 + 발행 시점 + 구체적 사례·통계 확인'),
    },
    evidenceIds: [input.sourceId],
    articleId: `official-${input.id}`,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    collectedAt: input.collectedAt,
    signalOrigin: input.signalOrigin
      ?? (input.categories.includes('customer') ? 'customer-intake' : input.categories.includes('department') ? 'department-intake' : 'public-evidence'),
    display: {
      demandVal: `${scoreLevel(metricScores.demand)} (${demandPercent}%)`,
      fortVal: scoreDots(metricScores.fortuity),
      fortuityDots: Math.round(metricScores.fortuity),
      accumVal: scoreDots(metricScores.accumulation),
      accumulationDots: Math.round(metricScores.accumulation),
      measVal: scoreDots(metricScores.measurability),
      measurabilityDots: Math.round(metricScores.measurability),
      adverseVal: scoreLevel(metricScores.adverseSelection),
      moralVal: scoreLevel(metricScores.moralHazard),
      dataVal: `${dataConfidencePercent}%`,
      dataConfidencePercent,
      riskLabel: screeningScore >= 4 ? '🔴 고위험' : screeningScore >= 3 ? '🟡 중위험' : '🟢 저위험',
      riskSub: input.legalShort,
      legalRiskSub: input.legalShort,
    },
    gap: input.gap,
    nextAction: input.nextAction,
  }
}

const evidenceBackedRecords: RiskExplorationRecord[] = [
  createEvidenceBackedRecord({
    id: 'ai-transparency-obligation',
    title: '생성형 AI 투명성 의무 대응',
    summary: 'AI 기본법 투명성 의무와 생성형 AI 콘텐츠 표시 기준 변화에 따른 기업 책임 노출',
    tags: ['기업', 'AI', '법률'],
    categories: ['corporate', 'legal', 'department'],
    signalOrigin: 'department-intake',
    metricScores: { demand: 4.2, fortuity: 3.4, accumulation: 4.1, measurability: 3.8, adverseSelection: 3.2, moralHazard: 3.6, dataConfidence: 4.5, legalExposure: 4.6 },
    sourceId: 'MSIT-AI-TRANSPARENCY-20260122',
    sourceName: '과학기술정보통신부 · AI 투명성 확보 가이드라인',
    sourceUrl: 'https://www.msit.go.kr/eng/bbs/view.do?bbsSeqNo=42&mId=4&mPid=2&nttSeqNo=1215&sCode=eng',
    collectedAt: '2026-01-22T00:00:00.000Z',
    sourceQuote: '과학기술정보통신부는 AI 기본법 제31조 투명성 의무의 이행방법과 생성형 AI 콘텐츠 표시사항을 안내했다.',
    legalShort: 'AI 투명성 의무',
    gap: 'AI 생성물 표시·고지 이행과 사고 시 책임 주체별 손해 데이터 부족',
    nextAction: 'AI 사용 고지·표시 로그와 기업별 통제 수준을 인수 기준으로 분리 검토',
  }),
  createEvidenceBackedRecord({
    id: 'mydata-portability-demand',
    title: '전 분야 마이데이터 전송사고',
    summary: '개인정보 전송요구권 본격 시행으로 데이터 이동 과정의 오남용·전송 오류 책임 확대',
    tags: ['개인', '기업', '개인정보'],
    categories: ['individual', 'corporate', 'legal', 'department'],
    signalOrigin: 'department-intake',
    metricScores: { demand: 3.9, fortuity: 3.5, accumulation: 4.2, measurability: 3.4, adverseSelection: 3.7, moralHazard: 3.5, dataConfidence: 4.3, legalExposure: 4.4 },
    sourceId: 'PIPC-MYDATA-20250313',
    sourceName: '개인정보보호위원회 · 개인정보 전송요구권 제도 안내서',
    sourceUrl: 'https://m.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=G010030030&nttId=11076',
    collectedAt: '2025-03-24T00:00:00.000Z',
    sourceQuote: '개인정보보호위원회는 2025년 3월 13일부터 전 분야 마이데이터 개인정보 전송요구권이 본격 시행된다고 안내했다.',
    legalShort: '개인정보 전송요구권',
    gap: '전송 API 오류·제3자 제공·동의 철회 이후 잔존 데이터의 손해 통계 부족',
    nextAction: '전송사업자·정보수신자·전문기관별 사고 대응과 책임 분담을 확인',
  }),
  createEvidenceBackedRecord({
    id: 'heatwave-workplace-duty',
    title: '폭염 작업장 온열질환 의무',
    summary: '폭염을 건강위험 요인으로 보고 사업주 예방조치를 구체화한 산업안전 규정 변화',
    tags: ['기업', '고용', '기후'],
    categories: ['corporate', 'legal', 'department'],
    signalOrigin: 'department-intake',
    metricScores: { demand: 3.8, fortuity: 3.7, accumulation: 3.8, measurability: 4.1, adverseSelection: 3.1, moralHazard: 2.8, dataConfidence: 4.6, legalExposure: 4.1 },
    sourceId: 'MOEL-HEATWAVE-GUIDE-20250715',
    sourceName: '고용노동부 · 폭염 대비 온열질환 예방 사업장 대응지침',
    sourceUrl: 'https://www.moel.go.kr/policy/policydata/view.do?bbs_seq=20250700849',
    collectedAt: '2025-07-15T00:00:00.000Z',
    sourceQuote: '고용노동부는 산업안전보건기준에 관한 규칙 개정·시행에 앞서 폭염 대응지침과 사업장 온열질환 예방체계를 안내했다.',
    legalShort: '폭염 예방조치 의무',
    gap: '기온·작업강도·휴식 이력과 실제 온열질환 손해를 연결한 사업장별 데이터 부족',
    nextAction: '작업환경 기록·휴식·보냉조치 이력과 상해 보장 조건의 연계를 검토',
  }),
  createEvidenceBackedRecord({
    id: 'kuam-urban-pilot',
    title: 'K-UAM 도심 실증 운항사고',
    summary: '도심항공교통의 민간 실증 확대에 따른 운항·교통관리·버티포트 제3자 위험',
    tags: ['기업', '모빌리티', '부처'],
    categories: ['corporate', 'legal', 'department'],
    signalOrigin: 'department-intake',
    metricScores: { demand: 4.0, fortuity: 4.2, accumulation: 4.4, measurability: 2.9, adverseSelection: 2.8, moralHazard: 2.7, dataConfidence: 4.0, legalExposure: 4.2 },
    sourceId: 'MOLIT-KUAM-PILOT-20251022',
    sourceName: '국토교통부 · K-UAM 도심 민간기업 실증',
    sourceUrl: 'https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=95091326',
    collectedAt: '2025-10-22T00:00:00.000Z',
    sourceQuote: '국토교통부는 아라뱃길 상공에서 운항절차·교통관리·버티포트 운영을 점검하는 민간 K-UAM 도심 실증에 돌입했다고 발표했다.',
    legalShort: 'UAM 운항·책임 기준',
    gap: '초기 실증 운항의 사고 빈도·제3자 손해·운영자 책임 경계 데이터 부족',
    nextAction: '운항·정비·관제·버티포트 운영 주체별 사고 책임과 보상한도를 확인',
  }),
  createEvidenceBackedRecord({
    id: 'ai-voice-investigation',
    title: 'AI 음성복제 금융사기',
    summary: 'AI 기반 음성탐색 수사체계가 도입될 만큼 음성복제형 보이스피싱의 탐지·피해 대응 수요 확대',
    tags: ['개인', '금융사기', '부처'],
    categories: ['individual', 'customer', 'department', 'legal'],
    signalOrigin: 'department-intake',
    metricScores: { demand: 4.1, fortuity: 3.8, accumulation: 3.7, measurability: 3.2, adverseSelection: 2.2, moralHazard: 4.6, dataConfidence: 4.4, legalExposure: 3.8 },
    sourceId: 'MOIS-AIVOSS-20250801',
    sourceName: '행정안전부·국립과학수사연구원 · AI 음성탐색 시스템',
    sourceUrl: 'https://www.mois.go.kr/frt/bbs/type010/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000008&nttId=119420',
    collectedAt: '2025-08-01T00:00:00.000Z',
    sourceQuote: '행정안전부 국립과학수사연구원은 AI 기반 음성탐색시스템을 개발해 2025년 하반기 전국 수사기관에 제공할 예정이라고 밝혔다.',
    legalShort: '금융사기 책임·인증',
    gap: '음성복제 여부·피해자 과실·금융기관 인증 절차를 연결한 보상 기준 부족',
    nextAction: '피싱 탐지 로그와 금융기관 본인확인 절차를 피해 보상 조건과 함께 검토',
  }),
  createEvidenceBackedRecord({
    id: 'medical-liability-insurance',
    title: '의료기관 책임보험 가입 의무',
    summary: '의료사고 피해구제법 개정으로 일정 보건의료기관의 책임보험·책임공제 가입 의무가 신설',
    tags: ['기업', '의료', '법률'],
    categories: ['corporate', 'legal', 'department'],
    signalOrigin: 'public-evidence',
    metricScores: { demand: 4.5, fortuity: 4.0, accumulation: 3.7, measurability: 3.8, adverseSelection: 3.4, moralHazard: 2.8, dataConfidence: 4.8, legalExposure: 5 },
    sourceId: 'LAW-MEDICAL-LIABILITY-20260526',
    sourceName: '국가법령정보센터 · 의료사고 피해구제법 일부개정',
    sourceUrl: 'https://law.go.kr/LSW/lsInfoP.do?lsiSeq=286221&viewCls=lsRvsDocInfoR',
    collectedAt: '2026-05-26T00:00:00.000Z',
    sourceQuote: '의료사고 피해구제법은 일정한 보건의료기관개설자가 책임보험 또는 책임공제에 가입하여야 한다고 규정하고 2027년 5월 27일 시행 예정이다.',
    legalShort: '책임보험 가입 의무',
    gap: '대상 의료기관·연간 배상한도·미가입 제재와 보험료 산정 기준의 세부화 필요',
    nextAction: '시행령 배상한도와 대상 기관을 확인하고 의료배상책임 상품 구조를 검토',
  }),
  createEvidenceBackedRecord({
    id: 'sns-impersonation-commerce',
    title: 'SNS 사칭 쇼핑몰 미배송·가품',
    summary: 'SNS의 고할인 광고를 이용한 사칭 쇼핑몰에서 미배송·불량·가품 의심 피해가 발생',
    tags: ['개인', '소비자', '전자상거래'],
    categories: ['individual', 'customer', 'legal'],
    signalOrigin: 'customer-intake',
    metricScores: { demand: 3.9, fortuity: 3.6, accumulation: 3.2, measurability: 3.8, adverseSelection: 2.5, moralHazard: 4.4, dataConfidence: 4.7, legalExposure: 3.7 },
    sourceId: 'KCA-SNS-IMPERSONATION-20250313',
    sourceName: '한국소비자원·소비자24 · SNS 사칭 쇼핑몰 피해예방정보',
    sourceUrl: 'https://www.consumer.go.kr/user/ftc/consumer/cnsmrBBS/740/selectInfoCDMGCSLCDetail.do?cntntsId=00000347&infoId=A1080770',
    collectedAt: '2025-03-13T00:00:00.000Z',
    sourceQuote: '한국소비자원은 SNS의 60~90% 할인 광고를 통한 사칭 쇼핑몰에서 미배송·불량·가품 의심 피해가 발생할 수 있다고 안내했다.',
    legalShort: '전자상거래 분쟁',
    gap: '사업자 확인·결제 취소·차지백 가능 여부를 연결한 소비자 피해 데이터 부족',
    nextAction: '사업자 실재성 확인과 카드사 차지백 절차를 보장·지원 범위와 함께 검토',
  }),
  createEvidenceBackedRecord({
    id: 'ota-delivery-consumer-disputes',
    title: 'OTA 항공권·택배 소비자 피해',
    summary: '온라인 여행사 항공권과 택배의 취소·지연·오배송 피해가 반복되며 소비자 분쟁 및 보장 수요가 확대',
    tags: ['개인', '소비자', '여행·물류'],
    categories: ['individual', 'customer', 'legal'],
    signalOrigin: 'customer-intake',
    metricScores: { demand: 3.7, fortuity: 3.5, accumulation: 3.1, measurability: 4.2, adverseSelection: 2.6, moralHazard: 3.8, dataConfidence: 4.8, legalExposure: 3.4 },
    sourceId: 'KCA-OTA-PARCEL-DISPUTE-20260203',
    sourceName: '한국소비자원 · 항공권·택배·건강식품 소비자피해 정책연구',
    sourceUrl: 'https://www.kca.go.kr/home/sub.do?menukey=4002&mode=view&no=1004000918',
    collectedAt: '2026-02-03T00:00:00.000Z',
    sourceQuote: '한국소비자원은 2023~2025년 설 전후 피해구제 사건으로 항공권 1,218건, 택배 166건, 건강식품 202건을 제시했다.',
    legalShort: '소비자 계약·배상',
    gap: 'OTA·항공사·택배사 사이 취소·지연·오배송 책임과 손해액 표준화 부족',
    nextAction: '거래 단계별 책임 주체와 환불·대체운송·배송손해 기준을 유형화',
  }),
]

/** 보험화 우선순위: 8개 평가 지표를 동일 가중치로 원점수 그대로 계산합니다. */
export function calculateRiskExplorationScore(scores: RiskExplorationMetricScores): number {
  const total = riskExplorationMetricKeys.reduce((sum, key) => {
    return sum + clampMetricScore(scores[key])
  }, 0)

  return total / riskExplorationMetricKeys.length
}

function normalizeRiskExplorationRecord(record: RiskExplorationRecord): RiskExplorationRecord {
  const secondaryTags = record.secondaryTags ?? record.tags
  return {
    ...record,
    primaryCategory: record.primaryCategory ?? getPrimaryRiskCategory(record.id, record.categories),
    secondaryTags,
    tags: secondaryTags,
  }
}

/**
 * 후보 비교 렌즈용 샘플 데이터입니다. 실제 시장 수요·손해율·약관 판단을
 * 대체하지 않으며, 각 값은 공식 출처 연동 전 워크벤치 시연을 위한 예시입니다.
 */
function inferSignalOrigin(record: RiskExplorationRecord): RiskSignalOrigin {
  if (record.signalOrigin) return record.signalOrigin
  if (record.categories.includes('customer')) return 'customer-intake'
  if (record.categories.includes('department')) return 'department-intake'
  return 'public-evidence'
}

export const riskExplorationRecords: RiskExplorationRecord[] = ([
  {
    id: 'ev-battery-fire',
    detailRiskId: 'ev-battery-fire',
    title: '전기차 배터리 화재',
    summary: '보급 확대에 따른 배터리 열폭주와 지하주차장 2차 피해',
    tags: ['기업', '자동차'],
    categories: ['corporate', 'legal'],
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
    summary: '생성형 AI 활용 과정의 저작권 분쟁과 학습 데이터·생성물의 권리 책임',
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
    gap: '국내 판례와 실제 손해액 자료 부족',
    nextAction: 'AI 사용·저작권 관리 수준에 따른 보장 범위와 가입 조건 검토',
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
    tags: ['개인', '자동차', '제조물책임'],
    categories: ['individual', 'legal'],
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
    tags: ['기업', '금융'],
    categories: ['corporate', 'customer'],
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
    tags: ['기업', '기후'],
    categories: ['corporate', 'legal'],
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
  ...evidenceBackedRecords,
] as RiskExplorationRecord[]).map((record) => normalizeRiskExplorationRecord({ ...record, signalOrigin: inferSignalOrigin(record) }))
