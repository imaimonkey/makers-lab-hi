export type LawSearchResponse = Record<string, unknown> & { raw?: string; source?: string }

export async function searchOfficialLaw(query: string): Promise<LawSearchResponse> {
  const response = await fetch('/api/law/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const payload = await response.json() as LawSearchResponse & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? '국가법령정보 검색에 실패했습니다.')
  return payload
}

export async function getOfficialLawDetail(id: string, lawId?: string): Promise<LawSearchResponse> {
  const response = await fetch('/api/law/detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, lawId }),
  })
  const payload = await response.json() as LawSearchResponse & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? '국가법령정보 상세 조회에 실패했습니다.')
  return payload
}

export async function getOfficialLawArticle(id: string, lawId?: string, jo = '000100'): Promise<LawSearchResponse> {
  const response = await fetch('/api/law/article', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, lawId, jo }),
  })
  const payload = await response.json() as LawSearchResponse & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? '국가법령정보 조문 조회에 실패했습니다.')
  return payload
}
