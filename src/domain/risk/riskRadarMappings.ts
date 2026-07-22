import type { ProductRisk } from './riskRadarDemo'

const radarToWorkbenchId: Record<string, string> = {
  'demo-risk-ev': 'home-ess-fire',
  'demo-risk-ai': 'ai-liability',
  'demo-risk-drone': 'physical-ai-accident',
  'demo-risk-meta': 'platform-worker-gap',
  'demo-risk-climate': 'home-ess-fire',
}

export function getWorkbenchRiskId(risk: ProductRisk) {
  return radarToWorkbenchId[risk.id] ?? 'ai-liability'
}

export function getRadarArticleId(workbenchRiskId: string) {
  const match = Object.entries(radarToWorkbenchId).find(([, id]) => id === workbenchRiskId)
  if (!match) return 'demo-news-ai'
  return `demo-news-${match[0].replace('demo-risk-', '')}`
}
