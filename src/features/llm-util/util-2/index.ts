import { runLlmUtility } from '../llmService'

export function runUtil2(prompt: string) {
  return runLlmUtility({ utilityId: 'util-2', prompt })
}
