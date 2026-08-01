import { readPdfFile } from '../llm-util/fileContext'
import type { RadarDashboardData, RadarNewsAnalysis, RadarNewsArticle, RadarRiskCandidate } from '../../domain/risk/riskRadarTypes'

/**
 * The source of truth for this developer fixture is src/article.  The files
 * are imported as Vite assets so the browser reads the same files that are
 * checked into the repository; public/articles is intentionally not used.
 */
const articleAssets = import.meta.glob('../../article/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const preferredFileOrder = [
  '보험연구원_AI_데이터센터_건설_붐과_보장_공백.pdf',
  'Warming Switzerland_ supporting our community to thrive in a hotter future _ Swiss Re.pdf',
  'sri-2026-06-warming-switzerland-version-de.pdf',
  '보험개발원_신기술.pdf',
  '고용보험_및_산업재해보상보험의_보험료징수_등에_관한_법률(법률)(제21472호)(20270101) (1).pdf',
  'afoMp8BOoF08xomN_AXA_PR_20260505.pdf',
  'law74.hwp',
] as const

function fileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path
}

function normalizeText(value: string) {
  return value
    .replaceAll(String.fromCharCode(0), ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function compact(value: string) {
  return value.replace(/\s+/g, ' ').trim()
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
  derived: ArticleDerivedAnalysis
}

const metricScores = (values: Partial<ArticleDerivedAnalysis['metricScores']>) => ({
  demand: 3,
  fortuity: 3,
  accumulation: 3,
  measurability: 2.5,
  adverseSelection: 2.5,
  moralHazard: 2.5,
  dataConfidence: 3,
  legalExposure: 3,
  ...values,
})

function quote(text: string, terms: string[], fallback: string) {
  const normalized = compact(text)
  for (const term of terms) {
    const index = normalized.toLocaleLowerCase('ko-KR').indexOf(term.toLocaleLowerCase('ko-KR'))
    if (index >= 0) return normalized.slice(Math.max(0, index - 70), Math.min(normalized.length, index + 260))
  }
  return fallback
}

function baseAnalysis(file: string, text: string): ArticleDerivedAnalysis {
  const title = file.replace(/\.(pdf|hwp)$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  const body = compact(text)
  return {
    title,
    clusterKey: file,
    category: '원문 신호',
    summary: body.slice(0, 420) || '본문 추출 결과가 없어 원문 확인이 필요합니다.',
    event: '문서 본문에서 신규 위험 신호를 구조화하는 단계',
    changeType: '본문 기반 변화 방향 확인 필요',
    affectedTargets: ['원문에 언급된 대상 확인 필요'],
    damageTypes: ['손해 유형 확인 필요'],
    industries: ['산업 분류 확인 필요'],
    facts: body ? [body.slice(0, 260)] : ['본문 추출 결과 없음'],
    metrics: [{ label: '추출 본문', value: `${body.length.toLocaleString('ko-KR')}자` }],
    keywords: [title].filter(Boolean),
    evidenceQuotes: body ? [body.slice(0, 240)] : [],
    coverageGap: '원문 본문과 독립 출처를 추가 확인해야 합니다.',
    nextAction: '담당자가 원문 인용과 독립 출처를 확인한 뒤 후보 승격 여부를 판단합니다.',
    uncertainty: ['구조화 결과는 시연용이며 실제 AI 판단·상품 승인 결과가 아닙니다.'],
    counterEvidence: ['국내 손해 빈도·보험료·약관 적용 여부는 원문만으로 확인되지 않습니다.'],
    confidence: { level: body.length > 500 ? 'medium' : 'low', reason: '본문은 확보했지만 독립 출처 교차검증 전입니다.' },
    metricScores: metricScores({ dataConfidence: body.length > 500 ? 3 : 1.5 }),
    trend: [28, 34, 39, 45, 50, 54, 58],
    recommendation: 'observe',
  }
}

function deriveAnalysis(file: string, text: string): ArticleDerivedAnalysis {
  const base = baseAnalysis(file, text)

  if (file.includes('AI_데이터센터')) {
    return {
      ...base,
      title: 'AI 데이터센터 생애주기·집적 위험',
      clusterKey: 'ai-data-centre-coverage',
      category: 'AI·인프라',
      summary: 'AI 인프라 투자가 커지면서 데이터센터 한 곳에 서버·GPU·배터리·냉각 설비가 집적되고, 기존 보험의 한도·약관·보험기간이 건설부터 운영까지의 위험을 따라가지 못하는 보장 공백이 드러났습니다.',
      event: 'AI 데이터센터 투자 확대와 신형 설비 도입',
      changeType: '위험 집적·신종 손해 원인 증가',
      affectedTargets: ['AI 데이터센터 소유자·운영자', '클라우드·GPU 사업자', '건설사·대주단', '손해보험·재보험 인수 조직'],
      damageTypes: ['리튬이온 배터리 열폭주·화재', '냉각액 누출 침수', '시운전 기간 장비 무보험', '영업중단·공사 지연', '드론·지정학적 물리 공격'],
      industries: ['데이터센터', '클라우드', '건설', '전력·냉각 인프라'],
      facts: [
        '5대 빅테크의 2026년 데이터센터 설비투자가 6,000억 달러를 초과하고, 약 75%가 물리 인프라에 투입됩니다.',
        'AI 전용 데이터센터는 랙 내부 리튬이온 배터리와 서버 직접 냉각을 사용해 기존 시설과 다른 화재·침수 원인을 만듭니다.',
        '건설보험 종료와 운영보험 개시 사이 시운전 기간에 서버 장비가 무보험 상태가 될 수 있습니다.',
      ],
      metrics: [
        { label: '5대 빅테크 2026 설비투자', value: '6,000억 달러 초과', sourceHint: 'Swiss Re 인용' },
        { label: '물리 인프라 투자 비중', value: '약 75% · 4,500억 달러', sourceHint: 'Swiss Re 인용' },
        { label: '데이터센터 보험료 전망', value: '106억 → 242억 달러 · 2026→2030' },
        { label: '대형 단지 보험가액', value: '건설 단계 100~300억 달러' },
        { label: '냉각액 누출 손해 비중', value: '전체 손해 비용의 24%', sourceHint: 'FM Global 15년 손해 데이터' },
        { label: '국내 AI 데이터센터 계획', value: '2035년까지 18.4GW' },
      ],
      keywords: ['AI 데이터센터', '보험가액 집적', '배터리 열폭주', '냉각액 누출', '시운전 공백', '지정학적 위험'],
      evidenceQuotes: [
        quote(text, ['6,000억 달러', '냉각액 누출', '시운전 기간'], 'AI 데이터센터의 투자·설비·보험기간이 기존 기준을 넘어선다는 내용이 본문에 있습니다.'),
      ],
      coverageGap: '대형 시설 보험한도, 배터리·냉각액 손해 원인 구분, 건설-운영 전환기, 전쟁·드론 면책의 적용 기준이 기존 약관과 맞지 않을 수 있습니다.',
      nextAction: '데이터센터 생애주기 인수 기준을 만들고 배터리·냉각·시운전·지정학적 위험별 독립 근거와 국내 시설 적용성을 확인합니다.',
      uncertainty: ['글로벌 손해 비중과 국내 시설의 실제 손해율은 동일하다고 볼 수 없습니다.', '국내 18.4GW 계획은 보험 가입 확정 물량이 아닙니다.'],
      counterEvidence: ['Aon·Marsh 등 생애주기 프로그램이 출시되어 시장 대응이 시작된 상태입니다.'],
      confidence: { level: 'high', reason: '본문에 금액·비율·보험기간 공백·손해 원인이 함께 제시되어 구조화 신호가 명확합니다.' },
      metricScores: metricScores({ demand: 4.7, fortuity: 4.1, accumulation: 4.9, measurability: 3.6, adverseSelection: 3.2, moralHazard: 3.4, dataConfidence: 4.2, legalExposure: 3.9 }),
      trend: [42, 55, 68, 76, 84, 93, 100],
      recommendation: 'review',
      publishedAt: '2026-07-27',
    }
  }

  if (file.includes('Warming Switzerland') || file.includes('sri-2026-06')) {
    const german = file.includes('sri-')
    return {
      ...base,
      title: '폭염·열대야의 건강·도시 운영 리스크',
      clusterKey: 'switzerland-heat-risk',
      category: '기후·건강',
      summary: 'Swiss Re는 폭염이 홍수·폭풍처럼 눈에 보이지 않아 과소평가되지만 건강, 노동, 도시 운영과 다른 자연재해를 함께 압박한다고 설명합니다. 1990년 5일이던 연간 30°C 초과 일수가 현재 10~15일로 늘었고 3°C 상승 시나리오에서는 세기 중반 20~30일까지 증가할 수 있습니다.',
      event: '고온일·열대야·물 스트레스의 장기 증가',
      changeType: '서서히 진행되는 기후 위험의 가시화',
      affectedTargets: ['고령자·기저질환자', '도시 거주 가구·사업장', '보건의료 시스템', '지자체·전력·용수 사업자'],
      damageTypes: ['열사병·탈수·심혈관 부담', '사망률 증가', '노동·영업 생산성 저하', '냉방·용수 비용 증가', '기타 자연재해 증폭'],
      industries: ['기후·자연재해', '건강', '도시 인프라', '고용·영업중단'],
      facts: [
        '연간 30°C 초과 일수는 1990년 약 5일에서 현재 10~15일로 늘었습니다.',
        '지구 평균 3°C 상승 시나리오에서는 세기 중반 20~30일까지 늘어날 수 있습니다.',
        '2003년 유럽 폭염 당시 스위스 사망률은 해당 연도 1.5% 증가했습니다.',
        '취리히 열대야는 1981~2010년 대비 2011~2025년에 12배, 스위스 가구의 에어컨 보급률은 약 5%입니다.',
      ],
      metrics: [
        { label: '연간 고온일', value: '5일(1990) → 10~15일(현재) → 20~30일(3°C 시나리오)' },
        { label: '2003년 폭염 사망률', value: '+1.5%' },
        { label: '취리히 열대야 증가', value: '12배 · 1981~2010 대비 2011~2025' },
        { label: '도시·농촌 온도 차', value: '최대 6°C' },
        { label: '에어컨 보급 가구', value: '약 5%' },
      ],
      keywords: ['폭염', '열대야', '기후 건강', '도시 열섬', '물 스트레스', '고령자 취약성'],
      evidenceQuotes: [quote(text, ['10-15', '10–15', '1.5', 'Hitzetage'], '폭염일수와 건강 영향을 정량적으로 설명하는 원문입니다.')],
      coverageGap: '급성 재해 중심의 보장만으로는 서서히 누적되는 열 노출, 건강·생산성 손해, 냉방 취약성과 도시별 편차를 설명하기 어렵습니다.',
      nextAction: '국내 폭염일수·열대야·초과사망·영업중단 데이터를 결합해 지수형 또는 비용보전형 검토 가능성을 탐색하되 실제 보장 여부는 공식 약관 확인 후 판단합니다.',
      uncertainty: ['스위스의 기후·건강 수치를 국내 위험도로 직접 환산할 수 없습니다.', '열 관련 손해의 보험금 지급 가능성은 상품·약관·인과관계 검토가 필요합니다.'],
      counterEvidence: ['겨울철 사망률 감소가 일부 상쇄할 수 있다는 본문 설명도 있어 연간 순손해 방향은 단정할 수 없습니다.'],
      confidence: { level: 'high', reason: german ? '영문 원문과 동일 주제의 독일어 연구 PDF가 함께 확보되어 핵심 수치가 반복됩니다.' : '연도·온도·사망률·보급률이 원문에 함께 제시됩니다.' },
      metricScores: metricScores({ demand: 4.4, fortuity: 3.3, accumulation: 4.2, measurability: 3.7, adverseSelection: 3.1, moralHazard: 2.7, dataConfidence: 4.1, legalExposure: 2.8 }),
      trend: [35, 46, 58, 65, 74, 86, 96],
      recommendation: 'review',
      publishedAt: '2026-06-25',
    }
  }

  if (file.includes('보험개발원_신기술')) {
    return {
      ...base,
      title: '우주산업 상업화와 우주보험 인수 데이터 공백',
      clusterKey: 'commercial-space-insurance',
      category: '신기술·보험 인프라',
      summary: '보험개발원 자료는 위성 발사가 반복적·상업적 서비스로 전환되면서 발사·궤도·제3자 책임을 다루는 우주보험 수요가 커지지만, 국내는 사고 데이터·표준화된 위험평가 기준·전문인력이 부족하다고 정리합니다. 같은 문서의 신기술 동향은 AI 전자코·XR·피지컬 AI 등 신종 위험 원천도 함께 보여줍니다.',
      event: '민간 우주 발사·신기술 상용화',
      changeType: '새로운 위험의 상업화와 평가 인프라 부족',
      affectedTargets: ['위성·발사체 사업자', '우주보험 인수·재보험 조직', '정부·우주항공 기관', 'AI·XR·로봇 기술 사업자'],
      damageTypes: ['발사 실패·위성 고장', '궤도상 손해', '제3자 배상책임', '신기술 오작동·안전사고', '데이터 부족에 따른 인수 불확실성'],
      industries: ['우주항공', 'AI·로봇', 'XR', '식품·헬스케어'],
      facts: [
        '민간 발사가 일회성 프로젝트에서 반복적·상업적 서비스로 바뀌며 발사·궤도상·제3자 책임 보험의 필요성이 커지고 있습니다.',
        '국내 과제는 사고 데이터, 표준화된 위험평가 기준, 전문인력, 해외 재보험 의존도입니다.',
        '일본은 JAXA와 보험사가 위험 데이터와 인수 경험을 결합해 정량평가 체계를 구축하고 있습니다.',
        '신기술 사례 중 ML-SCENT는 7.5mm × 7.5mm 칩에 16개 가스센서를 집적하고, XR 셀프블렌딩 실험에는 18명이 참여했습니다.',
      ],
      metrics: [
        { label: '우주보험 인프라 공백', value: '사고 데이터·표준 기준·전문인력 부족' },
        { label: 'ML-SCENT 센서', value: '16개 · 7.5mm × 7.5mm 칩' },
        { label: 'XR 셀프블렌딩 실험', value: '18명 참가' },
        { label: '문서 내 신기술·보험 동향', value: '26페이지·다중 사례' },
      ],
      keywords: ['우주보험', '발사보험', '궤도상 보험', '제3자 책임', 'AI 전자코', '피지컬 AI', 'XR'],
      evidenceQuotes: [quote(text, ['사고 데이터', '우주보험', '16개의 초소형'], '우주보험의 평가 인프라 부족과 신기술의 정량 지표가 함께 제시된 원문입니다.')],
      coverageGap: '사고 표본이 적은 우주위험을 평가할 표준 데이터·약관·전문역량이 부족하고, 신기술별 책임 주체와 손해 측정 기준도 아직 분리되어 있습니다.',
      nextAction: '우주보험을 1차 후보로 분리해 사고 데이터·책임한도·표준약관·재보험 구조를 확인하고, 나머지 신기술 사례는 별도 후보 큐로 분해합니다.',
      uncertainty: ['자료 한 건에 여러 신기술 사례가 묶여 있어 우주보험 신호와 개별 기술 위험을 동일 후보로 확정하면 안 됩니다.', '신기술 성능 지표가 보험 손해율을 의미하지는 않습니다.'],
      counterEvidence: ['일본의 민관협력 및 기존 보험사의 인수 경험은 시장 형성 가능성을 보여주는 보완 근거입니다.'],
      confidence: { level: 'medium', reason: '핵심 우주보험 신호는 명확하지만 한 문서에 여러 기술 사례가 혼재합니다.' },
      metricScores: metricScores({ demand: 4, fortuity: 4.5, accumulation: 4.1, measurability: 2.6, adverseSelection: 3.2, moralHazard: 2.8, dataConfidence: 2.9, legalExposure: 4.2 }),
      trend: [30, 42, 51, 63, 69, 77, 88],
      recommendation: 'review',
      publishedAt: '2026-06-30',
    }
  }

  if (file.includes('고용보험_및_산업재해')) {
    return {
      ...base,
      title: '고용·산재 보험료 징수법 시행 변화',
      clusterKey: 'employment-industrial-insurance-law',
      category: '법령·규제',
      summary: '국가법령정보센터 원문은 고용보험과 산업재해보상보험의 보험관계 성립·소멸, 보험료 납부·징수, 보수·원수급인·하수급인 정의와 정보통신망 신고를 규정합니다. 일부개정 법률 제21472호는 2027년 1월 1일 시행 예정입니다.',
      event: '고용·산재 보험료 징수 체계 개정',
      changeType: '시행일 도래에 따른 준법·운영 확인',
      affectedTargets: ['사업주·원수급인·하수급인', '근로자·예술인·노무제공자', '근로복지공단·국민건강보험공단', '보험·노무 운영 담당자'],
      damageTypes: ['보험료 산정·징수 오류', '신고·납부 누락', '도급 관계 책임 오인', '준법 비용·행정 리스크'],
      industries: ['고용보험', '산업재해보상보험', '건설·도급', '노무·인사'],
      facts: [
        '시행일은 2027년 1월 1일이며 법률 제21472호(2026년 3월 17일 일부개정)입니다.',
        '법률은 보험관계 성립·소멸과 보험료 납부·징수에 필요한 사항을 정합니다.',
        '근로자·예술인·노무제공자의 보수와 기준보수, 원수급인·하수급인, 정보통신망 신고를 정의합니다.',
      ],
      metrics: [
        { label: '시행일', value: '2027.01.01' },
        { label: '법률 번호', value: '제21472호 · 2026.03.17 일부개정' },
        { label: '원문 규모', value: '31페이지 · 국가법령정보센터' },
        { label: '주요 적용 축', value: '보험관계·보수·도급·신고·징수' },
      ],
      keywords: ['고용보험', '산재보험', '보험료 징수', '기준보수', '원수급인', '하수급인', '시행일'],
      evidenceQuotes: [quote(text, ['[시행 2027. 1. 1.]', '원수급인', '정보통신망'], '시행일과 보험료 징수 적용 범위를 규정한 법령 원문입니다.')],
      coverageGap: '상품 보장 공백이 아니라 법령 적용 대상·시행일·도급 관계·보험료 산정 기준을 운영 프로세스에 반영해야 하는 준법 확인 영역입니다.',
      nextAction: '법무·준법 담당자가 시행령·고시·연혁까지 대조하고, 상품화 후보로 자동 승격하지 않은 채 운영 영향만 기록합니다.',
      uncertainty: ['법률 본문만으로 개별 사업장의 적용 결과나 보험상품 보장 여부를 단정할 수 없습니다.', '시행 전 하위 법령·고시와 연혁 확인이 필요합니다.'],
      counterEvidence: ['법령은 위험 발생·손해 규모보다 행정·징수 체계를 다루므로 상품 후보와 분리하는 것이 타당합니다.'],
      confidence: { level: 'high', reason: '시행일·법률 번호·정의·수행 주체가 공식 법령 원문에 명시되어 있습니다.' },
      metricScores: metricScores({ demand: 3.3, fortuity: 2.2, accumulation: 2.4, measurability: 4.1, adverseSelection: 2.1, moralHazard: 2.4, dataConfidence: 4.7, legalExposure: 4.9 }),
      trend: [48, 50, 56, 65, 72, 84, 95],
      isRegulatory: true,
      recommendation: 'observe',
      publishedAt: '2026-03-17',
    }
  }

  if (file.includes('afoMp8BOoF08xomN')) {
    return {
      ...base,
      title: '변동성 환경의 손해보험 성장·자본 부담',
      clusterKey: 'axa-insurance-market-signal',
      category: '시장·자본',
      summary: 'AXA 1Q26 활동지표는 총 보험료·기타수익 380억 유로(+6%), 손해보험 215억 유로(+4%), 생명·건강 165억 유로(+8%)의 성장을 보여줍니다. 동시에 Solvency II 비율은 211%로 2026년 1월 1일 대비 4포인트 하락했고, 금융시장 변동성과 자연재해 예산이 주요 모니터링 지표로 제시됩니다.',
      event: '글로벌 보험료 성장과 금융·자연재해 변동성 병존',
      changeType: '성장 신호와 자본 변동성의 동시 확대',
      affectedTargets: ['손해보험 포트폴리오', '상업보험·중소기업 시장', '생명·건강보험', '재보험·자본관리 담당자'],
      damageTypes: ['자연재해 손해', '인플레이션·금리 변동', '요율·물량 믹스 변화', '지급여력 변동'],
      industries: ['손해보험', '생명·건강보험', '재보험', '자산운용'],
      facts: [
        '총 보험료·기타수익은 1Q25 대비 6% 증가해 380억 유로입니다.',
        'P&C는 215억 유로(+4%), Life & Health는 165억 유로(+8%)입니다.',
        'Solvency II 비율은 2026년 3월 31일 211%로 1월 1일 대비 4포인트 하락했습니다.',
        '연간 자연재해 예산은 합산비율 기준 약 4.5포인트로 유지됩니다.',
      ],
      metrics: [
        { label: '총 보험료·기타수익', value: '380억 유로 · +6% YoY' },
        { label: 'P&C 보험료', value: '215억 유로 · +4%' },
        { label: 'Life & Health', value: '165억 유로 · +8%' },
        { label: 'Solvency II', value: '211% · 1월 1일 대비 -4pt' },
        { label: '자연재해 예산', value: '합산비율 약 4.5pt' },
      ],
      keywords: ['보험료 성장', 'P&C', 'Life & Health', 'Solvency II', '자연재해 예산', '금융시장 변동성'],
      evidenceQuotes: [quote(text, ['Solvency II ratio', '38.0', '4.5 points'], '보험료 성장과 지급여력·자연재해 예산을 함께 제시한 회사 공시 원문입니다.')],
      coverageGap: '글로벌 동종사 지표만으로 국내 상품 공백을 증명할 수 없으며, 국내 손해율·재보험 비용·자연재해 노출과의 교차검증이 필요합니다.',
      nextAction: '국내 포트폴리오·자연재해 손해·자본 지표와 비교하고, 개별 상품 후보가 아닌 시장 모니터링 근거로 우선 보류합니다.',
      uncertainty: ['AXA의 유럽·글로벌 지표를 국내 보험시장 성과로 일반화할 수 없습니다.', '회사 공시의 성장률은 위험 발생 빈도나 보장 공백을 직접 의미하지 않습니다.'],
      counterEvidence: ['211%의 Solvency II 비율과 견조한 성장 전망은 즉각적인 자본 위기 신호와는 거리가 있습니다.'],
      confidence: { level: 'high', reason: '회사 공시의 기간·금액·증감률·지급여력 지표가 명시되어 있습니다.' },
      metricScores: metricScores({ demand: 3.1, fortuity: 2.8, accumulation: 3.6, measurability: 4.3, adverseSelection: 2.2, moralHazard: 2.1, dataConfidence: 4.6, legalExposure: 2.4 }),
      trend: [40, 47, 52, 58, 63, 68, 74],
      recommendation: 'hold',
      publishedAt: '2026-05-05',
    }
  }

  if (file === 'law74.hwp') {
    return {
      ...base,
      title: 'law74.hwp 법령 원문 구조화 대기',
      clusterKey: 'law74-pending-extraction',
      category: '법령·규제',
      summary: 'HWP 3.00 바이너리 원문은 파일 자산까지 연결되어 있으나 현재 브라우저 추출기에서 본문이 반환되지 않아 제목·조문·시행일을 확정하지 않았습니다.',
      event: '구형 HWP 법령 문서 수집',
      changeType: '원문 추출 어댑터 보강 필요',
      affectedTargets: ['법무·준법 담당자', '원문 적용 대상 확인 필요'],
      damageTypes: ['조문 오독', '시행일 오인', '적용 범위 누락'],
      industries: ['법령·규제'],
      facts: ['HWP Document File V3.00 형식으로 확인되었습니다.', '본문 추출 전에는 법령명·조문·시행일을 화면에서 확정하지 않습니다.'],
      metrics: [{ label: '파일 형식', value: 'HWP 3.00' }, { label: '본문 추출', value: '대기' }],
      keywords: ['HWP', '법령 원문', '추출 어댑터'],
      evidenceQuotes: [],
      coverageGap: '원문 본문이 추출되지 않아 법률 적용·상품 연결을 표시할 수 없습니다.',
      nextAction: 'HWP 전용 서버 추출 어댑터 또는 PDF 변환본을 연결한 뒤 조문·시행일·적용 주체를 재분석합니다.',
      uncertainty: ['파일명만으로 법령 내용과 위험 판단을 만들지 않습니다.'],
      counterEvidence: ['현재는 파일 존재와 형식만 확인되었습니다.'],
      confidence: { level: 'low', reason: '본문 추출 전 상태입니다.' },
      metricScores: metricScores({ demand: 1.5, fortuity: 1.5, accumulation: 1.5, measurability: 1, dataConfidence: 0.5, legalExposure: 4 }),
      trend: [10, 10, 12, 12, 14, 14, 16],
      isRegulatory: true,
      recommendation: 'hold',
    }
  }

  return base
}

function sourceNameFor(file: string) {
  if (file.includes('Swiss') || file.includes('sri-')) return 'Swiss Re Institute 원문'
  if (file.includes('보험개발원')) return '보험개발원 신기술 동향 원문'
  if (file.includes('보험연구원')) return '보험연구원 KIRI 리포트 원문'
  if (file.includes('고용보험')) return '국가법령정보센터 원문'
  if (file.includes('afoMp8')) return 'AXA 1Q26 공시 원문'
  return 'src/article 법령 원문'
}

function articleId(index: number) {
  return `ARTICLE-${String(index + 1).padStart(3, '0')}`
}

export async function loadArticleSourceRecords(): Promise<ArticleSourceRecord[]> {
  const available = new Map(Object.entries(articleAssets).map(([path, url]) => [fileName(path), url]))
  const names = [...preferredFileOrder, ...[...available.keys()].filter((name) => !preferredFileOrder.includes(name as (typeof preferredFileOrder)[number]))]
  return Promise.all(names.filter((name) => available.has(name)).map(async (name, index) => {
    const url = available.get(name)
    if (!url) throw new Error(`${name}: source asset is unavailable`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${name}: source file could not be read`)
    const blob = await response.blob()
    const extension = name.split('.').pop()?.toLowerCase()
    const text = extension === 'pdf'
      ? await readPdfFile(new File([blob], name, { type: 'application/pdf' }))
      : ''
    const normalizedText = normalizeText(text)
    const derived = deriveAnalysis(name, normalizedText)
    const collectedAt = new Date().toISOString()
    return {
      id: articleId(index),
      title: derived.title,
      summary: derived.summary,
      content: normalizedText,
      source: sourceNameFor(name),
      publishedAt: derived.publishedAt,
      collectedAt,
      contentStatus: extension === 'pdf' ? 'PDF 본문 추출 완료' : 'HWP 원문 연결 · 본문 추출 대기',
      contentSource: 'src/article',
      contentQuality: { chars: normalizedText.length, paragraphs: normalizedText ? normalizedText.split(/\n{2,}/).length : 0, titleMatched: normalizedText ? 1 : 0, titleTokens: derived.title.split(/\s+/).length },
      analysisStatus: '본문 기반 구조화 더미 완료',
      verificationStatus: derived.confidence.level === 'low' ? '원문 추출 확인 필요' : '독립 출처 검증 필요',
      text: normalizedText,
      fileName: name,
      derived,
    }
  }))
}

function toNewsArticle(record: ArticleSourceRecord): RadarNewsArticle {
  const { text, fileName, derived, ...article } = record
  void text
  void fileName
  const analysis: RadarNewsAnalysis = {
    articleId: record.id,
    articleFacts: {
      facts: derived.facts,
      event: derived.event,
      changeType: derived.changeType,
      affectedTargets: derived.affectedTargets,
      damageTypes: derived.damageTypes,
      industries: derived.industries,
      timeAndPlace: derived.publishedAt ? `${derived.publishedAt} · 원문 기재 시점` : '원문 시점 확인 필요',
    },
    riskInterpretation: {
      riskEnvironment: derived.summary,
      whyNow: derived.changeType,
      expectedLosses: derived.damageTypes,
      responsibilityCandidates: derived.affectedTargets,
      searchKeywords: derived.keywords,
    },
    evidence: derived.evidenceQuotes.map((quoteText, index) => ({ sentenceNo: index + 1, quote: quoteText, reason: '원문 본문에서 핵심 수치·위험 원인을 확인한 구조화 더미 근거' })),
    uncertainty: derived.uncertainty,
    confidence: derived.confidence,
    verificationStatus: record.verificationStatus ?? '독립 출처 검증 필요',
    verificationGate: { status: 'pending', blockers: derived.uncertainty, sourceCount: 1, requiredSourceCount: 2, evidenceCheck: { total: derived.evidenceQuotes.length, matched: derived.evidenceQuotes.length, unmatched: 0, status: 'content-derived-demo' }, lawSearchStatus: derived.isRegulatory ? 'source-document-only' : 'not-run' },
    evidenceCheck: { total: derived.evidenceQuotes.length, matched: derived.evidenceQuotes.length, unmatched: 0, status: 'content-derived-demo' },
    sourceCount: 1,
    lawSearchStatus: derived.isRegulatory ? 'source-document-only' : 'not-run',
    analyzedAt: record.collectedAt,
    model: 'content-derived-demo-v1',
    promptVersion: 'display-contract-only',
    crossValidationMode: 'not-run',
  }
  return { ...article, analysis }
}

export function deriveArticleDashboard(records: ArticleSourceRecord[]): {
  dashboard: RadarDashboardData
  news: RadarNewsArticle[]
  risks: RadarRiskCandidate[]
} {
  const news = records.map(toNewsArticle)
  const risks = records.map((article) => ({
    id: `RISK-${article.id}`,
    articleId: article.id,
    clusterId: `CLUSTER-${article.derived.clusterKey}`,
    name: article.derived.title,
    source: article.source,
    status: article.derived.recommendation === 'review' ? '본문 기반 후보 · 담당자 검토' : article.derived.recommendation === 'hold' ? '본문 기반 신호 · 보류' : '본문 기반 신호 · 관찰',
    eligibleForProductReview: false,
    promotionBlockReason: article.derived.nextAction,
    facts: news.find((item) => item.id === article.id)?.analysis?.articleFacts,
    riskInterpretation: news.find((item) => item.id === article.id)?.analysis?.riskInterpretation,
    confidence: article.derived.confidence,
  }))
  const clusterMap = new Map<string, ArticleSourceRecord[]>()
  records.forEach((record) => clusterMap.set(record.derived.clusterKey, [...(clusterMap.get(record.derived.clusterKey) ?? []), record]))
  const clusters = [...clusterMap.entries()].map(([key, items]) => ({
    id: `CLUSTER-${key}`,
    title: items[0].derived.title,
    articleIds: items.map((item) => item.id),
    articleCount: items.length,
    sourceCount: new Set(items.map((item) => item.source)).size,
    keywords: [...new Set(items.flatMap((item) => item.derived.keywords))].slice(0, 8),
    sources: [...new Set(items.map((item) => item.source).filter((source): source is string => Boolean(source)))],
  }))
  const generatedAt = new Date().toISOString()
  const pendingVerification = records.filter((record) => record.derived.confidence.level !== 'high').length
  const dashboard: RadarDashboardData = {
    generatedAt,
    metrics: {
      news: records.length,
      contentReady: records.filter((record) => record.text.length > 0).length,
      analyzed: records.length,
      pending: records.filter((record) => record.derived.recommendation !== 'hold').length,
      failed: records.filter((record) => record.text.length === 0).length,
      clusters: clusters.length,
      evidencePending: records.length,
      riskCandidates: risks.length,
      totalSignals: records.reduce((total, record) => total + Math.max(1, record.derived.metrics.length), 0),
      verificationPassed: 0,
      verificationPending: pendingVerification,
      lawMatched: records.filter((record) => record.derived.isRegulatory).length,
      reviewerPending: records.length,
      productApiWaiting: records.filter((record) => record.derived.recommendation === 'review').length,
      issueClusters: clusters.length,
      issueSignals: records.length,
    },
    channels: records.reduce<Record<string, number>>((channels, record) => ({ ...channels, [record.source ?? 'src/article']: (channels[record.source ?? 'src/article'] ?? 0) + 1 }), {}),
    analysisCounts: { 'PDF 본문 추출 완료': records.filter((record) => record.text.length > 0).length, '본문 기반 구조화 더미': records.length, '독립 출처 검증 대기': records.length },
    clusters,
    topNews: news,
    risks,
    issues: [],
    signals: [],
    recentActivities: records.map((record) => ({ type: 'article', title: `${record.derived.title} · 본문 구조화`, status: record.derived.recommendation === 'review' ? '검토 필요' : '보류·관찰', at: generatedAt })),
    failures: records.filter((record) => record.text.length === 0).map((record) => ({ id: record.id, title: record.fileName, error: '본문 추출 어댑터 대기' })),
    apiStatus: { potens: 'not_used', law: 'not_run', products: 'not_run' },
    lastSync: { completedAt: generatedAt, status: 'local-src-article-content-derived-demo' },
  }
  return { dashboard, news, risks }
}
