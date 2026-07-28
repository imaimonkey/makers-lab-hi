import type { ProductRisk } from './riskRadarDemo'

export type WorkbenchRiskId =
  | 'ev-battery-fire'
  | 'generative-ai-copyright'
  | 'commercial-drone'
  | 'deepfake-phishing'
  | 'urban-flooding'

const radarToWorkbenchId: Record<string, WorkbenchRiskId> = {
  'demo-risk-ev': 'ev-battery-fire',
  'demo-risk-ai': 'generative-ai-copyright',
  'demo-risk-drone': 'commercial-drone',
  'demo-risk-meta': 'deepfake-phishing',
  'demo-risk-climate': 'urban-flooding',
}

const canonicalRadarArticleByWorkbenchId: Record<WorkbenchRiskId, string> = {
  'ev-battery-fire': 'demo-news-ev',
  'generative-ai-copyright': 'demo-news-ai',
  'commercial-drone': 'demo-news-drone',
  'deepfake-phishing': 'demo-news-meta',
  'urban-flooding': 'demo-news-climate',
}

const canonicalRadarRiskByWorkbenchId: Record<WorkbenchRiskId, string> = {
  'ev-battery-fire': 'demo-risk-ev',
  'generative-ai-copyright': 'demo-risk-ai',
  'commercial-drone': 'demo-risk-drone',
  'deepfake-phishing': 'demo-risk-meta',
  'urban-flooding': 'demo-risk-climate',
}

export function getWorkbenchRiskId(risk: ProductRisk): WorkbenchRiskId | undefined {
  return radarToWorkbenchId[risk.id]
}

export function getRadarArticleId(workbenchRiskId: string) {
  return canonicalRadarArticleByWorkbenchId[workbenchRiskId as WorkbenchRiskId]
}

export function getRadarRiskId(workbenchRiskId: string) {
  return canonicalRadarRiskByWorkbenchId[workbenchRiskId as WorkbenchRiskId]
}
