import systemPromptMarkdown from './system-prompt.md?raw'
import type { LlmUtilityDefinition } from '../types'

export const llmUtilityDefinition: LlmUtilityDefinition = {
  id: 'util-2',
  label: '위험 후보화 AI',
  caption: '신호 → 후보 정의',
  description: '반복되는 신호를 위험 정의와 손실 시나리오가 있는 후보 초안으로 구조화합니다.',
  icon: 'list',
  defaultSystemPrompt: systemPromptMarkdown.trim(),
}

