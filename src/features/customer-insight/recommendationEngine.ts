import type { CustomerContextTag, ProductCatalogItem } from '../../domain/product/catalog'
import { productCatalog } from '../../domain/product/catalog'
import type { CustomerSignal, RiskTheme } from '../../domain/risk/types'

export type CustomerInsightInput = {
  lifeStage: string
  contexts: CustomerContextTag[]
  situation: string
  concernLevel: string
  insightConsent: boolean
}

export type ProductRecommendation = {
  product: ProductCatalogItem
  reason: string
  relevance: '높음' | '보통' | '탐색'
}

export type EmergingRiskFinding = {
  id: string
  theme: RiskTheme
  title: string
  keywords: string[]
  analystQuestion: string
  gapHypothesis: string
}

export type CustomerInsightResult = {
  recommendations: ProductRecommendation[]
  emergingRisks: EmergingRiskFinding[]
  redactedSituation: string
}

const contextLabels: Record<CustomerContextTag, string> = {
  business: '개인사업 운영',
  car: '자동차 보유',
  child: '자녀 돌봄',
  digital: '디지털 서비스 이용',
  driver: '운전 활동',
  family: '가족 생활',
  health: '건강 관리',
  home: '주거 생활',
  mobility: '새로운 이동수단',
  pet: '반려동물',
  travel: '여행·체류',
}

const contextKeywordRules: Array<{ tag: CustomerContextTag; keywords: string[] }> = [
  { tag: 'home', keywords: ['집', '아파트', '주택', '누수', '화재', '가전', '스마트홈'] },
  { tag: 'car', keywords: ['자동차', '차량', '차를', '자율주행'] },
  { tag: 'driver', keywords: ['운전', '대리운전'] },
  { tag: 'mobility', keywords: ['킥보드', '전동휠', '모빌리티', '자전거', '드론'] },
  { tag: 'child', keywords: ['아이', '자녀', '임신', '출산', '태아'] },
  { tag: 'pet', keywords: ['강아지', '고양이', '반려동물', '반려견', '반려묘'] },
  { tag: 'travel', keywords: ['여행', '해외', '출장', '워케이션'] },
  { tag: 'business', keywords: ['가게', '사업장', '자영업', '개인사업', '매장'] },
  { tag: 'health', keywords: ['건강', '질병', '치료', '병원', '수술'] },
  { tag: 'digital', keywords: ['온라인', 'AI', '인공지능', '딥페이크', '플랫폼', '가상자산', '스마트'] },
]

const emergingRiskRules: Array<Omit<EmergingRiskFinding, 'id' | 'keywords'> & { keywords: string[] }> = [
  {
    theme: 'ai-digital',
    title: '생성형 AI·딥페이크 생활 피해',
    keywords: ['AI', '인공지능', '생성형', '딥페이크', '챗봇', '가상자산', '해킹'],
    analystQuestion: '기존 사이버·배상책임·비용손해 담보가 개인의 AI 기반 피해를 어디까지 설명하는가?',
    gapHypothesis: '책임주체와 사고 원인이 불명확하고 기존 담보의 보험사고 정의와 맞지 않을 가능성',
  },
  {
    theme: 'climate-energy',
    title: '분산에너지·배터리 생활 위험',
    keywords: ['ESS', '배터리', '태양광', '충전기', '전기차', '폭염', '기후'],
    analystQuestion: '가정용 에너지 설비의 소유·임대·관리 주체별 손해와 배상책임을 구분할 수 있는가?',
    gapHypothesis: '신규 설비의 고장·화재·휴업·이웃 피해가 여러 담보에 분산될 가능성',
  },
  {
    theme: 'mobility',
    title: '개인형·자율 이동수단 사고',
    keywords: ['킥보드', '전동휠', '자율주행', '드론', 'UAM', '로봇배송'],
    analystQuestion: '탑승자·소유자·플랫폼·제조사 사이 책임과 기존 자동차보험의 경계를 어떻게 정의할 것인가?',
    gapHypothesis: '운행 주체와 책임 귀속이 기존 자동차·운전자 담보 체계와 다를 가능성',
  },
  {
    theme: 'platform-work',
    title: '플랫폼·원격근무 경계 위험',
    keywords: ['플랫폼노동', '배달', '프리랜서', '원격근무', '재택근무', '워케이션', '1인사업'],
    analystQuestion: '업무 중 사고와 일상 사고의 경계, 소득 중단 손해를 현재 상품이 설명할 수 있는가?',
    gapHypothesis: '고용관계와 업무 장소가 유동적이어서 보상 주체·업무상 사고 정의가 불명확할 가능성',
  },
  {
    theme: 'smart-living',
    title: '스마트홈·생활로봇 오작동',
    keywords: ['스마트홈', '로봇청소기', '돌봄로봇', '서빙로봇', '홈IoT', 'IoT', '스마트도어'],
    analystQuestion: '기기 결함, 소프트웨어 오류, 이용자 과실이 결합된 생활 손해의 책임을 구분할 수 있는가?',
    gapHypothesis: '재물손해와 개인정보·배상책임 손해가 동시에 발생할 수 있는 복합위험',
  },
  {
    theme: 'health-lifestyle',
    title: '웨어러블·디지털 헬스 의사결정 위험',
    keywords: ['웨어러블', '건강앱', '원격의료', '디지털치료', '헬스데이터'],
    analystQuestion: '부정확한 건강 정보와 기기 오류로 인한 손해가 현행 건강·배상책임 담보와 연결되는가?',
    gapHypothesis: '정보 오류와 신체 손해 사이 인과관계 입증 및 데이터 책임주체가 불명확할 가능성',
  },
]

