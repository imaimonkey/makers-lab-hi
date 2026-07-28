import { llmUtilityDefinitions } from './registry'
import { readSharedSystemPrompt } from './sharedSystemPromptRepository'
import type { LlmRunRequest, LlmRunResult } from './types'

type LlmApiResponse = {
  text?: unknown
  provider?: unknown
  model?: unknown
  generatedAt?: unknown
  error?: unknown
}

const useMock = import.meta.env.VITE_LLM_USE_MOCK !== 'false'
const apiBaseUrl = import.meta.env.VITE_LLM_API_BASE_URL || '/api/llm'

function assertSupportedUtility(utilityId: LlmRunRequest['utilityId']) {
  const definition = llmUtilityDefinitions.find((utility) => utility.id === utilityId)
  if (!definition) throw new Error(`지원하지 않는 LLM 유틸리티입니다: ${utilityId}`)
  return definition
}

function createMockResult(systemPrompt: string, prompt: string): LlmRunResult {
  return {
    mode: 'mock',
    generatedAt: new Date().toISOString(),
    text: [
      '[MOCK RESPONSE]',
      '[SYSTEM PROMPT APPLIED]',
      systemPrompt,
      '',
      '[TEST INPUT]',
      prompt,
    ].join('\n'),
  }
}

export async function runLlmUtility({ utilityId, systemPrompt, prompt }: LlmRunRequest): Promise<LlmRunResult> {
  const normalizedPrompt = prompt.trim()
  if (!normalizedPrompt) throw new Error('테스트 입력을 입력해 주세요.')

  const definition = assertSupportedUtility(utilityId)
  let normalizedSystemPrompt = systemPrompt?.trim()
  if (!normalizedSystemPrompt) {
    try {
      normalizedSystemPrompt = (await readSharedSystemPrompt(utilityId)).text.trim()
    } catch {
      normalizedSystemPrompt = definition.defaultSystemPrompt.trim()
    }
  }
  if (!normalizedSystemPrompt) throw new Error('시스템 프롬프트를 입력해 주세요.')

  if (useMock) return createMockResult(normalizedSystemPrompt, normalizedPrompt)

  const response = await fetch(`${apiBaseUrl}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      utilityId,
      systemPrompt: normalizedSystemPrompt,
      prompt: normalizedPrompt,
    }),
  })
  const payload = await response.json() as LlmApiResponse

  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : 'LLM API 호출에 실패했습니다.'
    throw new Error(message)
  }

  if (typeof payload.text !== 'string' || !payload.text.trim()) {
    throw new Error('LLM API가 비어 있는 결과를 반환했습니다.')
  }

  return {
    text: payload.text,
    mode: payload.provider === 'gemini' ? 'gemini' : 'mock',
    generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : new Date().toISOString(),
    model: typeof payload.model === 'string' ? payload.model : undefined,
  }
}
