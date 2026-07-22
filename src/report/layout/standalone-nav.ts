export type ReportNavId =
  | 'dashboard'
  | 'risk-search'
  | 'risk-detail'
  | 'report'

export type ReportNavItem = {
  id: ReportNavId
  label: string
  href?: string
  active?: boolean
  disabled?: boolean
  statusLabel?: string
}

/**
 * 단독 시연용 기본값입니다. 팀 통합 시 실제 공통 레이아웃의 navConfig로
 * 교체하며 ReportPage 자체는 이 설정을 사용하지 않습니다.
 */
export const standaloneReportNav: ReportNavItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    disabled: true,
    statusLabel: '연결 대기',
  },
  {
    id: 'risk-search',
    label: '위험 탐색',
    disabled: true,
    statusLabel: '연결 대기',
  },
  {
    id: 'risk-detail',
    label: '위험 상세',
    disabled: true,
    statusLabel: '연결 대기',
  },
  {
    id: 'report',
    label: '리포트',
    active: true,
    disabled: false,
  },
]
