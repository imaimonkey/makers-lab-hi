import type { ScreeningCategory } from './riskScreeningInsights'
import { verifiedRiskLawTrackingOverrides } from './riskLawTrackingActualEvidence'

export type LawTrackingSourceType = 'assembly' | 'administrative'
export type LawTrackingRiskLevel = 'high' | 'medium' | 'low'
export type LawTrackingStage = 'complete' | 'current' | 'pending'
export type LawTrackingCaseTab = 'precedent' | 'loss'

export type LawTrackingTimelineStep = {
  label: string
  stage: LawTrackingStage
  date: string
}

export type LawTrackingChange = {
  label: string
  value: string
  emphasis?: 'neutral' | 'red' | 'blue'
}

export type LawTrackingCase = {
  type: string
  caseNumber: string
  title: string
  badge: string
  issue: string
  judgment: string
  award: string
  sourceUrl?: string
}

export type RiskLawTrackingItem = {
  id: string
  sourceType: LawTrackingSourceType
  typeLabel: string
  institution: string
  title: string
  summary: string
  status: string
  expectedEffectiveDate: string
  lastUpdated: string
  riskLevel: LawTrackingRiskLevel
  categories: ScreeningCategory[]
  sourceUrl?: string
  relatedCaseCount: number
  relatedLossCount: number
  timeline: LawTrackingTimelineStep[]
  beforeChanges: LawTrackingChange[]
  afterChanges: LawTrackingChange[]
  changeBadge: string
  relatedCases: LawTrackingCase[]
  relatedLossCases: LawTrackingCase[]
  checklist: string[]
  evidenceIds: string[]
  /** 보험 가입 의무 조항이 확인된 법령·개정안인지 여부 */
  insuranceMandate?: boolean
  /** 입법·개정 진행률 예비값. 1에 가까울수록 시행 단계에 가까움 */
  implementationProgress?: number
  /** 미이행 시 제재 강도 예비값. 공식 제재 조문 확인 전에는 추정으로 표시 */
  sanctionSeverity?: number
  /** 법률 신호가 우선순위에 영향을 주는 후보 ID */
  candidateIds?: string[]
}

export function lawProductizationPriority(item: RiskLawTrackingItem) {
  const completeSteps = item.timeline.filter((step) => step.stage === 'complete').length
  const currentSteps = item.timeline.filter((step) => step.stage === 'current').length
  const progress = item.implementationProgress ?? Math.min(1, (completeSteps + currentSteps * 0.5) / Math.max(item.timeline.length, 1))
  const mandateScore = item.insuranceMandate ? 2 : 0
  const progressScore = Math.min(2, Math.max(0, progress * 2))
  const sanctionScore = Math.min(1, Math.max(0, (item.sanctionSeverity ?? 0) / 5))
  return mandateScore + progressScore + sanctionScore
}

