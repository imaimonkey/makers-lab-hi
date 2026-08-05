import { readPdfFile } from '../llm-util/fileContext'
import type { RadarDashboardData, RadarNewsArticle, RadarRiskCandidate } from '../../domain/risk/riskRadarTypes'
import { getArticleMetadata } from './articleCuratedMetadata'
import { calculateProductizationScores } from '../risk-catalog/productizationScore'

type BundledArticleFile = {
  fileName: string
  url: string
  format: 'pdf' | 'hwp'
  sourcePath: string
}

export type ArticleContentSignal = {
  label: string
  value: string
  basis: string
  tone: 'blue' | 'orange' | 'red' | 'green'
}

export type ArticleContentProfile = {
  topic: string
  event: string
  summary: string
  facts: string[]
  affectedTargets: string[]
  damageTypes: string[]
  industries: string[]
  keywords: string[]
  signals: ArticleContentSignal[]
  reviewActions: string[]
  evidenceConfidence: number
  scores: {
    novelty: number
    growth: number
    severity: number
    spread: number
    coverageGap: number
    evidenceConfidence: number
  }
}

export type ArticleMetric = {
  label: string
  value: string
  sourceHint?: string
}

export type ArticleDerivedAnalysis = {
  title: string
  clusterKey: string
  category: string
  summary: string
  event: string
  changeType: string
  affectedTargets: string[]
  damageTypes: string[]
  industries: string[]
  facts: string[]
  metrics: ArticleMetric[]
  keywords: string[]
  evidenceQuotes: string[]
  coverageGap: string
  nextAction: string
  uncertainty: string[]
  counterEvidence: string[]
  productConcept: ArticleProductConcept
  confidence: { level: 'high' | 'medium' | 'low'; reason: string }
  metricScores: Record<'demand' | 'fortuity' | 'accumulation' | 'measurability' | 'adverseSelection' | 'moralHazard' | 'dataConfidence' | 'legalExposure', number>
  trend: number[]
  publishedAt?: string
  isRegulatory?: boolean
  disposition: 'candidate' | 'reference' | 'regulation'
  recommendation: 'review' | 'observe' | 'hold'
}

export type ArticleProductConcept = {
  workingName: string
  form: string
  policyholder: string
  insured: string
  coveredEvent: string
  coveredLoss: string
  existingInsuranceRelationship: string
  underwritingInputs: string[]
  pricingInputs: string[]
  outOfScope: string[]
}

export type ArticleSourceRecord = RadarNewsArticle & {
  text: string
  fileName: string
  sourcePath: string
  fileUrl: string
  format: 'pdf' | 'hwp'
  contentProfile: ArticleContentProfile
  derived: ArticleDerivedAnalysis
}

/* The article folder is a research intake, not a generated-report queue.
   Context and regulatory documents remain evidence for the radar/detail
   views, but they are not standalone product reports. */
const REPORT_CONTEXT_ONLY_PATTERN = /보험연계증권 시장 인사이트|보험시장 활동 지표|생성형 AI와 보험업무의 실제 활용 격차|EU 은행권 암호자산 건전성 규제|미국 반려동물보험 시장 성장|미국 자동차보험 의무가입 예외|일본 생명보험사의 헬스케어 확장|프랑스 건강보험 재정개선 사례/i
const MEANINGFUL_RISK_PATTERN = /AI 데이터센터|리튬이온 배터리|사이버보험|전염병|테러 위험|우주산업|폭염|플로리다 주택보험/i

function articleDisposition(title: string, profile: ArticleContentProfile, isRegulatory: boolean): ArticleDerivedAnalysis['disposition'] {
  if (isRegulatory) return 'regulation'
  if (REPORT_CONTEXT_ONLY_PATTERN.test(`${title} ${profile.topic}`)) return 'reference'
  const scoreSignals = profile.scores.coverageGap >= 3.8 && (
    profile.scores.novelty >= 3.6
    || profile.scores.severity >= 4.2
    || profile.scores.spread >= 4.2
  )
  return MEANINGFUL_RISK_PATTERN.test(`${title} ${profile.topic}`) || scoreSignals ? 'candidate' : 'reference'
}

