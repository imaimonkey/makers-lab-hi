export type PrecedentSearchResponse = Record<string, unknown> & { raw?: string; source?: string }

async function request(path: string, body: Record<string, string>): Promise<PrecedentSearchResponse> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json() as PrecedentSearchResponse & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? '국가법령정보 판례 API 요청에 실패했습니다.')
  return payload
}

export function searchOfficialPrecedents(query: string): Promise<PrecedentSearchResponse> {
  return request('/api/precedent/search', { query })
}

export function getOfficialPrecedentDetail(id: string): Promise<PrecedentSearchResponse> {
  return request('/api/precedent/detail', { id })
}
