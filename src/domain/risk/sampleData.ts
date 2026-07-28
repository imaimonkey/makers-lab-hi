import {
  calculateRiskExplorationScore,
  riskExplorationRecords,
  type RiskExplorationRecord,
} from './riskExplorationDemo'
import type { RiskEvidenceContract, RiskTheme } from './types'

export type SampleRiskCandidate = {
  id: string
  title: string
  theme: RiskTheme
  themeLabel: string
  signalStrength: number
  productFit: number | null
  evidenceCount: number
  status: '신규' | '검토 중' | '관찰'
  trend: string
  updatedAt: string
}

export type SampleRiskAssessment = {
  label: string
  score: number
  confidence: '높음' | '보통' | '낮음'
  note: string
}

export type SampleRiskEvidence = RiskEvidenceContract & {
  type: string
  /** 기존 화면 표시와의 호환 필드입니다. 실제 발행일이 확인되면 publishedAt을 우선합니다. */
  date: string
}

export type SampleRiskDetail = {
  riskStatement: string
  exposedParty: string
  primaryLoss: string
  decisionStatus: string
  decisionBadge: string
  decisionTitle: string
  decisionTone: 'advance' | 'hold' | 'observe'
  decisionChecks: string[]
  assessments: SampleRiskAssessment[]
  evidence: SampleRiskEvidence[]
}

type RiskContext = {
  theme: RiskTheme
  themeLabel: string
  exposedParty: string
  primaryLoss: string
}

const SAMPLE_AS_OF = '2026-07-23T00:00:00.000Z'

const riskContextById: Record<string, RiskContext> = {
  'ev-battery-fire': {
    theme: 'mobility',
    themeLabel: '자동차·모빌리티',
    exposedParty: '전기차 이용자·충전사업자·주차시설 운영자',
    primaryLoss: '화재 재물손해·대인손해·영업중단',
  },
  'generative-ai-copyright': {
    theme: 'ai-digital',
    themeLabel: 'AI·디지털',
    exposedParty: 'AI 도입 기업·콘텐츠 사업자·권리자',
    primaryLoss: '분쟁 방어비용·배상책임·매출 손실',
  },
  'commercial-drone': {
    theme: 'mobility',
    themeLabel: '모빌리티·물류',
    exposedParty: '물류기업·드론 운영자·제3자',
    primaryLoss: '대인·대물 배상·배송 지연 비용',
  },
  'autonomous-level4': {
    theme: 'mobility',
    themeLabel: '자동차·모빌리티',
    exposedParty: '자율주행 이용자·제조사·운영사업자',
    primaryLoss: '대인·대물 손해·제품책임·분쟁비용',
  },
  'deepfake-phishing': {
    theme: 'ai-digital',
    themeLabel: 'AI·금융범죄',
    exposedParty: '소상공인·기업 재무담당자·금융 이용자',
    primaryLoss: '사기 금전손실·복구비·분쟁비용',
  },
  'urban-flooding': {
    theme: 'climate-energy',
    themeLabel: '기후·재난',
    exposedParty: '지하공간 이용자·상가·주택 소유자',
    primaryLoss: '침수 재물손해·복구비·영업중단',
  },
  'enterprise-ransomware': {
    theme: 'ai-digital',
    themeLabel: '사이버·기업',
    exposedParty: '기업·공급망 협력사·온라인 서비스 이용자',
    primaryLoss: '데이터 복구비·영업중단·배상책임',
  },
  'ess-ups-battery-fire': {
    theme: 'climate-energy',
    themeLabel: '에너지·기업',
    exposedParty: '데이터센터·공장·설비 운영자',
    primaryLoss: '화재 재물손해·장시간 운영중단·배상책임',
  },
  'heatwave-health-income-loss': {
    theme: 'health-lifestyle',
    themeLabel: '건강·기후',
    exposedParty: '옥외근로자·취약계층·사업장',
    primaryLoss: '온열질환 비용·작업중단·소득 공백',
  },
  'platform-worker-transit-accident': {
    theme: 'platform-work',
    themeLabel: '플랫폼·이동',
    exposedParty: '배달·대리·퀵서비스 종사자',
    primaryLoss: '교통상해·치료비·휴업 소득손실',
  },
}

const fallbackContext: RiskContext = {
  theme: 'ai-digital',
  themeLabel: '신규위험',
  exposedParty: '영향 대상 확인 필요',
  primaryLoss: '손실 유형 확인 필요',
}

function parsePercent(value: string): number {
  const parsed = Number(value.match(/\d+/)?.[0])
  return Number.isFinite(parsed) ? parsed : 50
}

function toPercent(score: number): number {
  return Math.round(Math.min(5, Math.max(1, score)) * 20)
}

function getConfidence(record: RiskExplorationRecord): SampleRiskAssessment['confidence'] {
  const confidence = parsePercent(record.dataConfidence)
  if (confidence >= 80) return '높음'
  if (confidence >= 65) return '보통'
  return '낮음'
}