function productConceptFor(title: string, profile: ArticleContentProfile): ArticleProductConcept {
  const text = `${title} ${profile.topic}`
  if (/AI 데이터센터/i.test(text)) return {
    workingName: 'AI 데이터센터 건설·운영 복합위험 보완보험',
    form: '기업성 재산종합보험 + 기업휴지·냉각설비·제3자 배상책임 특약 검토',
    policyholder: '데이터센터 소유자·운영자 또는 건설·대주단 계약 주체',
    insured: '데이터센터 운영자·소유자·건설 관련 이해관계자',
    coveredEvent: 'AI 전용 랙 내 배터리 열폭주·화재, 냉각액 누출·침수, 시운전 중 사고와 물리적 공격으로 인한 우연한 손해',
    coveredLoss: '설비·건물 직접손해, 복구·철거비, 냉각설비 손해, 사고로 인한 영업중단·건설지연 및 확인된 제3자 재산손해',
    existingInsuranceRelationship: '건설보험·재산보험·기업휴지보험이 단계별로 나뉘어 시운전, 신형 배터리·냉각설비, 대형 집적 PML의 연결 공백을 대조해야 함',
    underwritingInputs: ['배터리 설치 위치·화학계열·열폭주 감지 및 소화 설비', '냉각 방식·누출 감지·배수와 이중화 수준', '건설·시운전·운영 단계와 시설별 자산 집중도', '드론·전쟁·테러 위험의 재보험 및 면책 조건'],
    pricingInputs: ['총보험가액·서버/GPU 자산가액', '전력용량·배터리 용량·냉각 설비 규모', '시설별 최대가능손해(PML)와 복구기간', '영업중단 예상매출·대체처리 용량'],
    outOfScope: ['전쟁·테러 위험의 최종 담보 여부', '보험료·보장한도·가입 가능 여부의 확정', '국내 손해율 없이 산출한 최종 위험률'],
  }
  if (/리튬이온 배터리/i.test(text)) return {
    workingName: '리튬이온 배터리 시설·BESS 통합위험 보완보험',
    form: '기업성 재산보험 + 환경오염·제품·공급망 배상책임 구조 검토',
    policyholder: '배터리 제조·보관·충전·재활용 사업자 또는 BESS 운영자',
    insured: '시설 운영자·제조자·보관자와 실제 손해를 부담하는 계약 주체',
    coveredEvent: '배터리 열폭주로 인한 화재·폭발 또는 제조·보관·폐기 과정에서 발생한 우연한 사고',
    coveredLoss: '시설·인접 차량·건물 직접손해, 화재 진압·오염 정화비, 작업자·제3자 배상책임과 사고로 인한 공급중단 손해',
    existingInsuranceRelationship: '자동차·재산·제품배상·환경보험이 손해 유형별로 분리되어 열폭주 확산, 폐기 오염, 공급망 손해의 책임과 중복을 대조해야 함',
    underwritingInputs: ['배터리 화학계열·셀·모듈·팩 구조와 보관 밀도', 'BMS·열감지·소화·격리·충전관리 로그', '시설 위치·인접 목적물·운송·폐기 공정', '리콜·제품결함·환경오염 책임 분담'],
    pricingInputs: ['보관·운영 중인 총 에너지 용량과 자산가액', '시설별 사고 빈도·피해 범위·집적 PML', '배터리 종류·노후도·재활용 비중', '사고 대응·복구·리콜 비용'],
    outOfScope: ['배터리 자체 결함의 최종 책임 귀속', '실제 사고율·손해액 기반 최종 요율', '환경·인권 관련 손해의 법적 인정 범위'],
  }
  if (/사이버보험/i.test(text)) return {
    workingName: '기업 사이버 누적위험·대재해 보완보험',
    form: '기업 사이버보험 + 집중위험·재보험·ILS 연계 구조 검토',
    policyholder: '데이터·클라우드·핵심 시스템을 운영하는 기업·기관',
    insured: '기업과 사고로 경제적 손해를 입은 계약상 이해관계자',
    coveredEvent: '랜섬웨어·해킹·시스템 침해로 발생한 정보·서비스 장애와 확인 가능한 우연한 사고',
    coveredLoss: '복구·통지·법률비용, 데이터 복원, 영업중단 및 약관상 확인 가능한 제3자 배상책임',
    existingInsuranceRelationship: '사이버보험·재산보험·기업휴지보험·전문직 배상책임의 중복과 사이버 대재해 누적을 분리해야 함',
    underwritingInputs: ['MFA·백업·보안관제·패치·접근권한 수준', '클라우드·공급망 의존도와 동일 서비스 집중도', '사고 대응·복구 목표시간과 로그 보존', '개인정보·규제 대상 데이터와 제3자 계약'],
    pricingInputs: ['매출·데이터 보유량·사용자 수', '업종별 사고 빈도와 복구기간', '동일 클라우드·서비스 사업자 누적 노출', '직접손해·영업중단·배상책임 분포'],
    outOfScope: ['사이버 공격의 국가행위·전쟁 해당 여부', '몸값 지급 관련 법률 판단', '시장 전체 누적손해의 최종 모델링'],
  }
  if (/전염병/i.test(text)) return {
    workingName: '전염병 초기대응 트리거형 재난보완 구조',
    form: '공공·기업 재난보장 + 재보험·대재해채권 연계 구조 검토',
    policyholder: '정부·공공기관 또는 감염병 집중 노출 기업·기관',
    insured: '초기 대응 자금과 실제 경제적 손해를 부담하는 기관',
    coveredEvent: '질병·지역·전파 규모가 객관적 트리거를 초과한 대규모 감염병 사건',
    coveredLoss: '초기 방역·의료·영업중단 대응 비용과 약정된 실제 경제적 손해의 보완 범위',
    existingInsuranceRelationship: '건강·기업휴지·재난지원금과 중복되지 않도록 감염병 정의, 트리거, 공공기금 역할을 분리해야 함',
    underwritingInputs: ['질병·지역·전파 규모의 객관적 트리거', '정부·국제기구 통계와 보고 지연', '대상 업종·지역의 동시 노출', '공공기금·재보험·민간보험의 손실 분담'],
    pricingInputs: ['발생 빈도·전파 규모·지역별 노출', '영업중단 기간과 대상 사업장 수', '트리거별 기대손실·최대 보상액', '재보험·자본시장 조달 비용'],
    outOfScope: ['의료비·사망 보장의 최종 상품 설계', '공공정책상 지원금의 보험금 대체 판단', '감염병 예측을 확정값으로 사용하는 것'],
  }
  if (/테러 위험/i.test(text)) return {
    workingName: '소프트타깃 복합 테러·영업중단 보완보험',
    form: '기업성 재산·기업휴지·제3자 배상책임의 테러위험 보완 구조 검토',
    policyholder: '다중이용시설·기업·행사 운영자 또는 시설 소유자',
    insured: '시설 운영자·소유자와 확인된 제3자 피해 부담 주체',
    coveredEvent: '소프트타깃 시설에 발생한 테러·정치폭력 또는 약관상 구분되는 우연한 공격',
    coveredLoss: '인명·재산 직접손해, 영업중단, 행사취소, 평판·제3자 배상책임의 확인 가능한 손해',
    existingInsuranceRelationship: '전쟁·테러·사이버·재산보험의 면책과 정부기금 보완 범위를 분리해야 함',
    underwritingInputs: ['시설 유형·수용인원·행사 일정과 위치', '보안 인력·출입통제·대피·비상대응', '사이버·물리 공격의 결합 가능성', '정부기금·재보험의 손실 분담 조건'],
    pricingInputs: ['시설별 자산가액·수용인원·지역 위험', '사고당·누적 PML과 복구기간', '직접손해·영업중단·배상책임 분포', '정부지원·재보험 용량'],
    outOfScope: ['테러·전쟁·정치폭력의 법적 정의 확정', '정부기금의 실제 지급 가능성', '고위험 시설의 가입 가능 여부 확정'],
  }
  if (/우주산업/i.test(text)) return {
    workingName: '발사·궤도운용 단계별 우주위험보험',
    form: '발사보험 + 궤도운용·위성서비스·제3자 배상책임 구조 검토',
    policyholder: '발사체·위성 사업자, 위성서비스 이용 기업 또는 대주단',
    insured: '발사·운용 단계에서 실제 경제적 손해를 부담하는 사업자',
    coveredEvent: '발사 실패·위성 운용 중 고장·궤도·통신 중단 등 단계별 우연한 사고',
    coveredLoss: '발사체·위성 직접손해, 복구·재발사 비용, 서비스 중단과 약관상 제3자 배상책임',
    existingInsuranceRelationship: '항공·특종·재산보험을 발사와 궤도운용 단계로 나누고 국내 사고 데이터·재보험 조건의 공백을 확인해야 함',
    underwritingInputs: ['발사체·탑재체·궤도·임무기간', '발사 이력·시험 결과·제조·운용 통제', '위성 서비스 의존 고객과 대체 가능성', '정부 인허가·재보험 조건'],
    pricingInputs: ['발사 성공률·위성가액·재발사 비용', '궤도·임무기간·서비스 매출', '사고 유형별 PML과 재보험 회수', '국내외 사고·정비 데이터'],
    outOfScope: ['발사 성공률을 내부 통계 없이 확정하는 것', '우주 관련 인허가·책임법의 최종 해석', '보험료·보장한도 확정'],
  }
  if (/폭염/i.test(text)) return {
    workingName: '폭염 노출 기업 운영·근로손해 보완보험',
    form: '기업휴지·재산·근로자 상해 관련 보장과 위험관리 서비스 결합 검토',
    policyholder: '야외노동·고온 설비·다중이용시설을 운영하는 기업·기관',
    insured: '폭염으로 실제 경제적 손해 또는 사고 손해를 부담하는 사업자·근로자 관련 주체',
    coveredEvent: '지역·기간·온도 또는 열지수 기준을 충족하고 확인 가능한 건강·운영 손해로 이어진 폭염 사건',
    coveredLoss: '폭염 관련 사고·의료·산재 손해와 시설 운영중단 등 약관으로 정의할 수 있는 손해',
    existingInsuranceRelationship: '상해·산재·재산·기업휴지 보장의 역할을 분리하고 기온 지수만으로 지급하는 구조의 피보험이익·사행성 위험을 확인해야 함',
    underwritingInputs: ['지역별 폭염일수·열지수·야간기온', '근로자 노출시간·작업환경·휴게시설', '냉방·그늘·수분공급 등 적응조치', '업종별 사고·의료·중단 손해'],
    pricingInputs: ['지역·업종·노출시간별 사고 빈도', '폭염일수와 의료·산재 손해의 관계', '사업장 수·근로자 수·시설가액', '기후 시나리오와 누적손해'],
    outOfScope: ['기온 지수 초과만으로 보험금 지급 확정', '국내 폭염 손해율 없는 최종 요율', '산재보험과 민영보험의 법적 관계 확정'],
  }
  if (/플로리다 주택보험/i.test(text)) return {
    workingName: '고위험 재산보험 재보험·사기관리 보완 구조',
    form: '고위험 재산보험 + 재보험·사기관리·소송비용 통제 구조 검토',
    policyholder: '자연재해 고위험 지역의 재산보험자·공영보험자 또는 시설 운영자',
    insured: '재산 손해와 보험시장 용량 부족을 실제로 부담하는 보험자·소유자',
    coveredEvent: '허리케인·홍수 등 자연재해와 손해사기·소송비용으로 발생한 확인 가능한 시장 손실',
    coveredLoss: '재산 직접손해, 복구·소송비용, 재보험 용량 부족으로 인한 보장 공백의 보완 범위',
    existingInsuranceRelationship: '자연재해 담보 자체보다 보험사기·소송비용·공영보험 의존·재보험 회수 위험을 별도 구조로 분리해야 함',
    underwritingInputs: ['지역·해안 노출·건축규격', '자산가액·방풍·침수 방지 수준', '청구·수리업체·소송 패턴', '재보험·공영보험 의존도'],
    pricingInputs: ['지역별 자연재해 PML', '계약 건수·집적도·보험가액', '사기·소송 빈도와 평균 비용', '재보험 가격·회수 조건'],
    outOfScope: ['해외 사례를 국내 시장에 직접 적용하는 것', '사기 여부의 사전 확정', '재산보험료·보장한도 확정'],
  }
  return {
    workingName: `${title} 관련 위험 보완 구조`,
    form: '기존 보장과 책임 범위를 대조한 기업성 보험 구조 검토',
    policyholder: profile.affectedTargets[0] ?? '실제 위험 보유 기업·기관',
    insured: profile.affectedTargets.join(' · '),
    coveredEvent: profile.event,
    coveredLoss: profile.damageTypes.join(' · '),
    existingInsuranceRelationship: '기존 보험의 보장·면책·중복 여부를 손해 유형별로 확인해야 함',
    underwritingInputs: [...profile.affectedTargets, ...profile.reviewActions.slice(0, 2)],
    pricingInputs: [...profile.signals.map((signal) => `${signal.label}: ${signal.value}`), '사고 빈도·손해액·노출량 자료'],
    outOfScope: ['공식 약관·보험료·가입 가능 여부 확정', '원문 밖의 손해율과 국내 적용성 단정'],
  }
}

