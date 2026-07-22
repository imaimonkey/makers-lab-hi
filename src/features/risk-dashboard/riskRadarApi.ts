type RadarRequest = () => Promise<unknown>
type RadarArticleRequest = (id: string) => Promise<unknown>

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4173').replace(/\/$/, '')

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  const text = await response.text()
  const body: unknown = (() => {
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return {}
    }
  })()
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `API ${response.status}`
    throw new Error(message)
  }
  return body
}

/**
 * hyoje 브랜치의 신호 파이프라인 API 경계를 현재 대시보드에 연결합니다.
 * 백엔드가 없거나 실패하면 화면은 샘플 상태를 그대로 유지합니다.
 */
export const riskRadarApi: {
  collect: RadarRequest
  enrich: RadarRequest
  analyzePending: RadarRequest
  analyze: RadarArticleRequest
  verify: RadarArticleRequest
  enrichArticle: RadarArticleRequest
  createRisk: RadarArticleRequest
} = {
  collect: () => request('/api/news/collect', { method: 'POST' }),
  enrich: () => request('/api/news/enrich?limit=50&retry=1', { method: 'POST' }),
  analyzePending: () => request('/api/news/analyze-pending?limit=3', { method: 'POST' }),
  analyze: (id) => request(`/api/news/${encodeURIComponent(id)}/analyze`, { method: 'POST', body: '{}' }),
  verify: (id) => request(`/api/news/${encodeURIComponent(id)}/verify`, { method: 'POST', body: JSON.stringify({ lawApplicability: '' }) }),
  enrichArticle: (id) => request(`/api/news/${encodeURIComponent(id)}/enrich`, { method: 'POST' }),
  createRisk: (id) => request('/api/risks/from-news', { method: 'POST', body: JSON.stringify({ articleId: id }) }),
}
