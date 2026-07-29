export async function saveUtil0RiskDiscovery(result: Record<string, unknown>, generatedAt: string, mode: 'mock' | 'gemini' | 'potens') {
  const response = await fetch('/api/llm/util-0/risk-discovery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, generatedAt, mode }),
  })
  const payload = await response.json() as { error?: unknown; file?: string; savedAt?: string; sheets?: string[] }
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'util-0 엑셀 저장에 실패했습니다.')
  return payload
}
