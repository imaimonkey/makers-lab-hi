import type { LlmUtilityId } from './types'

export type SharedSystemPrompt = {
  text: string
  updatedAt: string | null
  source: 'shared' | 'markdown'
}

export type SharedSystemPromptMap = Record<LlmUtilityId, SharedSystemPrompt>

type SharedPromptApiResponse = {
  prompts?: Partial<Record<LlmUtilityId, Partial<SharedSystemPrompt>>>
  error?: unknown
}

let cachedPrompts: SharedSystemPromptMap | null = null
let pendingRead: Promise<SharedSystemPromptMap> | null = null

function normalizePromptMap(payload: SharedPromptApiResponse): SharedSystemPromptMap {
  const prompts = payload.prompts ?? {}
  const utilityIds: LlmUtilityId[] = ['util-0', 'util-1', 'util-2', 'util-3', 'util-4']

  return Object.fromEntries(
    utilityIds.map((utilityId) => {
      const prompt = prompts[utilityId]
      return [utilityId, {
        text: typeof prompt?.text === 'string' ? prompt.text : '',
        updatedAt: typeof prompt?.updatedAt === 'string' ? prompt.updatedAt : null,
        source: prompt?.source === 'shared' ? 'shared' : 'markdown',
      }]
    }),
  ) as SharedSystemPromptMap
}

export async function readSharedSystemPrompts(force = false): Promise<SharedSystemPromptMap> {
  if (!force && cachedPrompts) return cachedPrompts
  if (!force && pendingRead) return pendingRead

  pendingRead = fetch('/api/llm/system-prompts')
    .then(async (response) => {
      const payload = await response.json() as SharedPromptApiResponse
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : '공유 시스템 프롬프트를 불러오지 못했습니다.')
      }
      const prompts = normalizePromptMap(payload)
      cachedPrompts = prompts
      return prompts
    })
    .finally(() => {
      pendingRead = null
    })

  return pendingRead
}

export async function readSharedSystemPrompt(utilityId: LlmUtilityId) {
  const prompts = await readSharedSystemPrompts(true)
  return prompts[utilityId]
}

export async function saveSharedSystemPrompt(
  utilityId: LlmUtilityId,
  text: string,
): Promise<SharedSystemPrompt> {
  const response = await fetch('/api/llm/system-prompts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ utilityId, text }),
  })
  const payload = await response.json() as SharedPromptApiResponse

  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : '공유 시스템 프롬프트 저장에 실패했습니다.')
  }

  const saved = normalizePromptMap(payload)[utilityId]
  cachedPrompts = cachedPrompts ? { ...cachedPrompts, [utilityId]: saved } : null
  return saved
}
