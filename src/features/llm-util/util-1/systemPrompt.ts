import systemPromptMarkdown from './system-prompt.md?raw'
import type { LlmUtilityDefinition } from '../types'

export const llmUtilityDefinition: LlmUtilityDefinition = {
  id: 'util-1',
  label: '신호 정리 AI',
  caption: '뉴스 수집 → 신호 분류·저장',
  description: '네이버 뉴스·데이터를 신규위험 신호로 분류하고 저장 가능한 구조화 결과로 정리합니다.',
  icon: 'radar',
  defaultSystemPrompt: systemPromptMarkdown.trim(),
}
