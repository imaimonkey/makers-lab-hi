import { runLlmUtility } from '../llmService'
export { llmUtilityDefinition } from './systemPrompt'

export function runUtil3(prompt: string, systemPrompt?: string) {
  return runLlmUtility({ utilityId: 'util-3', systemPrompt, prompt })
}
