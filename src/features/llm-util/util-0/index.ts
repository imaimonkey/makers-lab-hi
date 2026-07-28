import { runLlmUtility } from '../llmService'

export { llmUtilityDefinition } from './systemPrompt'

export function runUtil0(prompt: string, systemPrompt?: string) {
  return runLlmUtility({ utilityId: 'util-0', systemPrompt, prompt })
}
