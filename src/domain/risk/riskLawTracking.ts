import type { ScreeningCategory } from './riskScreeningInsights'

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
}

export const riskLawTrackingItems: RiskLawTrackingItem[] = [
  {
    id: 'law-ev-fire',
    sourceType: 'assembly',
    typeLabel: '국회 / 발의',
    institution: '국회·국토교통 관련',
    title: '전기차 화재 예방 및 피해보상 특별법',
    summary: '지하주차장 소방시설 의무화 및 피해보상 기준 변화 SAMPLE',
    status: '소위원회 심사',
    expectedEffectiveDate: '2026.10 목표 · SAMPLE',
    lastUpdated: '2026.07.15 · SAMPLE',
    riskLevel: 'high',
    categories: ['corporate', 'individual', 'legal'],
    relatedCaseCount: 1,
    relatedLossCount: 2,
    timeline: [
      { label: '발의/제출', stage: 'complete', date: '26.05.10 · SAMPLE' },
      { label: '위원회 심사', stage: 'current', date: '현재 단계 · SAMPLE' },
      { label: '본회의 의결', stage: 'pending', date: '-' },
      { label: '정부 이송', stage: 'pending', date: '-' },
      { label: '공포/시행', stage: 'pending', date: '26.10 목표 · SAMPLE' },
    ],
    beforeChanges: [
      { label: '적용 대상', value: '대형 공동주택·공공건물 중심의 기존 기준 SAMPLE' },
      { label: '설비 기준', value: '일반 감지기와 스프링클러 중심 SAMPLE' },
      { label: '벌칙', value: '단순 권고 또는 제재 확인 필요 SAMPLE' },
    ],
    afterChanges: [
      { label: '적용 대상', value: '충전시설 보유 사업장 범위 확대 여부 확인 필요 SAMPLE', emphasis: 'red' },
      { label: '설비 기준', value: '열화상 감지·관제 연동·방화설비 의무화 여부 확인 필요 SAMPLE', emphasis: 'red' },
      { label: '벌칙', value: '미이행 제재와 과태료 수준 원문 확인 필요 SAMPLE', emphasis: 'red' },
      { label: '경과 조치', value: '공포 후 유예기간 적용 여부 확인 필요 SAMPLE', emphasis: 'blue' },
    ],
    changeBadge: '의무화·제재 신설 여부 확인',
    relatedCases: [
      {
        type: '대법원 판결 SAMPLE',
        caseNumber: 'SAMPLE-PL-001',
        title: '지하주차장 배터리 열폭주로 인한 건물 화재 손해배상 책임 건',
        badge: '책임 비율 원문 확인 필요',
        issue: '초기 소방 모니터링과 감지 지연에 대한 관리주체·제조사 책임 여부',
        judgment: '판결문 원문 확인 전에는 책임 비율과 법적 결론을 확정하지 않는다.',
        award: '손해액 원문 확인 필요',
      },
    ],
    relatedLossCases: [
      {
        type: '사고 사례 SAMPLE',
        caseNumber: 'SAMPLE-LOSS-001',
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
    evidenceIds: ['LAW-SAMPLE-EV-001'],
  },
  {
    id: 'law-ai-copyright',
    sourceType: 'administrative',
    typeLabel: '과기부 / 가이드라인',
    institution: '과학기술정보통신 관련',
    title: '생성형 AI 저작권 및 출처 표기 지침',
    summary: '학습 데이터 출처와 생성 결과물 책임 기준 변화 SAMPLE',
    status: '가이드라인 검토',
    expectedEffectiveDate: '시행일 확인 필요',
    lastUpdated: '최근 12시간 · SAMPLE',
    riskLevel: 'medium',
    categories: ['corporate', 'legal', 'department'],
    relatedCaseCount: 2,
    relatedLossCount: 1,
    timeline: [
      { label: '초안 공개', stage: 'complete', date: '자료 확인 필요' },
      { label: '관계기관 검토', stage: 'current', date: '현재 단계 · SAMPLE' },
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
        type: '저작권 분쟁 사례 SAMPLE',
        caseNumber: 'SAMPLE-AI-002',
        title: 'AI 생성 결과물의 학습 데이터 출처 분쟁',
        badge: '손해 범위 확인 필요',
        issue: '학습 데이터 이용과 생성 결과물의 권리 귀속·검수 책임',
        judgment: '사례의 존재만으로 기업의 배상책임이나 보장 가능성을 확정하지 않는다.',
        award: '손해액 확인 필요',
      },
    ],
    relatedLossCases: [
      {
        type: '시장 분쟁 사례 SAMPLE',
        caseNumber: 'SAMPLE-LOSS-002',
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
    evidenceIds: ['LAW-SAMPLE-AI-001'],
  },
]