function coverageGapFor(title: string, concept: ArticleProductConcept) {
  if (/AI 데이터센터/i.test(title)) return '건설보험과 운영보험 사이의 시운전·냉각액·랙 내 배터리·대형 집적 PML이 기존 약관의 보장한도와 안전기준에서 분리될 가능성이 있음'
  if (/리튬이온 배터리/i.test(title)) return '자동차·재산·제품배상·환경보험이 열폭주 확산, 폐기 오염, 공급망·근로자 손해를 각각 나누어 보장하므로 사고 전 과정의 책임과 누적손해 연결이 필요함'
  if (/사이버보험/i.test(title)) return '기존 사이버보험이 개별 기업 손해를 중심으로 설계되는 반면 클라우드·공급망을 통한 동시 사고와 재보험 용량 부족을 별도 관리해야 함'
  if (/전염병/i.test(title)) return '건강보험·기업휴지·공공재난지원이 감염병 초기 대응 자금과 누적 영업손해를 동일한 기준으로 보완하지 못하므로 트리거와 실손손해의 관계 확인이 필요함'
  if (/테러 위험/i.test(title)) return '재산보험의 테러·전쟁 면책, 사이버·배상책임 손해와 정부기금 보완 범위가 분리되어 소프트타깃의 복합손해를 한 구조로 연결하기 어려움'
  if (/우주산업/i.test(title)) return '발사·궤도운용·서비스 중단·제3자 책임이 기존 항공·특종보험의 단계별 조건으로 나뉘고 국내 사고 데이터와 표준 위험평가가 부족함'
  if (/폭염/i.test(title)) return '상해·산재·재산·기업휴지보험은 폭염의 건강·노동·운영 손해를 따로 다루므로 지역별 폭염 노출과 실제 경제적 손해를 연결하는 보장 기준이 필요함'
  if (/플로리다 주택보험/i.test(title)) return '자연재해 손해 외에 사기·소송비용·재보험 철수로 보험시장 용량이 줄어드는 위험을 기존 재산보험만으로 흡수하기 어려움'
  return concept.existingInsuranceRelationship
}

