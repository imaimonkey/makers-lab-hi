import type { GeneratedReportListItem } from '../services/report-list'

type ReportListLayoutMock = Pick<
  GeneratedReportListItem,
  | 'reportId'
  | 'riskId'
  | 'riskName'
  | 'targetType'
  | 'productizationDecision'
  | 'workflowStatus'
  | 'priority'
  | 'reviewFlags'
  | 'riskSummary'
  | 'generatedAt'
  | 'assessmentSummary'
  | 'shortConclusion'
>

/**
 * 목록 화면의 검색·필터·정렬 상태를 확인하기 위한 SAMPLE 데이터입니다.
 * 실제 위험 후보나 상품화 판단으로 사용하지 않습니다.
 */
export const REPORT_LIST_LAYOUT_MOCKS = [
  {
    reportId: 'SAMPLE-RPT-URBAN-001',
    riskId: 'SAMPLE-RSK-URBAN-001',
    riskName: 'SAMPLE · 도심형 개인 이동수단 사고',
    targetType: '가계',
    productizationDecision: '추가 확인 필요',
    workflowStatus: '검토 필요',
    priority: '일반',
    reviewFlags: ['사고 빈도 자료 보완', '책임주체 확인'],
    riskSummary: '도심 이동 과정에서 개인 이동수단 사고와 제3자 손해가 반복될 가능성을 검토합니다.',
    generatedAt: '2026-07-27T09:30:00+09:00',
    assessmentSummary: 'SAMPLE · 사고 빈도와 기존 보장과의 관계를 추가 확인해야 합니다.',
    shortConclusion: 'SAMPLE · 사고 빈도와 책임 범위 확인 후 상품화 검토를 이어갈 수 있습니다.',
  },
  {
    reportId: 'SAMPLE-RPT-DIGITAL-002',
    riskId: 'SAMPLE-RSK-DIGITAL-002',
    riskName: 'SAMPLE · 중소기업 생성형 AI 업무 오류',
    targetType: '기업',
    productizationDecision: '상품성 있음',
    workflowStatus: '검토 중',
    priority: '우선 검토',
    reviewFlags: ['면책 범위 검토'],
    riskSummary: '기업의 생성형 AI 활용 과정에서 오류 결과와 업무 중단 손해가 발생할 가능성을 검토합니다.',
    generatedAt: '2026-07-25T14:10:00+09:00',
    assessmentSummary: 'SAMPLE · 기업 계약 주체와 손해 입증 기준을 중심으로 검토 중입니다.',
    shortConclusion: 'SAMPLE · 업무 오류와 복구 비용을 구분하는 보장 구조를 검토할 수 있습니다.',
  },
  {
    reportId: 'SAMPLE-RPT-HEAT-003',
    riskId: 'SAMPLE-RSK-HEAT-003',
    riskName: 'SAMPLE · 공동주택 폭염 생활위험',
    targetType: '혼합',
    productizationDecision: '검토 가능',
    workflowStatus: '검토 완료',
    priority: '일반',
    reviewFlags: [],
    riskSummary: '폭염 장기화로 공동주택 거주자와 관리 주체의 생활·시설 손해가 커질 가능성을 검토합니다.',
    generatedAt: '2026-07-21T11:45:00+09:00',
    assessmentSummary: 'SAMPLE · 보장 대상과 손해 기준을 정의할 수 있으나 지역별 데이터가 필요합니다.',
    shortConclusion: 'SAMPLE · 시설 손해와 생활 지원을 분리한 구조의 검토가 가능합니다.',
  },
  {
    reportId: 'SAMPLE-RPT-WORK-004',
    riskId: 'SAMPLE-RSK-WORK-004',
    riskName: 'SAMPLE · 플랫폼 노동자 작업 중단',
    targetType: '가계',
    productizationDecision: '추가 자료 필요',
    workflowStatus: '초안 생성',
    priority: '우선 검토',
    reviewFlags: ['소득 손실 자료 필요', '기존 보험 중복 확인'],
    riskSummary: '플랫폼 작업 중단이 노동자의 소득과 계약 이행에 미치는 영향을 검토합니다.',
    generatedAt: '2026-07-18T16:20:00+09:00',
    assessmentSummary: 'SAMPLE · 작업 중단과 소득 손실 사이의 인과관계를 확인할 자료가 부족합니다.',
    shortConclusion: 'SAMPLE · 소득 손실 기준과 기존 보장 중복 여부 확인이 선행되어야 합니다.',
  },
] satisfies ReportListLayoutMock[]