const riskLawTrackingSeed: RiskLawTrackingItem[] = [
  {
    id: 'law-medical-liability-insurance',
    sourceType: 'assembly',
    typeLabel: '국회 / 공포',
    institution: '보건복지부·국회',
    title: '의료사고 피해구제법 책임보험 가입 의무 신설',
    summary: '보건의료기관개설자의 책임보험 또는 책임공제 가입 의무를 신설한 2026년 일부개정법률',
    status: '공포 · 시행 예정',
    expectedEffectiveDate: '2027.05.27',
    lastUpdated: '2026.05.26',
    riskLevel: 'high',
    categories: ['corporate', 'legal', 'department'],
    sourceUrl: 'https://law.go.kr/LSW/lsInfoP.do?lsiSeq=286221&viewCls=lsRvsDocInfoR',
    relatedCaseCount: 0,
    relatedLossCount: 0,
    timeline: [
      { label: '개정안 의결', stage: 'complete', date: '2026.05.26' },
      { label: '법률 공포', stage: 'complete', date: '2026.05.26' },
      { label: '책임보험 조항 신설', stage: 'complete', date: '제47조 신설' },
      { label: '하위법령·배상한도', stage: 'current', date: '세부 기준 확인 중' },
      { label: '공포·시행', stage: 'pending', date: '2027.05.27' },
    ],
    beforeChanges: [
      { label: '보험 가입', value: '기관별 책임보험 가입 의무 확인 필요' },
      { label: '배상한도', value: '대통령령으로 정하는 연간 배상한도액 확인 필요' },
      { label: '제재', value: '미가입 제재는 하위법령·원문 추가 확인 필요' },
    ],
    afterChanges: [
      { label: '보험 가입', value: '일정한 보건의료기관개설자는 책임보험 또는 책임공제에 가입하여야 함', emphasis: 'red' },
      { label: '운영 기준', value: '약관·손해평가·지급 기준을 보건복지부가 관리·감독할 수 있음', emphasis: 'red' },
      { label: '시행일', value: '2027년 5월 27일 시행 예정', emphasis: 'blue' },
    ],
    changeBadge: '보험 가입 의무 신설 · 우선 검토',
    relatedCases: [],
    relatedLossCases: [],
    checklist: [
      '국가법령정보센터 제47조 원문과 시행령 배상한도 확인',
      '대상 의료기관 범위·미가입 제재·보험료 산정 기준 확인',
    ],
    evidenceIds: ['LAW-MEDICAL-LIABILITY-20260526'],
    insuranceMandate: true,
    implementationProgress: 0.8,
    sanctionSeverity: 3.5,
    candidateIds: ['medical-liability-insurance'],
  },
  {
    id: 'law-disaster-mandatory-insurance-standard',
    sourceType: 'administrative',
    typeLabel: '행정안전부 / 고시',
    institution: '행정안전부',
    title: '재난안전의무보험 관리·운용 기준 개정',
    summary: '법률에 따라 가입을 강제하는 재난안전의무보험의 사전협의·관리 기준을 개정한 고시',
    status: '시행 · 운영 기준 개정',
    expectedEffectiveDate: '2026.01.27',
    lastUpdated: '2026.01.27',
    riskLevel: 'high',
    categories: ['corporate', 'legal', 'department'],
    sourceUrl: 'https://www.law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=2100000273718',
    relatedCaseCount: 0,
    relatedLossCount: 0,
    timeline: [
      { label: '기준 개정', stage: 'complete', date: '2026.01.27' },
      { label: '고시 시행', stage: 'complete', date: '2026.01.27' },
      { label: '의무보험 사전협의', stage: 'complete', date: '신설·개정 시 협의' },
      { label: '운영기관 적용', stage: 'current', date: '적용 현황 확인 중' },
      { label: '보험 가입 관리', stage: 'pending', date: '기관별 확인 필요' },
    ],
    beforeChanges: [
      { label: '대상 기준', value: '재난안전의무보험별 개별 관리 기준' },
      { label: '사전협의', value: '신설·개정 법령의 보험제도 협의 범위 확인 필요' },
      { label: '미가입', value: '과태료 등 개별 법령상 제재 확인 필요' },
    ],
    afterChanges: [
      { label: '의무보험 정의', value: '일정한 자에게 가입을 강제하는 보험 또는 공제로 정의', emphasis: 'red' },
      { label: '신설·개정 협의', value: '의무보험 제도 신설·개정 시 행정안전부장관과 사전협의', emphasis: 'red' },
      { label: '운영 기준', value: '미가입 집단에는 영업정지·강제징수 등 제재 방안 검토 가능', emphasis: 'blue' },
    ],
    changeBadge: '의무보험 제도화·제재 연계',
    relatedCases: [],
    relatedLossCases: [],
    checklist: [
      '재난안전의무보험 대상 법령과 별표의 실제 보험종목 확인',
      '미가입 과태료·영업정지·강제징수 적용 여부와 보상한도 확인',
    ],
    evidenceIds: ['LAW-DISASTER-MANDATORY-20260127'],
    insuranceMandate: true,
    implementationProgress: 0.9,
    sanctionSeverity: 4.5,
    candidateIds: ['urban-flooding'],
  },
  {
    id: 'law-ev-fire',
    sourceType: 'assembly',
    typeLabel: '국회 / 발의',
    institution: '국회·국토교통 관련',
    title: '전기차 화재 예방 및 피해보상 특별법',
    summary: '지하주차장 소방시설 의무화 및 피해보상 기준 변화',
    status: '소위원회 심사',
    expectedEffectiveDate: '2026.10 목표',
    lastUpdated: '2026.07.15',
    riskLevel: 'high',
    categories: ['corporate', 'individual', 'legal'],
    relatedCaseCount: 1,
    relatedLossCount: 2,
    timeline: [
      { label: '발의/제출', stage: 'complete', date: '26.05.10' },
      { label: '위원회 심사', stage: 'current', date: '현재 단계' },
      { label: '본회의 의결', stage: 'pending', date: '-' },
      { label: '정부 이송', stage: 'pending', date: '-' },
      { label: '공포/시행', stage: 'pending', date: '26.10 목표' },
    ],
    beforeChanges: [
      { label: '적용 대상', value: '대형 공동주택·공공건물 중심의 기존 기준' },
      { label: '설비 기준', value: '일반 감지기와 스프링클러 중심' },
      { label: '벌칙', value: '단순 권고 또는 제재 확인 필요' },
    ],
    afterChanges: [
      { label: '적용 대상', value: '충전시설 보유 사업장 범위 확대 여부 확인 필요', emphasis: 'red' },
      { label: '설비 기준', value: '열화상 감지·관제 연동·방화설비 의무화 여부 확인 필요', emphasis: 'red' },
      { label: '벌칙', value: '미이행 제재와 과태료 수준 원문 확인 필요', emphasis: 'red' },
      { label: '경과 조치', value: '공포 후 유예기간 적용 여부 확인 필요', emphasis: 'blue' },
    ],
    changeBadge: '의무화·제재 신설 여부 확인',
    relatedCases: [
      {
        type: '대법원 판결',
        caseNumber: 'PL-EV-001',
        title: '지하주차장 배터리 열폭주로 인한 건물 화재 손해배상 책임 건',
        badge: '책임 비율 원문 확인 필요',
        issue: '초기 소방 모니터링과 감지 지연에 대한 관리주체·제조사 책임 여부',
        judgment: '판결문 원문 확인 전에는 책임 비율과 법적 결론을 확정하지 않는다.',
        award: '손해액 원문 확인 필요',
      },
    ],
    relatedLossCases: [
      {
        type: '사고 사례',
        caseNumber: 'LOSS-EV-001',
        title: '지하주차장 배터리 열폭주에 따른 시설·영업 손해 사례',
        badge: '손해 범위 원문 확인 필요',
        issue: '화재·연기·시설 폐쇄가 건물 운영과 입주자에게 미치는 손해 범위',
        judgment: '사고 보고서와 손해사정 자료를 확인하기 전에는 손해 유형을 확정하지 않는다.',
        award: '손해액 확인 필요',
      },
    ],
    checklist: [
      '법안 원문과 최신 심사 단계, 시행일을 공식 사이트에서 확인',
      'PL·건물관리 배상책임과 충전시설 운영자 책임의 연결 범위를 재검토',
    ],
    evidenceIds: ['LAW-EV-20260715-001'],
  },
  {
    id: 'law-ai-copyright',
    sourceType: 'administrative',
    typeLabel: '과기부 / 가이드라인',
    institution: '과학기술정보통신 관련',
    title: '생성형 AI 저작권 및 출처 표기 지침',
    summary: '학습 데이터 출처와 생성 결과물 책임 기준 변화',
    status: '가이드라인 검토',
    expectedEffectiveDate: '시행일 확인 필요',
    lastUpdated: '최근 12시간',
    riskLevel: 'medium',
    categories: ['corporate', 'legal', 'department'],
    relatedCaseCount: 2,
    relatedLossCount: 1,
    timeline: [
      { label: '초안 공개', stage: 'complete', date: '자료 확인 필요' },
      { label: '관계기관 검토', stage: 'current', date: '현재 단계' },
      { label: '의견 수렴', stage: 'pending', date: '-' },
      { label: '최종 발표', stage: 'pending', date: '-' },
      { label: '적용', stage: 'pending', date: '시행일 확인 필요' },
    ],
    beforeChanges: [
      { label: '출처 표기', value: '기업별 자율 관리 수준과 계약 기준 확인 필요' },
      { label: '책임 기준', value: '생성·학습·검수 단계별 책임 구분 미확인' },
      { label: '제재', value: '공식 제재 여부 확인 필요' },
    ],
    afterChanges: [
      { label: '출처 관리', value: '학습 데이터와 생성물 출처 관리 기준 강화 여부 확인 필요', emphasis: 'red' },
      { label: '검수 의무', value: '기업의 생성 결과물 검수 책임 범위 확인 필요', emphasis: 'red' },
      { label: '경과 조치', value: '기존 시스템에 대한 적용 유예 여부 확인 필요', emphasis: 'blue' },
    ],
    changeBadge: '책임 범위 변화 확인',
    relatedCases: [
      {
        type: '저작권 분쟁 사례',
        caseNumber: 'AI-COPYRIGHT-002',
        title: 'AI 생성 결과물의 학습 데이터 출처 분쟁',
        badge: '손해 범위 확인 필요',
        issue: '학습 데이터 이용과 생성 결과물의 권리 귀속·검수 책임',
        judgment: '사례의 존재만으로 기업의 배상책임이나 보장 가능성을 확정하지 않는다.',
        award: '손해액 확인 필요',
      },
    ],
    relatedLossCases: [
      {
        type: '시장 분쟁 사례',
        caseNumber: 'LOSS-AI-002',
        title: '생성형 AI 결과물 사용에 따른 기업 방어비용 분쟁',
        badge: '방어비용 범위 확인 필요',
        issue: '저작권 주장 통지와 결과물 사용 중단으로 발생한 직접·간접 비용',
        judgment: '시장 분쟁 사례는 보험 보장 또는 배상책임의 결론이 아니다.',
        award: '손해액 확인 필요',
      },
    ],
    checklist: [
      '공식 가이드라인 원문과 적용 대상 기업 범위를 확인',
      '방어비용·저작권 침해 손해·계약상 책임을 분리해 사례를 추가 수집',
    ],
    evidenceIds: ['LAW-AI-COPYRIGHT-001'],
  },
  {
    id: 'law-virtual-asset-cyber-protection',
    sourceType: 'assembly',
    typeLabel: '금융위원회 / 법률 시행',
    institution: '금융위원회·금융정보분석원',
    title: '가상자산사업자 해킹·전산장애 보험·공제 조치',
    summary: '가상자산 이용자 보호법 제8조에 따라 가상자산사업자가 해킹·전산장애 사고에 대비해 보험·공제 가입 또는 준비금 적립 등 필요한 조치를 마련해야 하는 제도',
    status: '시행 · 보장 조치 적용',
    expectedEffectiveDate: '2024.07.19',
    lastUpdated: '2026.03.25',
    riskLevel: 'high',
    categories: ['corporate', 'legal', 'department'],
    sourceUrl: 'https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1024558691',
    relatedCaseCount: 0,
    relatedLossCount: 0,
    timeline: [
      { label: '법률 제정', stage: 'complete', date: '2023.07.18' },
      { label: '법률 시행', stage: 'complete', date: '2024.07.19' },
      { label: '보장 조치 의무', stage: 'complete', date: '제8조 시행' },
      { label: '사업자별 기준 적용', stage: 'current', date: '보험·공제·준비금 기준 확인 중' },
      { label: '감독·검사 연계', stage: 'pending', date: '최신 실태조사 반영' },
    ],
    beforeChanges: [
      { label: '사고 대응', value: '사업자별 해킹·전산장애 대응체계와 보상재원 확인 필요' },
      { label: '보장 방식', value: '보험·공제·준비금 중 적용 방식과 규모 확인 필요' },
      { label: '시장 규모', value: '금융위 실태조사 기준 사업자 제출자료와 최신 수치 연계 필요' },
    ],
    afterChanges: [
      { label: '보장 조치', value: '해킹·전산장애 책임 이행을 위해 보험·공제 가입 또는 준비금 적립 등 필요한 조치가 요구됨', emphasis: 'red' },
      { label: '보호 대상', value: '이용자 예치금 보호와 가상자산사업자 사고 대응 체계를 함께 검토', emphasis: 'red' },
      { label: '실제 규모', value: '2025년 하반기 거래가능 이용자 계정 1,113만개·원화예치금 8.1조원', emphasis: 'blue' },
    ],
    changeBadge: '신산업 사이버·수탁 리스크 보장 검토',
    relatedCases: [],
    relatedLossCases: [],
    checklist: [
      '국가법령정보센터 가상자산 이용자 보호 등에 관한 법률 제8조 원문 확인',
      '금융위원회·금융정보분석원 2025년 하반기 실태조사의 이용자 계정·원화예치금 수치 확인',
      '해킹·전산장애 사고 정의, 보상한도, 면책·준비금 기준과 보험·공제 대체 가능성 검토',
    ],
    evidenceIds: ['LAW-VIRTUAL-ASSET-20240719', 'FSC-VASP-SURVEY-20260325'],
    implementationProgress: 1,
    sanctionSeverity: 4,
    candidateIds: [],
  },
]

export const riskLawTrackingItems: RiskLawTrackingItem[] = riskLawTrackingSeed.map((item) => ({
  ...item,
  ...verifiedRiskLawTrackingOverrides[item.id],
}))