export function isMeaningfulRiskCandidate(article: ArticleSourceRecord) {
  return article.derived.disposition === 'candidate'
}

export function isArticleReportCandidate(article: ArticleSourceRecord) {
  return isMeaningfulRiskCandidate(article)
}

export function articleGroupKey(article: ArticleSourceRecord) {
  return article.derived.isRegulatory
    ? `law:${article.title}`
    : `topic:${article.contentProfile.topic}`
}

export function groupArticleSourceRecords(records: ArticleSourceRecord[]) {
  const groups = new Map<string, ArticleSourceRecord[]>()
  records.forEach((article) => {
    const key = articleGroupKey(article)
    groups.set(key, [...(groups.get(key) ?? []), article])
  })
  return [...groups.values()]
}

export function selectArticleGroupRepresentative(group: ArticleSourceRecord[]) {
  return [...group].sort((left, right) => (
    calculateProductizationScores(right.derived.metricScores).total
    - calculateProductizationScores(left.derived.metricScores).total
  ))[0] ?? group[0]
}

const sourcePdfModules = import.meta.glob('/src/article/**/*.pdf', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const sourceHwpModules = import.meta.glob('/src/article/**/*.hwp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const fallbackArticleFiles = [
  '/articles/Warming Switzerland_ supporting our community to thrive in a hotter future _ Swiss Re-B08qVvNS.pdf',
  '/articles/sri-2026-06-warming-switzerland-version-de-DFNu51l8.pdf',
  '/articles/afoMp8BOoF08xomN_AXA_PR_20260505-DtwmCOyG.pdf',
  '/articles/고용보험_및_산업재해보상보험의_보험료징수_등에_관한_법률(법률)(제21472호)(20270101) (1)-BsQPp5NI.pdf',
  '/articles/보험개발원_신기술-CerngTVi.pdf',
  '/articles/보험연구원_AI_데이터센터_건설_붐과_보장_공백-Ct_yc2Xr.pdf',
].map((url) => ({ fileName: url.split('/').pop() ?? url, url, format: 'pdf' as const, sourcePath: 'public/articles' }))

function fileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path
}

function sourceReferenceDate(name: string, curated: ReturnType<typeof getArticleMetadata>, fallback: string) {
  if (curated?.publishedAt) return curated.publishedAt
  const effectiveDate = curated?.isRegulatory ? name.match(/(20\d{2})(\d{2})(\d{2})/) : null
  return effectiveDate ? `${effectiveDate[1]}.${effectiveDate[2]}.${effectiveDate[3]}` : fallback
}