function getCandidateStatus(record: RiskExplorationRecord): SampleRiskCandidate['status'] {
  const demand = parsePercent(record.demand)
  const productFit = Math.round(calculateRiskExplorationScore(record.metricScores) * 20)
  if (demand >= 75) return '검토 중'
  if (productFit >= 65) return '신규'
  return '관찰'
}

function pendingEvidence(
  record: RiskExplorationRecord,
  suffix: string,
  type: string,
  title: string,
  excerpt: string,
  supports: string[],
  counterpoint: string,
): SampleRiskEvidence {
  return {
    id: `${record.detailRiskId}-evidence-${suffix}`,
    type,
    sourceType: 'internal-sample',
    sourceName: 'TOP-10 위험 후보 비교 렌즈 · SAMPLE',
    title,
    sourceUrl: null,
    publishedAt: null,
    date: '원문 확인 대기',
    excerpt,
    supports,
    confidence: 'low',
    uncertainty: '공식 통계·원문·발행 시각이 아직 연결되지 않은 검토용 SAMPLE 항목입니다.',
    counterpoint,
    verificationStatus: 'source-pending',
    dataStatus: 'sample-only',
  }
}

function linkedEvidence(
  id: string,
  type: string,
  sourceType: RiskEvidenceContract['sourceType'],
  sourceName: string,
  title: string,
  sourceUrl: string,
  supports: string[],
  uncertainty: string,
): SampleRiskEvidence {
  return {
    id,
    type,
    sourceType,
    sourceName,
    title,
    sourceUrl,
    publishedAt: null,
    date: '발행일 확인 대기',
    excerpt: 'sh 원본에서 제공된 URL을 원문 후보로 연결한 SAMPLE 항목입니다. 링크 대상의 구체적 주장과 수치는 아직 검증하지 않았습니다.',
    supports,
    confidence: 'low',
    uncertainty,
    counterpoint: '링크가 존재한다는 사실만으로 해당 위험의 발생 빈도·손해 규모·보험 적용 가능성을 입증하지 않습니다.',
    verificationStatus: 'link-provided-unverified',
    dataStatus: 'sample-only',
  }
}

const linkedEvidenceByRiskId: Record<string, SampleRiskEvidence[]> = {
  'generative-ai-copyright': [
    linkedEvidence(
      'generative-ai-copyright-evidence-kisa',
      '기관 원문 후보',
      'research',
      '한국인터넷진흥원(KISA)',
      '생성형 AI·정보보호 통제 관련 원문 후보',
      'https://www.kisa.or.kr',
      ['risk:generative-ai-copyright', 'assessment:data-confidence'],
      '기관 홈페이지 링크이며 특정 연구 문서·발행일·저작권 위험과의 직접 관련성은 확인 대기입니다.',
    ),
    linkedEvidence(
      'generative-ai-copyright-evidence-etnews',
      '뉴스 원문 후보',
      'news',
      '전자신문',
      '기업용 AI 도입과 데이터·권리 관리 관련 기사 후보',
      'https://www.etnews.com',
      ['risk:generative-ai-copyright', 'assessment:demand'],
      '매체 홈페이지 링크이며 정확한 기사 URL·발행일·인용 범위는 확인 대기입니다.',
    ),
    linkedEvidence(
      'generative-ai-copyright-evidence-pipc',
      '규제 원문 후보',
      'regulation',
      '개인정보보호위원회(PIPC)',
      '생성형 AI 개인정보 처리 안내 관련 원문 후보',
      'https://www.pipc.go.kr',
      ['risk:generative-ai-copyright', 'assessment:legal-review'],
      '기관 홈페이지 링크이며 저작권 책임과 개인정보 규율을 구분한 추가 법률 검토가 필요합니다.',
    ),
  ],
  'enterprise-ransomware': [
    linkedEvidence(
      'enterprise-ransomware-evidence-verizon-dbir',
      '보고서 원문 후보',
      'report',
      'Verizon Business',
      'Data Breach Investigations Report 원문 후보',
      'https://www.verizon.com/business/resources/reports/dbir/',
      ['risk:enterprise-ransomware', 'assessment:data-confidence'],
      'DBIR의 세부 연도·표본·랜섬웨어 분류와 현재 후보의 직접 대응 관계는 원문 검증이 필요합니다.',
    ),
  ],
}

function buildEvidence(record: RiskExplorationRecord): SampleRiskEvidence[] {
  return [
    pendingEvidence(
      record,
      'candidate',
      '후보 기록',
      `${record.title} 위험 후보 요약`,
      record.summary,
      [`risk:${record.detailRiskId}`, 'assessment:demand'],
      '후보 비교 순위와 수요 점수는 실제 사고 발생이나 보험 수요를 확정하지 않습니다.',
    ),
    pendingEvidence(
      record,
      'gap',
      '검증 과제',
      `${record.title} 데이터·보장 공백 확인`,
      record.gap,
      [`risk:${record.detailRiskId}`, 'decision:gap-review'],
      '기존 상품·약관·공식 손해 통계를 확인하면 공백 가설이 축소되거나 반증될 수 있습니다.',
    ),
    pendingEvidence(
      record,
      'next-action',
      '후속 조사',
      `${record.title} 다음 검토 항목`,
      record.nextAction,
      [`risk:${record.detailRiskId}`, 'decision:next-action'],
      '후속 조사 결과에 따라 우선순위와 상품화 판단은 변경될 수 있습니다.',
    ),
    ...(linkedEvidenceByRiskId[record.detailRiskId] ?? []),
  ]
}

