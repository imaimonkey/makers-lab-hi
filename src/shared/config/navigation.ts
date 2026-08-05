import type { IconName } from '../components/AppIcon'

export type NavigationItem = {
  id: string
  step: string
  label: string
  caption: string
  path: string
  icon: IconName
  activeMatch?: 'exact' | 'risk-detail'
}

type NavigationGroup = {
  label: string
  items: NavigationItem[]
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: '실무자 워크벤치',
    items: [
      {
        id: 'dashboard',
        step: '01',
        label: '위험 레이더',
        caption: '채널·지표 대시보드',
        path: '/',
        icon: 'radar',
        activeMatch: 'exact',
      },
      {
        id: 'catalog',
        step: '02',
        label: '위험 탐색',
        caption: '탐지 요소 리스팅',
        path: '/risks',
        icon: 'list',
        activeMatch: 'exact',
      },
      {
        id: 'detail',
        step: '03',
        label: '위험 상세',
        caption: '위험 후보 상세 평가',
        path: '/risks/generative-ai-copyright',
        icon: 'scan',
        activeMatch: 'risk-detail',
      },
      {
        id: 'reports',
        step: '04',
        label: '종합 리포트',
        caption: '의사결정·보고서',
        path: '/reports',
        icon: 'report',
        activeMatch: 'exact',
      },
    ],
  },
]

export function isNavigationItemActive(item: NavigationItem, pathname: string): boolean {
  if (item.activeMatch === 'risk-detail') {
    return pathname.startsWith('/risks/')
  }

  return pathname === item.path
}
