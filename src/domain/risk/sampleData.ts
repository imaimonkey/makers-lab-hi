import type { RiskTheme } from './types'

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

export type SampleRiskEvidence = {
  type: string
  title: string
  source: string
  date: string
  confidence: '높음' | '보통' | '낮음'
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

export const sampleRiskCandidates: SampleRiskCandidate[] = [
  {
    id: 'ai-liability',
    title: '생성형 AI 업무 오류·배상책임',
    theme: 'ai-digital',
    themeLabel: 'AI·디지털',
    signalStrength: 86,
    productFit: 58,
    evidenceCount: 12,
    status: '검토 중',
    trend: '+24%',
    updatedAt: '2026.07.18',
  },
  {
    id: 'home-ess-fire',
    title: '가정용 ESS·충전설비 화재',
    theme: 'climate-energy',
    themeLabel: '기후·에너지',
    signalStrength: 74,
    productFit: 67,
    evidenceCount: 9,
    status: '신규',
    trend: '+18%',
    updatedAt: '2026.07.17',
  },
  {
    id: 'physical-ai-accident',
    title: '생활로봇 오작동·대인 사고',
    theme: 'smart-living',
    themeLabel: '스마트리빙',
    signalStrength: 68,
    productFit: null,
    evidenceCount: 7,
    status: '관찰',
    trend: '+11%',
    updatedAt: '2026.07.16',
  },
  {
    id: 'platform-worker-gap',
    title: '플랫폼 노동자의 이동·소득 공백',
    theme: 'platform-work',
    themeLabel: '노동·플랫폼',
    signalStrength: 63,
    productFit: 42,
    evidenceCount: 6,
    status: '관찰',
    trend: '+9%',
    updatedAt: '2026.07.15',
  },
]

export const sampleRiskDetails: Record<string, SampleRiskDetail> = {
  'ai-liability': {
    riskStatement: '기업이 생성형 AI 결과를 업무에 활용하는 과정에서 오류·침해가 발생해 제3자 손해와 비용손해를 부담할 가능성',
    exposedParty: 'AI 활용 기업·임직원',
    primaryLoss: '배상책임·법률비용·영업중단',
    decisionStatus: '추가 조사 필요',
    decisionBadge: 'HOLD · 추가 조사',
    decisionTitle: '신호는 강하지만\n요율화 근거가 부족합니다.',
    decisionTone: 'hold',
    decisionChecks: [
      '상품 수요의 국내 세그먼트 검증',
      '기존 사이버보험·배상책임 약관 비교',
      '사고 빈도·심도·누적위험 자료 확보',
      '책임주체와 면책 경계 법률 검토',
    ],
    assessments: [
      { label: '신규성·증가성', score: 86, confidence: '높음', note: '기업 활용 확산과 책임 논의가 함께 관찰되는 샘플 가정' },
      { label: '보장 공백', score: 72, confidence: '보통', note: '기존 사이버·배상책임 담보와의 경계 확인 필요' },
      { label: '수요·시장성', score: 64, confidence: '보통', note: '기업 고객 관심 가설은 있으나 국내 세그먼트 검증 필요' },
      { label: '데이터·요율화', score: 38, confidence: '낮음', note: '빈도·심도·누적위험 데이터가 부족함' },
      { label: '책임·통제 가능성', score: 44, confidence: '낮음', note: '개발사·운영사·이용자 책임 귀속과 인과관계가 불명확함' },
    ],
    evidence: [
      { type: '보험연구', title: 'AI 사고 피해 구제와 보험제도 검토 자료', source: '검증 대기 샘플', date: '2026.05', confidence: '높음' },
      { type: '산업 신호', title: '기업 생성형 AI 도입과 오류·책임 이슈', source: '검증 대기 샘플', date: '2026.07', confidence: '보통' },
      { type: '법률·규제', title: 'AI 사고 책임주체와 입증책임 변화', source: '검증 대기 샘플', date: '2026.06', confidence: '보통' },
    ],
  },
  'home-ess-fire': {
    riskStatement: '가정·소규모 사업장의 ESS와 충전설비에서 열폭주·화재가 발생해 건물 손해와 이웃의 제3자 피해로 확대될 가능성',
    exposedParty: 'ESS 이용 가구·상가·설치사업자',
    primaryLoss: '화재재물·배상책임·임시거주비',
    decisionStatus: '콘셉트 검증 필요',
    decisionBadge: 'ADVANCE · 콘셉트 검증',
    decisionTitle: '손실은 명확하지만\n설비별 위험 구분이 필요합니다.',
    decisionTone: 'advance',
    decisionChecks: [
      '배터리 종류·용량·설치환경별 위험 세분화',
      '주택화재·배상책임 담보와 중복 범위 확인',
      '설치·점검 이력의 인수정보 활용 가능성',
      '제조사·시공사 구상권과 책임 경계 검토',
    ],
    assessments: [
      { label: '신규성·증가성', score: 74, confidence: '보통', note: '분산에너지 설비 확산과 가정 내 배터리 노출 증가 가정' },
      { label: '보장 공백', score: 67, confidence: '보통', note: '기존 화재보험과 설비 자체·간접손해 경계 확인 필요' },
      { label: '수요·시장성', score: 70, confidence: '보통', note: '설치 가구와 소규모 사업장 대상 수요 검증 필요' },
      { label: '데이터·요율화', score: 55, confidence: '보통', note: '설비 사양·설치 연도별 사고자료 결합이 필요함' },
      { label: '책임·통제 가능성', score: 62, confidence: '보통', note: '인증 시공·정기점검 조건으로 위험 통제 가능성 검토' },
    ],
    evidence: [
      { type: '사고 통계', title: '가정·상업용 ESS 화재 사고 유형 자료', source: '검증 대기 샘플', date: '2026.06', confidence: '보통' },
      { type: '설비 기준', title: '배터리 설치·점검 기준 변화', source: '검증 대기 샘플', date: '2026.07', confidence: '보통' },
      { type: '고객 신호', title: '스마트홈·ESS 복합 사용의 보장 문의', source: '비식별 집계 샘플', date: '2026.07', confidence: '낮음' },
    ],
  },
  'physical-ai-accident': {
    riskStatement: '생활로봇과 자율 이동기기가 오작동하거나 주변 환경을 잘못 인식해 이용자·방문자에게 상해와 재물손해를 일으킬 가능성',
    exposedParty: '로봇 이용 가구·시설·방문자',
    primaryLoss: '대인상해·재물손해·제품책임',
    decisionStatus: '관찰 지속',
    decisionBadge: 'OBSERVE · 데이터 축적',
    decisionTitle: '노출은 늘고 있지만\n사고 정의가 아직 넓습니다.',
    decisionTone: 'observe',
    decisionChecks: [
      '가정용·돌봄·배송 로봇별 사고 유형 분리',
      '제조물책임과 이용자 과실 경계 확인',
      '펌웨어·센서 상태의 인수정보 활용성',
      '경미 사고와 중대 상해 빈도 자료 축적',
    ],
    assessments: [
      { label: '신규성·증가성', score: 68, confidence: '보통', note: '생활공간 내 물리적 AI 기기 확산 신호를 가정함' },
      { label: '보장 공백', score: 58, confidence: '낮음', note: '일상생활배상·제조물책임과의 보장 주체 경계가 불명확함' },
      { label: '수요·시장성', score: 49, confidence: '낮음', note: '소비자 체감 위험과 지불의사 검증이 필요함' },
      { label: '데이터·요율화', score: 31, confidence: '낮음', note: '기기 유형별 사고 데이터가 충분하지 않음' },
      { label: '책임·통제 가능성', score: 46, confidence: '낮음', note: '소프트웨어·제조·사용 책임을 분리할 기준이 필요함' },
    ],
    evidence: [
      { type: '산업 신호', title: '가정·시설용 서비스 로봇 보급 변화', source: '검증 대기 샘플', date: '2026.07', confidence: '보통' },
      { type: '사고 유형', title: '자율 이동기기 충돌·전도 사고 분류', source: '검증 대기 샘플', date: '2026.06', confidence: '낮음' },
      { type: '책임 기준', title: '제품 오작동과 이용자 관리 책임 검토', source: '검증 대기 샘플', date: '2026.05', confidence: '낮음' },
    ],
  },
  'platform-worker-gap': {
    riskStatement: '복수 플랫폼에서 단기 업무를 수행하는 개인이 이동 중 사고·업무 중단을 겪어도 고용형태와 업무시간이 불명확해 소득 공백이 커질 가능성',
    exposedParty: '배달·운송·프리랜서 플랫폼 종사자',
    primaryLoss: '상해치료비·휴업손실·이동위험',
    decisionStatus: '대상 정의 필요',
    decisionBadge: 'HOLD · 세그먼트 정의',
    decisionTitle: '고객 문제는 분명하지만\n노출시간 측정이 필요합니다.',
    decisionTone: 'hold',
    decisionChecks: [
      '플랫폼·업무 유형별 보장 대상 정의',
      '업무 시작·종료와 이동시간 측정 방식',
      '산재·단체보험·개인보험 중복 범위 확인',
      '소득 증빙과 휴업손실 산정 가능성 검토',
    ],
    assessments: [
      { label: '신규성·증가성', score: 63, confidence: '보통', note: '복수 플랫폼·단기 업무 형태 확산 가정' },
      { label: '보장 공백', score: 69, confidence: '보통', note: '고용관계와 업무시간 불명확성으로 공백 가능성이 있음' },
      { label: '수요·시장성', score: 61, confidence: '보통', note: '소득중단 우려와 보험료 부담을 함께 검증해야 함' },
      { label: '데이터·요율화', score: 42, confidence: '낮음', note: '플랫폼 간 노출시간과 소득자료 표준화가 필요함' },
      { label: '책임·통제 가능성', score: 48, confidence: '낮음', note: '플랫폼·종사자·제3자 책임 경계 확인 필요' },
    ],
    evidence: [
      { type: '노동 변화', title: '복수 플랫폼 종사와 업무시간 변화', source: '검증 대기 샘플', date: '2026.07', confidence: '보통' },
      { type: '고객 신호', title: '이동·휴업 시 소득보장 문의 유형', source: '비식별 집계 샘플', date: '2026.06', confidence: '낮음' },
      { type: '제도 검토', title: '산재·민간보험 적용 경계 자료', source: '검증 대기 샘플', date: '2026.05', confidence: '보통' },
    ],
  },
}

export const sampleOnlyNotice = '화면 구조 검증을 위한 예시 데이터이며 실제 현대해상 내부 데이터가 아닙니다.'
