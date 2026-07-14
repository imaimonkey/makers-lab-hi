export type Room = {
  id: number
  shortLabel: string
  title: string
  subtitle: string
  owner: string
  path: string
  color: string
  number: string
  skills: string[]
}

export const rooms: Room[] = [
  {
    id: 1,
    shortLabel: 'Room 01',
    title: 'State Lab',
    subtitle: '작은 상호작용부터 시작하는 상태 관리 연습',
    owner: 'Member 01',
    path: '/rooms/one',
    color: '#ff6b35',
    number: '01',
    skills: ['useState', 'Event', 'Component'],
  },
  {
    id: 2,
    shortLabel: 'Room 02',
    title: 'Filter Studio',
    subtitle: '목록과 조건을 다루는 데이터 표현 연습',
    owner: 'Member 02',
    path: '/rooms/two',
    color: '#2864dc',
    number: '02',
    skills: ['Array', 'Filter', 'UI State'],
  },
  {
    id: 3,
    shortLabel: 'Room 03',
    title: 'Task Workshop',
    subtitle: '추가·완료·삭제가 있는 사용자 흐름 연습',
    owner: 'Member 03',
    path: '/rooms/three',
    color: '#7b4dff',
    number: '03',
    skills: ['Form', 'List', 'CRUD'],
  },
  {
    id: 4,
    shortLabel: 'Room 04',
    title: 'Form Archive',
    subtitle: '입력값과 미리보기를 연결하는 폼 연습',
    owner: 'Member 04',
    path: '/rooms/four',
    color: '#0b8f70',
    number: '04',
    skills: ['Input', 'Validation', 'Preview'],
  },
]
