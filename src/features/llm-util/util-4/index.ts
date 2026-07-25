import { runLlmUtility } from '../llmService'
export { llmUtilityDefinition } from './systemPrompt'

export function runUtil4(prompt: string, systemPrompt?: string) {
  return runLlmUtility({ utilityId: 'util-4', systemPrompt, prompt })
}
