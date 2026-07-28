import type {
  NewsManualTestResult,
  NewsManualTestRun,
  NewsManualTestStore,
} from './types'

type NewsManualTestApiResponse = {
  store?: unknown
  run?: unknown
  error?: unknown
}

export async function saveUtil1ManualTestRun({
  systemPrompt,
  prompt,
  result,
}: {
  systemPrompt: string
  prompt: string
  result: NewsManualTestResult
}) {
  const response = await fetch('/api/news/manual-test-runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ utilityId: 'util-1', systemPrompt, prompt, result }),
  })
  const payload = await response.json() as NewsManualTestApiResponse

  if (!response.ok || !isNewsManualTestStore(payload.store)) {
    throw new Error(typeof payload.error === 'string' ? payload.error : '기능 1번 수동 입력 저장에 실패했습니다.')
  }

  return {
    store: payload.store,
    run: isRecord(payload.run) ? payload.run as unknown as NewsManualTestRun : null,
  }
}

function isNewsManualTestStore(value: unknown): value is NewsManualTestStore {
  return isRecord(value) && value.version === 1 && Array.isArray(value.runs)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
