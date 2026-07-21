import { runLlmUtility } from '../llmService'

export function runUtil4(prompt: string) {
  return runLlmUtility({ utilityId: 'util-4', prompt })
}