function titleFromFile(name: string) {
  const curated = getArticleMetadata(name)
  if (curated) return curated.title
  const normalized = name.replace(/\.(pdf|hwp)$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (/AI.*데이터센터|데이터센터.*보장|data centre/i.test(name)) return 'AI 데이터센터 건설 붐과 보장 공백'
  if (/Warming Switzerland|warming.*switzerland|Hitze in der Schweiz/i.test(name)) return '스위스 폭염과 더워지는 미래'
  if (/AXA/i.test(name)) return 'AXA 1Q26 보험시장 활동 지표'
  if (/보험개발원.*신기술/i.test(name)) return '우주산업 상업화와 우주보험 대응'
  if (/고용보험|law74/i.test(name)) return '고용·산재보험료 징수 법령'
  return normalized
}

function stableArticleId(name: string) {
  const lawDocumentMatch = /고용보험|21472|law74/i.test(name)
  if (lawDocumentMatch) {
    const lawNumber = name.match(/제(\d+)호/)?.[1] ?? '21472'
    const effectiveDate = name.match(/(\d{8})/)?.[1] ?? 'unknown'
    const fileSlug = name
      .replace(/\.(pdf|hwp)$/i, '')
      .replace(/\s*\(\d+\)$/, '')
      .replace(/[^a-zA-Z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(-24)

    return `ARTICLE-004-${lawNumber}-${effectiveDate}-${fileSlug || 'law'}`
  }
  const legacyIds: Array<[RegExp, string]> = [
    [/Warming Switzerland/i, 'ARTICLE-001'],
    [/sri-2026-06-warming/i, 'ARTICLE-002'],
    [/AXA_PR/i, 'ARTICLE-003'],
    [/보험개발원.*신기술/i, 'ARTICLE-005'],
    [/보험연구원.*AI|데이터센터.*보장/i, 'ARTICLE-006'],
  ]
  const legacy = legacyIds.find(([pattern]) => pattern.test(name))
  if (legacy) return legacy[1]
  let hash = 0
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return `ARTICLE-${hash.toString(36).toUpperCase()}`
}

function sourceNameFor(name: string) {
  const curated = getArticleMetadata(name)
  if (curated) return curated.source
  if (/Swiss Re|sri-|Warming Switzerland/i.test(name)) return 'Swiss Re Institute'
  if (/AXA/i.test(name)) return 'AXA Group'
  if (/보험연구원/i.test(name)) return '보험연구원(KIRI)'
  if (/보험개발원/i.test(name)) return '보험개발원'
  if (/고용보험|law74/i.test(name)) return '국가법령정보센터'
  return '문서 원문'
}

function hasAny(text: string, terms: RegExp[]) {
  return terms.some((term) => term.test(text))
}

function scoreFromSignals(count: number, minimum = 1.2) {
  return Math.min(4.9, Math.max(1, Number((minimum + count * 0.55).toFixed(1))))
}

function enrichCuratedProfile(profile: ArticleContentProfile, body: string, name: string) {
  const extras: string[] = []
  const signals: ArticleContentSignal[] = []
  if (/리튬이온|battery/i.test(`${name} ${profile.topic}`) && /3,880/.test(body)) {
    extras.push('2024년 리튬이온 배터리 관련 사고가 3,880건으로 전년 대비 50% 이상 증가', '2022년 GM Chevrolet Bolt EV 배터리 화재 위험으로 약 14만 대 리콜', '글로벌 손해보험업계가 배터리 시설 안전지침과 전용 보험 컨소시엄 대응을 확대')
    signals.push({ label: '2024년 관련 사고', value: '3,880건 · 전년 대비 50% 이상 증가', basis: 'KIRI 원문 19~20쪽 인용', tone: 'red' }, { label: 'GM 리콜', value: '약 14만 대', basis: 'KIRI 원문 리콜 사례', tone: 'orange' })
  }
  if (/AI.*데이터센터|데이터센터.*AI/i.test(`${name} ${profile.topic}`) && /75%/.test(body)) {
    extras.push('5대 빅테크 데이터센터 설비투자 중 약 75%가 물리 인프라에 투입되는 구조로 설명됨', 'AI 전용 랙 내 리튬이온 배터리 설계가 기존 납산 배터리와 다른 열폭주 인수요소를 만듦')
  }
  if (!extras.length && !signals.length) return profile
  return { ...profile, facts: [...profile.facts, ...extras], signals: [...profile.signals, ...signals] }
}

function buildContentProfile(text: string, name: string, title: string): ArticleContentProfile {
  const body = text.replace(/\s+/g, ' ').trim()
  const curated = getArticleMetadata(name)
  if (curated) return enrichCuratedProfile(curated, body, name)
  const isDataCenter = hasAny(`${name} ${body}`, [/data cent(er|re)/i, /AI 데이터센터/, /데이터센터/])
  const isHeat = hasAny(`${name} ${body}`, [/Warming Switzerland/i, /hot days/i, /Hitzetage/i, /폭염/])
  const isAxa = /AXA/i.test(name) || /Solvency II/i.test(body)
  const isSpace = /보험개발원.*신기술/i.test(name) || /우주보험|위성 발사|우주산업|JAXA/i.test(body)
  const isLaw = /고용보험|law74|산업재해|보험료징수/i.test(`${name} ${body}`)

  if (isDataCenter) {
    return {
      topic: 'AI 인프라 보험',
      event: 'AI 데이터센터의 설비가치와 신형 설비 위험이 기존 보험한도를 앞서고 있음',
      summary: '대규모 AI 데이터센터 투자로 단일 시설의 보험가액이 커지는 동시에 리튬이온 배터리·냉각액·시운전·지정학적 공격이 새로운 보장 공백을 만들고 있습니다.',
      facts: ['5대 빅테크 2026년 데이터센터 설비투자 6,000억 달러 초과', '냉각액 누출 손해가 데이터센터 손해 비용의 24%를 차지', '건설 단계 보험가액 100~300억 달러', '국내 2035년 AI 데이터센터 구축 계획 18.4GW'],
      affectedTargets: ['데이터센터 운영자', '서버·GPU·배터리 설비', '건설·대출기관', '보험·재보험사'],
      damageTypes: ['리튬이온 배터리 열폭주·화재', '냉각액 누출·침수', '시운전 기간 보험 공백', '드론·전쟁 등 물리적 공격'],
      industries: ['AI·클라우드', '건설·인프라', '재산종합보험', '재보험'],
      keywords: ['AI 데이터센터', '보장 공백', '열폭주', '냉각액 누출', '생애주기 보험'],
      signals: [
        { label: '설비투자', value: '6,000억 달러+', basis: '본문 2026년 5대 빅테크 투자 전망', tone: 'blue' },
        { label: '냉각액 손해 비중', value: '24%', basis: 'FM Global 15년 손해 데이터', tone: 'red' },
        { label: '건설단계 보험가액', value: '100~300억 달러', basis: 'S&P Global 분석 인용', tone: 'orange' },
        { label: '국내 구축 계획', value: '18.4GW', basis: '본문 정부 계획 인용', tone: 'green' },
      ],
      reviewActions: ['배터리·냉각 설비의 최신 안전기준 충족 여부 확인', '건설보험과 운영보험 사이 시운전 공백 확인', '전쟁·드론 공격 면책 및 한도 검토', '데이터센터 전용 인수 기준과 업종 분류 확인'],
      evidenceConfidence: body.length > 3000 ? 4.4 : 3.8,
      scores: { novelty: 4.6, growth: 4.7, severity: 4.8, spread: 4.3, coverageGap: 4.9, evidenceConfidence: 4.4 },
    }
  }

  if (isHeat) {
    return {
      topic: '기후·자연재해',
      event: '스위스의 연간 폭염일수가 증가하고 고온이 건강·노동·인프라 위험으로 확장되고 있음',
      summary: '폭염은 홍수처럼 즉시 보이지 않지만 고령자와 취약계층의 건강, 노동환경, 도시 인프라와 다른 자연재해의 강도까지 동시에 압박하는 누적 위험입니다.',
      facts: ['30°C 이상 폭염일수는 1990년 연 5일에서 현재 10~15일', '3°C 온난화 시 세기 중반 20~30일까지 증가 전망', '2003년 유럽 폭염 당시 스위스 사망률 1.5% 증가'],
      affectedTargets: ['고령자·취약계층', '도시 거주자', '야외 노동자', '지자체·전력·보건 서비스'],
      damageTypes: ['열 관련 건강 피해', '노동 생산성 저하', '도시 열섬·인프라 부담', '수자원 스트레스'],
      industries: ['건강·상해보험', '고용·산재', '공공 인프라', '농업·에너지'],
      keywords: ['폭염일수', '취약계층', '기후 적응', '열 스트레스', '회복탄력성'],
      signals: [
        { label: '현재 폭염일수', value: '10~15일/년', basis: 'MeteoSwiss·ETH Zurich', tone: 'orange' },
        { label: '1990년 대비', value: '5일 → 10~15일', basis: '본문 시계열 비교', tone: 'blue' },
        { label: '2003년 사망률', value: '+1.5%', basis: '2003 유럽 폭염 사례', tone: 'red' },
        { label: '3°C 시나리오', value: '20~30일/년', basis: '세기 중반 전망', tone: 'green' },
      ],
      reviewActions: ['폭염 노출과 보험사고·의료 이용 데이터 연결', '고령자·야외 노동자 등 취약집단 보장 공백 확인', '지역별 경보 기준과 손해 트리거 정의', '기후 적응 투자와 보험료·한도 연계 가능성 검토'],
      evidenceConfidence: 4.3,
      scores: { novelty: 3.7, growth: 4.5, severity: 4.1, spread: 4.5, coverageGap: 3.8, evidenceConfidence: 4.3 },
    }
  }

  if (isAxa) {
    return {
      topic: '보험시장·자본력',
      event: 'AXA 2026년 1분기 보험료와 사업부문 매출이 성장하고 자본건전성이 유지됨',
      summary: 'AXA의 활동 지표는 보험시장 수요와 가격 효과가 동시에 움직이고 있음을 보여주는 시장 기준 자료입니다. 위험 후보의 손해 발생률이 아닌 시장·자본력 참고 지표로 분리해 사용해야 합니다.',
      facts: ['총 보험료·기타 매출 380억 유로, 전년 대비 6% 증가', 'P&C 215억 유로, Life & Health 165억 유로', 'Solvency II 비율 211%', '2026년 EPS 성장 목표 6~8%'],
      affectedTargets: ['P&C 보험시장', '기업성 보험', '생명·건강보험', '재보험·자본시장'],
      damageTypes: ['가격·물량 변화', '인플레이션·금리 변동', '시장 변동성', '재보험 수익성 압력'],
      industries: ['손해보험', '생명·건강보험', '재보험', '기업성 보험'],
      keywords: ['AXA', 'gross written premiums', 'Solvency II', 'price effect', 'volume'],
      signals: [
        { label: '총 매출', value: '€38.0bn', basis: 'AXA 1Q26 activity indicators', tone: 'blue' },
        { label: '전년 대비', value: '+6%', basis: '본문 전년 동기 비교', tone: 'green' },
        { label: 'P&C 매출', value: '€21.5bn', basis: '본문 사업부문 지표', tone: 'orange' },
        { label: 'Solvency II', value: '211%', basis: '2026년 3월 31일 기준', tone: 'green' },
      ],
      reviewActions: ['시장 성장 지표와 실제 위험 손해 지표를 분리', '가격 효과와 물량 효과를 별도 기록', '자본건전성 지표의 기준일과 변동 원인 확인', '국내 상품화 후보와 직접 비교하지 않도록 출처 범위 표시'],
      evidenceConfidence: 4.6,
      scores: { novelty: 2.8, growth: 3.9, severity: 2.6, spread: 3.3, coverageGap: 2.4, evidenceConfidence: 4.6 },
    }
  }

  if (isSpace) {
    return {
      topic: '우주·신기술',
      event: '위성 발사가 민간 중심의 반복적·상업적 서비스로 전환되며 우주보험 인프라 필요성이 커짐',
      summary: '상업 우주산업은 반복 발사와 위성 운용으로 보험 수요를 키우지만 국내는 사고 데이터·표준 위험평가·전문인력과 재보험 인프라가 부족합니다.',
      facts: ['위성 발사가 민간 중심의 반복적·상업적 서비스로 전환', '국내 우주보험은 사고 데이터와 표준화된 위험평가 기준이 부족', '일본은 JAXA·보험사 협력으로 정량평가 체계를 축적'],
      affectedTargets: ['발사체·위성 사업자', '우주 서비스 이용 기업', '보험·재보험사', '정부·연구기관'],
      damageTypes: ['발사 실패', '위성 운용 중 손실', '궤도·통신 중단', '재보험 의존 리스크'],
      industries: ['우주산업', '위성통신', '항공·방산', '특종보험'],
      keywords: ['우주보험', '위성 발사', 'JAXA', '상업화', '사고 데이터'],
      signals: [
        { label: '전환 단계', value: '민간·반복 발사', basis: '본문 테마 동향', tone: 'blue' },
        { label: '국내 과제', value: '데이터·기준 부족', basis: '본문 산업 진단', tone: 'red' },
        { label: '해외 사례', value: 'JAXA 협력', basis: '일본 우주보험 사례', tone: 'green' },
      ],
      reviewActions: ['발사·운용 단계별 손해 정의', '국내외 사고 데이터와 재보험 조건 수집', '표준 위험평가 항목과 전문성 확보 수준 확인', '정부지원·법제 정비 필요성 검토'],
      evidenceConfidence: 3.9,
      scores: { novelty: 4.5, growth: 4.1, severity: 4.2, spread: 3.7, coverageGap: 4.4, evidenceConfidence: 3.9 },
    }
  }

  if (isLaw) {
    return {
      topic: '법률·사회보험',
      event: '고용보험·산재보험 보험관계와 보험료 징수 기준이 2027년 시행 법령으로 정리됨',
      summary: '법령 원문은 위험 신호 기사와 달리 가입 주체·보험관계·보수·도급 구조를 판정하는 공식 기준입니다. 상품화 판단의 사실 근거가 아니라 적용 범위와 책임 주체 확인에 사용합니다.',
      facts: ['법률 제21472호, 2027년 1월 1일 시행', '사업주와 근로자의 당연가입·의제가입 구조 규정', '원수급인·하수급인·보수·보험료등의 법정 정의 포함', '근로복지공단·국민건강보험공단의 업무 분담 규정'],
      affectedTargets: ['사업주·근로자', '예술인·노무제공자', '원수급인·하수급인', '근로복지공단·건강보험공단'],
      damageTypes: ['가입 누락', '보험료 산정·체납', '도급 책임 불명확', '적용 제외·의제가입 판단'],
      industries: ['고용보험', '산재보험', '건설·도급', '플랫폼 노동'],
      keywords: ['보험가입자', '보험료', '원수급인', '하수급인', '시행 2027.1.1'],
      signals: [
        { label: '시행일', value: '2027.01.01', basis: '법령 표제부', tone: 'red' },
        { label: '법률 번호', value: '제21472호', basis: '법령 표제부', tone: 'blue' },
        { label: '핵심 적용', value: '사업주·근로자', basis: '제5조 보험가입자', tone: 'green' },
        { label: '도급 범위', value: '원·하수급인', basis: '제2조 정의', tone: 'orange' },
      ],
      reviewActions: ['후보 위험의 책임 주체를 법정 정의와 대조', '사업·근로 형태별 적용 제외 여부 확인', '도급 단계별 보험관계와 신고 주체 확인', '시행일 기준과 개정 이력 기록'],
      evidenceConfidence: 4.8,
      scores: { novelty: 2.6, growth: 2.8, severity: 3.4, spread: 3.8, coverageGap: 3.6, evidenceConfidence: 4.8 },
    }
  }

  const paragraph = body.split(/\n{2,}/).find((item) => item.length > 80) ?? body
  const evidence = Math.min(4.5, scoreFromSignals(Math.floor(body.length / 1200), 2.2))
  return {
    topic: '원문 기반 신규 위험',
    event: `${title} 문서에서 확인된 변화·손해 가능성을 구조화했습니다.`,
    summary: paragraph.slice(0, 260),
    facts: [paragraph.slice(0, 180), `본문 ${body.length.toLocaleString('ko-KR')}자 · ${body.split(/\n{2,}/).filter(Boolean).length}개 문단`],
    affectedTargets: ['문서에 제시된 이해관계자'],
    damageTypes: ['문서에 제시된 손해·영향'],
    industries: ['문서 기준 산업 분류'],
    keywords: [title, '문서 원문', '보험 위험'],
    signals: [{ label: '본문 확보', value: `${body.length.toLocaleString('ko-KR')}자`, basis: 'PDF 본문 추출 결과', tone: 'blue' }],
    reviewActions: ['본문의 핵심 주장과 원문 인용 구간 확정', '독립 출처와 공식 통계 교차검증', '책임 주체·손해 유형·보험 공백 분류'],
    evidenceConfidence: evidence,
    scores: { novelty: 2.5, growth: 2.5, severity: 2.5, spread: 2.5, coverageGap: 2.5, evidenceConfidence: evidence },
  }
}

function scoreToPercent(score: number) {
  return Math.round(score * 20)
}

function createDerivedAnalysis(title: string, profile: ArticleContentProfile, collectedAt: string): ArticleDerivedAnalysis {
  const scores = profile.scores
  const metricScores: ArticleDerivedAnalysis['metricScores'] = {
    demand: scores.growth,
    fortuity: scores.severity,
    accumulation: scores.spread,
    measurability: scores.evidenceConfidence,
    adverseSelection: scores.coverageGap,
    moralHazard: scores.novelty,
    dataConfidence: scores.evidenceConfidence,
    legalExposure: profile.topic === '법령·규제' || profile.topic === '법률·사회보험' ? 4.8 : scores.coverageGap,
  }
  const evidenceLevel = profile.evidenceConfidence >= 4.4 ? 'high' : profile.evidenceConfidence >= 3.4 ? 'medium' : 'low'
  const recommendation = profile.scores.coverageGap >= 4.1 || profile.scores.severity >= 4.5 ? 'review' : profile.topic === '보험시장·자본력' || profile.topic === '법률·사회보험' ? 'observe' : 'hold'
  const isRegulatory = profile.topic === '법령·규제' || profile.topic === '법률·사회보험'
  const signalTrend = profile.signals
    .map((signal) => Number((signal.value.match(/\d+(?:\.\d+)?/) ?? [''])[0]))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.min(100, Math.max(0, Math.round(value <= 5 ? value * 20 : value))))
  const trend = signalTrend.length >= 2 ? signalTrend : [scoreToPercent(scores.novelty), scoreToPercent(scores.growth), scoreToPercent(scores.severity)]
  const productConcept = productConceptFor(title, profile)

  return {
    title,
    clusterKey: `article-${title}`,
    category: profile.topic,
    summary: profile.summary,
    event: profile.event,
    changeType: profile.topic,
    affectedTargets: profile.affectedTargets,
    damageTypes: profile.damageTypes,
    industries: profile.industries,
    facts: profile.facts,
    metrics: profile.signals.map((signal) => ({ label: signal.label, value: signal.value, sourceHint: signal.basis })),
    keywords: profile.keywords,
    evidenceQuotes: profile.facts,
    productConcept,
    coverageGap: coverageGapFor(title, productConcept),
    nextAction: profile.reviewActions[0] ?? '문서 인용과 관련 손해자료를 연결합니다.',
    uncertainty: profile.reviewActions,
    counterEvidence: ['문서에 포함되지 않은 국내 손해자료·약관·가입 기준은 분석 범위에서 제외했습니다.'],
    confidence: { level: evidenceLevel, reason: '문서에서 확인한 사실·지표·출처 단서를 구조화했습니다.' },
    metricScores,
    trend,
    publishedAt: collectedAt,
    isRegulatory,
    disposition: articleDisposition(title, profile, isRegulatory),
    recommendation,
  }
}

function listBundledFiles(): BundledArticleFile[] {
  const sourceFiles = [
    ...Object.entries(sourcePdfModules).map(([path, url]) => ({ fileName: fileName(path), url, format: 'pdf' as const, sourcePath: path.replace(/^\//, '') })),
    ...Object.entries(sourceHwpModules).map(([path, url]) => ({ fileName: fileName(path), url, format: 'hwp' as const, sourcePath: path.replace(/^\//, '') })),
  ].sort((first, second) => first.fileName.localeCompare(second.fileName, 'ko-KR'))
  if (sourceFiles.length) return sourceFiles
  return fallbackArticleFiles.map(({ fileName: name, url, format, sourcePath }) => ({ fileName: name, url, format, sourcePath }))
}

function curatedSourceText(profile: ReturnType<typeof getArticleMetadata>) {
  if (!profile) return ''
  return [
    `[문서 분석 요약] ${profile.title}`,
    profile.event,
    profile.summary,
    '[문서에서 연결한 핵심 사실]',
    ...profile.facts.map((fact, index) => `${index + 1}. ${fact}`),
    '[문서 지표]',
    ...profile.signals.map((signal) => `${signal.label}: ${signal.value} · ${signal.basis}`),
  ].join('\n\n')
}

async function extractBundledSourceText(sourceFile: BundledArticleFile) {
  if (sourceFile.format !== 'pdf') return ''
  try {
    const response = await fetch(sourceFile.url)
    if (!response.ok) return ''
    const blob = await response.blob()
    return await readPdfFile(new File([blob], sourceFile.fileName, { type: 'application/pdf' }))
  } catch (error) {
    console.warn('[article-source] 원문 본문 추출을 건너뛰었습니다.', sourceFile.fileName, error)
    return ''
  }
}

let recordsPromise: Promise<ArticleSourceRecord[]> | null = null

export async function loadArticleSourceRecords(): Promise<ArticleSourceRecord[]> {
  if (recordsPromise) return recordsPromise
  recordsPromise = Promise.allSettled(listBundledFiles().map(async (sourceFile) => {
    const curated = getArticleMetadata(sourceFile.fileName)
    const curatedText = curatedSourceText(curated)
    const originalText = await extractBundledSourceText(sourceFile)
    if (curated) {
      const title = curated.title
      const text = originalText || curatedText
      const contentProfile = buildContentProfile(text, sourceFile.fileName, title)
      const paragraphs = text.split(/\n{2,}/).filter(Boolean).length
      const collectedAt = new Date().toISOString()
      const referenceDate = sourceReferenceDate(sourceFile.fileName, curated, collectedAt)
      return {
        id: stableArticleId(sourceFile.fileName),
        title,
        summary: contentProfile.summary,
        content: text,
        source: sourceNameFor(sourceFile.fileName),
        collectedAt,
        contentStatus: originalText ? '원문 본문 추출 완료' : '원문 기반 구조화 완료',
        contentSource: curated.source,
        contentQuality: { chars: text.length, paragraphs, titleMatched: contentProfile.keywords.length, titleTokens: contentProfile.keywords.length },
        analysisStatus: '원문 기반 구조화 완료',
        verificationStatus: '원문 근거 연결',
        text,
        fileName: sourceFile.fileName,
        sourcePath: sourceFile.sourcePath,
        fileUrl: sourceFile.url,
        format: sourceFile.format,
        contentProfile,
        derived: { ...createDerivedAnalysis(title, contentProfile, referenceDate), publishedAt: referenceDate },
      } satisfies ArticleSourceRecord
    }
    const text = originalText
    if (!text) throw new Error(`${sourceFile.fileName}: 원문 본문을 읽지 못했습니다.`)
    const title = titleFromFile(sourceFile.fileName)
    const contentProfile = buildContentProfile(text, sourceFile.fileName, title)
    const paragraphs = text.split(/\n{2,}/).filter(Boolean).length
    const collectedAt = new Date().toISOString()
    const article: ArticleSourceRecord = {
      id: stableArticleId(sourceFile.fileName),
      title,
      summary: contentProfile.summary,
      content: text,
      source: sourceNameFor(sourceFile.fileName),
      collectedAt,
      contentStatus: sourceFile.format === 'pdf' ? '원문 본문 추출 완료' : '원문 문서 연결',
      contentSource: '문서 원문',
      contentQuality: { chars: text.length, paragraphs, titleMatched: contentProfile.keywords.length, titleTokens: contentProfile.keywords.length },
      analysisStatus: '원문 기반 구조화 완료',
      verificationStatus: '원문 근거 연결',
      text,
      fileName: sourceFile.fileName,
      sourcePath: sourceFile.sourcePath,
      fileUrl: sourceFile.url,
      format: sourceFile.format,
      contentProfile,
      derived: createDerivedAnalysis(title, contentProfile, collectedAt),
    }
    return article
  })).then((results) => {
    const seenIds = new Set<string>()
    const records = results.flatMap((result) => {
      if (result.status === 'fulfilled') return [result.value]
      console.warn('[article-source] 문서 하나를 건너뛰었습니다.', result.reason)
      return []
    }).filter((record) => {
      if (seenIds.has(record.id)) {
        console.warn('[article-source] 중복 문서 ID를 건너뛰었습니다.', record.id, record.fileName)
        return false
      }
      seenIds.add(record.id)
      return true
    })
    if (!records.length) throw new Error('연결된 문서에서 리포트 자료를 불러오지 못했습니다.')
    return records
  })
  return recordsPromise
}

export function deriveArticleDashboard(records: ArticleSourceRecord[]): {
  dashboard: RadarDashboardData
  news: RadarNewsArticle[]
  risks: RadarRiskCandidate[]
} {
  const news = records.map((record) => {
    const article = Object.fromEntries(
      Object.entries(record).filter(([key]) => !['text', 'fileName', 'fileUrl', 'sourcePath', 'format', 'contentProfile', 'derived'].includes(key)),
    ) as Omit<ArticleSourceRecord, 'text' | 'fileName' | 'fileUrl' | 'sourcePath' | 'format' | 'contentProfile' | 'derived'>
    return { ...article, analysis: { articleFacts: { facts: record.contentProfile.facts, event: record.contentProfile.event, changeType: record.contentProfile.topic, affectedTargets: record.contentProfile.affectedTargets, damageTypes: record.contentProfile.damageTypes, industries: record.contentProfile.industries, timeAndPlace: record.contentProfile.summary }, riskInterpretation: { riskEnvironment: record.contentProfile.topic, whyNow: record.contentProfile.event, expectedLosses: record.contentProfile.damageTypes, responsibilityCandidates: record.contentProfile.affectedTargets, searchKeywords: record.contentProfile.keywords }, evidence: record.contentProfile.facts.map((quote, index) => ({ sentenceNo: index + 1, quote, reason: '문서 본문에서 연결한 근거 구간' })), uncertainty: record.contentProfile.reviewActions, confidence: { level: record.contentProfile.evidenceConfidence >= 4 ? '높음' : '보통', reason: '문서의 사실·지표·출처 단서를 기준으로 산정한 신뢰도' }, verificationStatus: '원문 근거 연결' } }
  })
  const risks = records.map((article) => ({
    id: `RISK-${article.id}`,
    articleId: article.id,
    clusterId: `CLUSTER-${article.id}`,
    name: article.title,
    source: article.source,
    status: '원문 기반 상품화 후보',
    eligibleForProductReview: false,
    promotionBlockReason: '문서 근거를 상품화 우선순위에 반영했으며 손해·약관 자료와 함께 판단합니다.',
    facts: { facts: article.contentProfile.facts, event: article.contentProfile.event, changeType: article.contentProfile.topic, affectedTargets: article.contentProfile.affectedTargets, damageTypes: article.contentProfile.damageTypes, industries: article.contentProfile.industries, timeAndPlace: article.contentProfile.summary },
    riskInterpretation: { riskEnvironment: article.contentProfile.topic, whyNow: article.contentProfile.event, expectedLosses: article.contentProfile.damageTypes, responsibilityCandidates: article.contentProfile.affectedTargets, searchKeywords: article.contentProfile.keywords },
    confidence: { level: article.contentProfile.evidenceConfidence >= 4 ? '높음' : '보통', reason: '문서 지표·인용 구간을 기준으로 산정한 신뢰도' },
  }))
  const generatedAt = new Date().toISOString()
  const dashboard: RadarDashboardData = {
    generatedAt,
    metrics: { news: records.length, contentReady: records.filter((record) => record.text.length > 0).length, analyzed: 0, pending: records.length, failed: 0, clusters: records.length, evidencePending: records.length, riskCandidates: risks.length, totalSignals: records.length, verificationPassed: 0, verificationPending: records.length, lawMatched: records.filter((record) => record.contentProfile.topic === '법률·사회보험').length, reviewerPending: records.length, productApiWaiting: records.length },
    channels: { '기관·문서 자료': records.length },
    analysisCounts: { '원문 기반 구조화': records.length, '원문 근거 연결': records.length },
    clusters: records.map((record) => ({ id: `CLUSTER-${record.id}`, title: record.title, articleIds: [record.id], articleCount: 1, sourceCount: 1, keywords: record.contentProfile.keywords })),
    topNews: news,
    risks,
    issues: [],
    signals: [],
    recentActivities: records.map((record) => ({ type: 'article', title: `${record.title} 본문 구조화 반영`, status: '완료', at: generatedAt })),
    failures: [],
    apiStatus: { potens: 'not_used', law: 'not_run', products: 'not_run' },
    lastSync: { completedAt: generatedAt, status: 'local-article-source' },
  }
  return { dashboard, news, risks }
}
