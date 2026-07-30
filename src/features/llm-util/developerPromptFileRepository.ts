export type DeveloperPromptStep = 'step2' | 'step3' | 'step4' | `util-${0 | 1 | 2 | 3 | 4}`

type PromptFileResponse = { text?: unknown; fileName?: unknown; path?: unknown; error?: unknown }

export async function readDeveloperPromptFile(step: DeveloperPromptStep, fileName = 'system-prompt.md') {
  const query = new URLSearchParams({ step, fileName })
  const response = await fetch(`/api/llm/prompt-files?${query.toString()}`)
  const payload = await response.json() as PromptFileResponse
  if (!response.ok || typeof payload.text !== 'string') throw new Error(typeof payload.error === 'string' ? payload.error : '개발자 모드 시스템 프롬프트를 불러오지 못했습니다.')
  return { text: payload.text, fileName: String(payload.fileName ?? fileName), path: String(payload.path ?? `data/system-prompts/${step}/${fileName}`) }
}
