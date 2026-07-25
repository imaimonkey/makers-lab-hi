import systemPromptMarkdown from './system-prompt.md?raw'
import type { LlmUtilityDefinition } from '../types'

export const llmUtilityDefinition: LlmUtilityDefinition = {
  id: 'util-3',
  label: '근거 검토 AI',
  caption: '근거 → 신뢰도·반증',
  description: '후보에 연결된 출처의 최신성·독립성·반증 가능성을 점검합니다.',
  icon: 'scan',
  defaultSystemPrompt: systemPromptMarkdown.trim(),
}

