import { runLlmUtility } from '../llmService'

export function runUtil3(prompt: string) {
  return runLlmUtility({ utilityId: 'util-3', prompt })
}
