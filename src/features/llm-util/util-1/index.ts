import { runLlmUtility } from '../llmService'

export function runUtil1(prompt: string) {
  return runLlmUtility({ utilityId: 'util-1', prompt })
}
