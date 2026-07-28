import type { IconName } from '../../shared/components/AppIcon'

export type LlmUtilityId = 'util-0' | 'util-1' | 'util-2' | 'util-3' | 'util-4'

export type LlmUtilityDefinition = {
  id: LlmUtilityId
  label: string
  caption: string
  description: string
  icon: IconName
  defaultSystemPrompt: string
}

export type LlmRunRequest = {
  utilityId: LlmUtilityId
  systemPrompt?: string
  prompt: string
}

export type LlmRunResult = {
  text: string
  mode: 'mock' | 'gemini'
  generatedAt: string
  model?: string
}
