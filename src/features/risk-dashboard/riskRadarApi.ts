import type {
  RadarDashboardData,
  RadarEvaluation,
  RadarIssueRecord,
  RadarNewsAnalysis,
  RadarNewsArticle,
  RadarNewsDetail,
  RadarRelatedLaw,
  RadarRiskCandidate,
  RadarSignal,
} from '../../domain/risk/riskRadarTypes'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4173').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
  return body as T
}

/**
 * hyoje 브랜치의 신호 파이프라인 API 경계를 현재 대시보드에 연결합니다.
 * 백엔드가 없거나 실패하면 화면은 샘플 상태를 그대로 유지합니다.
 */
export const riskRadarApi = {
  dashboard: () => request<RadarDashboardData>('/api/dashboard'),
  news: (limit = 100) => request<{ articles: RadarNewsArticle[]; total: number }>(`/api/news?limit=${limit}`),
  detail: (id: string) => request<RadarNewsDetail>(`/api/news/${encodeURIComponent(id)}`),
  analyze: (id: string) => request<{ mode?: string; article: RadarNewsArticle; analysis?: RadarNewsAnalysis; error?: string }>(`/api/news/${encodeURIComponent(id)}/analyze`, { method: 'POST', body: '{}' }),
  verify: (id: string, lawApplicability = '') => request<{ mode?: string; article: RadarNewsArticle; analysis?: RadarNewsAnalysis; verificationGate?: RadarNewsAnalysis['verificationGate']; error?: string }>(`/api/news/${encodeURIComponent(id)}/verify`, { method: 'POST', body: JSON.stringify({ lawApplicability }) }),
  collect: () => request<unknown>('/api/news/collect', { method: 'POST' }),
  enrich: (limit = 50, retry = true) => request<unknown>(`/api/news/enrich?limit=${limit}&retry=${retry ? '1' : '0'}`, { method: 'POST' }),
  enrichArticle: (id: string) => request<{ article: RadarNewsArticle }>(`/api/news/${encodeURIComponent(id)}/enrich`, { method: 'POST' }),
  analyzePending: () => request<unknown>('/api/news/analyze-pending?limit=3', { method: 'POST' }),
  risks: () => request<{ risks: RadarRiskCandidate[] }>('/api/risks'),
  lawSearch: (query: string) => request<{ laws: RadarRelatedLaw[]; mode: string }>(`/api/law-search?q=${encodeURIComponent(query)}`),
  createRisk: (articleId: string) => request<{ risk: RadarRiskCandidate; existing?: boolean }>('/api/risks/from-news', { method: 'POST', body: JSON.stringify({ articleId }) }),
  issues: () => request<{ issues: RadarIssueRecord[]; total: number }>('/api/issues'),
  productSearch: (analysis: RadarNewsAnalysis | string) => {
    const params = typeof analysis === 'string'
      ? { q: analysis, riskEnvironment: analysis, target: '' }
      : { q: analysis.riskInterpretation.searchKeywords.join(' '), riskEnvironment: analysis.riskInterpretation.riskEnvironment, target: analysis.articleFacts.affectedTargets.join(',') }
    return request<{ mode: string; products: unknown[]; message?: string }>(`/api/products/search?${new URLSearchParams(params)}`)
  },
  evaluations: (riskId?: string) => request<{ evaluations: RadarEvaluation[] }>(`/api/evaluations${riskId ? `?riskId=${encodeURIComponent(riskId)}` : ''}`),
  saveEvaluation: (data: Omit<RadarEvaluation, 'id' | 'createdAt' | 'reviewedAt' | 'status'>) => request<{ evaluation: RadarEvaluation }>('/api/evaluations', { method: 'POST', body: JSON.stringify(data) }),
  signals: () => request<{ signals: RadarSignal[] }>('/api/signals'),
  saveSignal: (data: Omit<RadarSignal, 'id' | 'status' | 'createdAt'>) => request<{ signal: RadarSignal }>('/api/signals', { method: 'POST', body: JSON.stringify(data) }),
}
