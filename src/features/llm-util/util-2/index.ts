import { runLlmUtility } from '../llmService'
export { llmUtilityDefinition } from './systemPrompt'

export function runUtil2(prompt: string, systemPrompt?: string) {
  return runLlmUtility({ utilityId: 'util-2', systemPrompt, prompt })
}
