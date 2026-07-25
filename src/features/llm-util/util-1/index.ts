import { runLlmUtility } from '../llmService'
export { llmUtilityDefinition } from './systemPrompt'

export function runUtil1(prompt: string, systemPrompt?: string) {
  return runLlmUtility({ utilityId: 'util-1', systemPrompt, prompt })
}