function buildAssessments(record: RiskExplorationRecord): SampleRiskAssessment[] {
  const confidence = getConfidence(record)
  return [
    {
      label: '시장 수요 신호',
      score: toPercent(record.metricScores.demand),
      confidence,
      note: `${record.demand} · TOP-10 비교용 SAMPLE이며 실제 가입 수요가 아닙니다.`,
    },
    {
      label: '사고 우연성',
      score: toPercent(record.metricScores.fortuity),
      confidence,
      note: `${record.fortuity} · 공식 사고 정의와 약관 기준 확인이 필요합니다.`,
    },
    {
      label: '측정 가능성',
      score: toPercent(record.metricScores.measurability),
      confidence,
      note: `${record.measurability} · ${record.gap}`,
    },
    {
      label: '데이터 신뢰도',
      score: toPercent(record.metricScores.dataConfidence),
      confidence,
      note: `${record.dataConfidence} · 원문·표본·최신 시각 확인 전 SAMPLE입니다.`,
    },
    {
      label: '법적 검토 준비도',
      score: toPercent(6 - record.metricScores.legalExposure),
      confidence,
      note: `법적 위험 ${record.legalExposure} · 책임 주체와 공식 규정 확인이 필요합니다.`,
    },
  ]
}

function buildDecision(record: RiskExplorationRecord) {
  const status = getCandidateStatus(record)
  if (status === '검토 중') {
    return {
      decisionStatus: '우선 검토 · SAMPLE',
      decisionBadge: 'REVIEW · 근거 보강',
      decisionTitle: '신호는 높지만\n공식 원문 검증이 필요합니다.',
      decisionTone: 'hold' as const,
    }
  }
  if (status === '신규') {
    return {
      decisionStatus: '콘셉트 검토 · SAMPLE',
      decisionBadge: 'ADVANCE · 검토 착수',
      decisionTitle: '비교 점수는 유효하지만\n손해·책임 자료가 필요합니다.',
      decisionTone: 'advance' as const,
    }
  }
  return {
    decisionStatus: '관찰 지속 · SAMPLE',
    decisionBadge: 'OBSERVE · 데이터 축적',
    decisionTitle: '가설은 유지하되\n공식 근거를 더 축적합니다.',
    decisionTone: 'observe' as const,
  }
}

function buildDetail(record: RiskExplorationRecord): SampleRiskDetail {
  const context = riskContextById[record.detailRiskId] ?? fallbackContext
  return {
    riskStatement: `${record.summary} 가능성을 검토하는 SAMPLE 위험 가설입니다. 실제 손해 발생과 보험 적용 여부는 공식 자료로 확인해야 합니다.`,
    exposedParty: context.exposedParty,
    primaryLoss: context.primaryLoss,
    ...buildDecision(record),
    decisionChecks: [
      record.nextAction,
      record.gap,
      '공식 통계·원문과 최신 시각 확인',
      '기존 상품·약관과 책임 경계 확인',
    ],
    assessments: buildAssessments(record),
    evidence: buildEvidence(record),
  }
}

export const sampleRiskDetails = riskExplorationRecords.reduce<Record<string, SampleRiskDetail>>(
  (details, record) => {
    details[record.detailRiskId] = buildDetail(record)
    return details
  },
  {},
)

export const sampleRiskCandidates: SampleRiskCandidate[] = riskExplorationRecords.map((record) => {
  const context = riskContextById[record.detailRiskId] ?? fallbackContext
  const signalStrength = parsePercent(record.demand)
  const productFit = Math.round(calculateRiskExplorationScore(record.metricScores) * 20)
  return {
    id: record.detailRiskId,
    title: record.title,
    theme: context.theme,
    themeLabel: context.themeLabel,
    signalStrength,
    productFit,
    evidenceCount: sampleRiskDetails[record.detailRiskId].evidence.length,
    status: getCandidateStatus(record),
    trend: `수요 신호 ${signalStrength}% · SAMPLE`,
    updatedAt: SAMPLE_AS_OF,
  }
})

export const sampleRiskAliases: Record<string, string> = {
  'ai-liability': 'generative-ai-copyright',
  'home-ess-fire': 'ess-ups-battery-fire',
  'physical-ai-accident': 'autonomous-level4',
  'platform-worker-gap': 'platform-worker-transit-accident',
}

export function resolveSampleRiskId(riskId?: string): string | undefined {
  if (!riskId) return undefined
  return sampleRiskAliases[riskId] ?? riskId
}

export const sampleOnlyNotice = '예시 데이터 · 실제 내부 운영 데이터 아님'
