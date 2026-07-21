import type { IconName } from '../../shared/components/AppIcon'

export type LlmUtilityId = 'util-1' | 'util-2' | 'util-3' | 'util-4'

export type LlmUtilityDefinition = {
  id: LlmUtilityId
  label: string
  caption: string
  description: string
  starterPrompt: string
  icon: IconName
}

export type LlmRunRequest = {
  utilityId: LlmUtilityId
  prompt: string
}

export type LlmRunResult = {
  text: string
  mode: 'mock' | 'gemini'
  generatedAt: string
  model?: string
}
