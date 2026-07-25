export const defaultNaverNewsSearchKeywords = [
  '생성형 AI 업무 오류',
  'AI 배상책임',
  '가정용 ESS 화재',
  '전기차 배터리 화재',
  '충전시설 화재',
  '생활로봇 오작동',
  '드론 배송 사고',
  '플랫폼 노동 소득 공백',
  '소상공인 영업중단',
] as const

export type NaverNewsSearchConfig = {
  keywords: string[]
  updatedAt: string | null
  source: 'shared' | 'default'
}

export type NaverNewsItem = {
  title: string
  originallink: string
  link: string
  description: string
  pubDate: string
  query?: string
}

export type NaverNewsSearchResponse = {
  total: number
  start: number
  display: number
  items: NaverNewsItem[]
}

export type NaverNewsCollectionResponse = {
  keywordCount: number
  articleCount: number
  items: NaverNewsItem[]
  failures: Array<{ query: string; message: string }>
}
