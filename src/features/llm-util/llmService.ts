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

// 개발자 모드는 명시적으로 켠 경우에만 샘플 응답을 사용합니다.
// 환경 변수가 빠져도 실제 서버 프록시를 호출해야 테스트 화면에서 AI가 동작합니다.
const useMock = import.meta.env.VITE_LLM_USE_MOCK === 'true'
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
  let payload: LlmApiResponse
  try {
    payload = await response.json() as LlmApiResponse
  } catch {
    throw new Error('LLM 서버가 올바른 JSON 응답을 반환하지 않았습니다. 개발 서버를 재시작해 주세요.')
  }

  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : 'LLM API 호출에 실패했습니다.'
    throw new Error(message)
  }

  if (typeof payload.text !== 'string' || !payload.text.trim()) {
    throw new Error('LLM API가 비어 있는 결과를 반환했습니다.')
  }

  return {
    text: payload.text,
    mode: payload.provider === 'gemini' || payload.provider === 'potens' ? payload.provider : 'mock',
    generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : new Date().toISOString(),
    model: typeof payload.model === 'string' ? payload.model : undefined,
  }
}
