import systemPromptMarkdown from './system-prompt.md?raw'
import type { LlmUtilityDefinition } from '../types'

export const llmUtilityDefinition: LlmUtilityDefinition = {
  id: 'util-0',
  label: '신규위험 데이터 설계 AI',
  caption: '문서 묶음 → 위험 유형·엔터티·필드',
  description: '여러 문서를 함께 읽고 신규 위험 유형과 대시보드·탐색·상세·리포트용 데이터 구조를 설계합니다.',
  icon: 'scan',
  defaultSystemPrompt: systemPromptMarkdown.trim(),
}