export function redactSensitiveText(value: string): string {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[이메일 삭제]')
    .replace(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, '[연락처 삭제]')
    .replace(/\d{6}[-.\s]?[1-4]\d{6}/g, '[식별번호 삭제]')
    .replace(/\d{2,4}[-.\s]\d{2,4}[-.\s]\d{3,4}/g, '[번호 삭제]')
    .trim()
    .slice(0, 500)
}

function inferContextTags(input: CustomerInsightInput): CustomerContextTag[] {
  const text = input.situation.toLocaleLowerCase('ko-KR')
  const inferred = contextKeywordRules
    .filter((rule) => rule.keywords.some((keyword) => text.includes(keyword.toLocaleLowerCase('ko-KR'))))
    .map((rule) => rule.tag)

  return Array.from(new Set([...input.contexts, ...inferred]))
}

function rankProducts(tags: CustomerContextTag[], lifeStage: string): ProductRecommendation[] {
  const lifeStageBoosts: Partial<Record<string, CustomerContextTag[]>> = {
    'family-start': ['family', 'child', 'health'],
    'active-adult': ['health', 'driver', 'travel'],
    'mid-life': ['health', 'family', 'home'],
    'senior-life': ['health', 'family'],
  }
  const scoredTags = new Set([...tags, ...(lifeStageBoosts[lifeStage] ?? [])])

  return productCatalog
    .map((product) => {
      const matches = product.tags.filter((tag) => scoredTags.has(tag))
      return { product, matches, score: matches.length }
    })
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'ko'))
    .slice(0, 3)
    .map(({ product, matches, score }) => ({
      product,
      relevance: score >= 2 ? '높음' : score === 1 ? '보통' : '탐색',
      reason: matches.length
        ? `${matches.map((tag) => contextLabels[tag]).join('·')} 상황과 연결되는 기존 상품 후보입니다.`
        : '입력된 정보가 제한적이어서 폭넓은 생활 보장 후보로 제시합니다.',
    }))
}

function detectEmergingRisks(situation: string): EmergingRiskFinding[] {
  const normalized = situation.toLocaleLowerCase('ko-KR')
  return emergingRiskRules
    .map((rule, index) => {
      const matches = rule.keywords.filter((keyword) => normalized.includes(keyword.toLocaleLowerCase('ko-KR')))
      if (!matches.length) return null
      return {
        id: `finding-${index + 1}`,
        theme: rule.theme,
        title: rule.title,
        keywords: matches,
        analystQuestion: rule.analystQuestion,
        gapHypothesis: rule.gapHypothesis,
      }
    })
    .filter((finding): finding is EmergingRiskFinding => finding !== null)
}

export function analyzeCustomerSituation(input: CustomerInsightInput): CustomerInsightResult {
  const redactedSituation = redactSensitiveText(input.situation)
  const tags = inferContextTags(input)

  return {
    recommendations: rankProducts(tags, input.lifeStage),
    emergingRisks: detectEmergingRisks(redactedSituation),
    redactedSituation,
  }
}

export function buildCustomerSignal(
  input: CustomerInsightInput,
  finding: EmergingRiskFinding,
  redactedSituation: string,
): CustomerSignal {
  return {
    id: `customer-signal-${Date.now()}-${finding.id}`,
    createdAt: new Date().toISOString(),
    source: 'customer-voice',
    lifeStage: input.lifeStage,
    theme: finding.theme,
    title: finding.title,
    anonymizedSummary: redactedSituation.slice(0, 180),
    keywords: finding.keywords,
    aggregationStatus: 'sample-only',
    reviewStatus: 'intake',
  }
}
