import systemPromptMarkdown from './system-prompt.md?raw'
import type { LlmUtilityDefinition } from '../types'

export const llmUtilityDefinition: LlmUtilityDefinition = {
  id: 'util-4',
  label: '리포트 초안 AI',
  caption: '검토 결과 → 의사결정 초안',
  description: '검토된 근거와 불확실성을 의사결정자가 읽을 수 있는 리포트 초안으로 정리합니다.',
  icon: 'report',
  defaultSystemPrompt: systemPromptMarkdown.trim(),
}

