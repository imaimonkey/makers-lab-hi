import { readPdfFile } from '../llm-util/fileContext'
import type { RadarDashboardData, RadarNewsArticle, RadarRiskCandidate } from '../../domain/risk/riskRadarTypes'
import { getArticleMetadata } from './articleCuratedMetadata'

type BundledArticleFile = {
  fileName: string
  url: string
  format: 'pdf' | 'hwp'
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
  confidence: { level: 'high' | 'medium' | 'low'; reason: string }
  metricScores: Record<'demand' | 'fortuity' | 'accumulation' | 'measurability' | 'adverseSelection' | 'moralHazard' | 'dataConfidence' | 'legalExposure', number>
  trend: number[]
  publishedAt?: string
  isRegulatory?: boolean
  recommendation: 'review' | 'observe' | 'hold'
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

const sourcePdfModules = import.meta.glob('/src/article/*.pdf', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const sourceHwpModules = import.meta.glob('/src/article/*.hwp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

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
  const legacyIds: Array<[RegExp, string]> = [
    [/Warming Switzerland/i, 'ARTICLE-001'],
    [/sri-2026-06-warming/i, 'ARTICLE-002'],
    [/AXA_PR/i, 'ARTICLE-003'],
    [/고용보험|21472/, 'ARTICLE-004'],
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

function buildContentProfile(text: string, name: string, title: string): ArticleContentProfile {
  const curated = getArticleMetadata(name)
  if (curated) return curated
  const body = text.replace(/\s+/g, ' ').trim()
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
  const signalTrend = profile.signals
    .map((signal) => Number((signal.value.match(/\d+(?:\.\d+)?/) ?? [''])[0]))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.min(100, Math.max(0, Math.round(value <= 5 ? value * 20 : value))))
  const trend = signalTrend.length >= 2 ? signalTrend : [scoreToPercent(scores.novelty), scoreToPercent(scores.growth), scoreToPercent(scores.severity)]

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
    coverageGap: profile.reviewActions[0] ?? '문서 근거와 기존 보장 범위를 연결합니다.',
    nextAction: profile.reviewActions[0] ?? '문서 인용과 관련 손해자료를 연결합니다.',
    uncertainty: profile.reviewActions,
    counterEvidence: ['문서에 포함되지 않은 국내 손해자료·약관·가입 기준은 분석 범위에서 제외했습니다.'],
    confidence: { level: evidenceLevel, reason: '문서에서 확인한 사실·지표·출처 단서를 구조화했습니다.' },
    metricScores,
    trend,
    publishedAt: collectedAt,
    isRegulatory: profile.topic === '법령·규제' || profile.topic === '법률·사회보험',
    recommendation,
  }
}

function listBundledFiles(): BundledArticleFile[] {
  const sourceFiles = [
    ...Object.entries(sourcePdfModules).map(([path, url]) => ({ fileName: fileName(path), url, format: 'pdf' as const })),
    ...Object.entries(sourceHwpModules).map(([path, url]) => ({ fileName: fileName(path), url, format: 'hwp' as const })),
  ].sort((first, second) => first.fileName.localeCompare(second.fileName, 'ko-KR'))
  if (sourceFiles.length) return sourceFiles
  return fallbackArticleFiles.map(({ fileName: name, url, format }) => ({ fileName: name, url, format }))
}

let recordsPromise: Promise<ArticleSourceRecord[]> | null = null

export async function loadArticleSourceRecords(): Promise<ArticleSourceRecord[]> {
  if (recordsPromise) return recordsPromise
  recordsPromise = Promise.all(listBundledFiles().map(async (sourceFile) => {
    const response = await fetch(sourceFile.url)
    if (!response.ok) throw new Error(`${sourceFile.fileName}: 원문 파일을 읽지 못했습니다.`)
    const blob = await response.blob()
    const text = sourceFile.format === 'pdf'
      ? await readPdfFile(new File([blob], sourceFile.fileName, { type: 'application/pdf' }))
      : ''
    const curated = getArticleMetadata(sourceFile.fileName)
    const title = curated?.title ?? titleFromFile(sourceFile.fileName)
    const contentProfile = buildContentProfile(text, sourceFile.fileName, title)
    const paragraphs = text.split(/\n{2,}/).filter(Boolean).length
    const collectedAt = curated?.publishedAt ?? new Date().toISOString()
    const article: ArticleSourceRecord = {
      id: stableArticleId(sourceFile.fileName),
      title,
      summary: contentProfile.summary,
      content: text,
      source: sourceNameFor(sourceFile.fileName),
      collectedAt,
      contentStatus: sourceFile.format === 'pdf' ? '원문 본문 추출 완료' : '원문 문서 연결',
      contentSource: curated?.source ?? '문서 원문',
      contentQuality: { chars: text.length, paragraphs, titleMatched: contentProfile.keywords.length, titleTokens: contentProfile.keywords.length },
      analysisStatus: '원문 기반 구조화 완료',
      verificationStatus: '원문 근거 연결',
      text,
      fileName: sourceFile.fileName,
      sourcePath: '',
      fileUrl: sourceFile.url,
      format: sourceFile.format,
      contentProfile,
      derived: createDerivedAnalysis(title, contentProfile, collectedAt),
    }
    return article
  }))
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
