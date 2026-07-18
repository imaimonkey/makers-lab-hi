export type RiskTheme =
  | 'ai-digital'
  | 'climate-energy'
  | 'mobility'
  | 'platform-work'
  | 'smart-living'
  | 'health-lifestyle'

export type CustomerSignal = {
  id: string
  createdAt: string
  source: 'customer-voice'
  lifeStage: string
  theme: RiskTheme
  title: string
  anonymizedSummary: string
  keywords: string[]
  aggregationStatus: 'sample-only'
  reviewStatus: 'intake'
}

export type RiskEvidenceContract = {
  id: string
  sourceType: 'news' | 'research' | 'statistics' | 'regulation' | 'customer-voice'
  sourceName: string
  title: string
  sourceUrl: string
  publishedAt: string
  excerpt: string
  supports: string[]
  confidence: 'high' | 'medium' | 'low'
}

export type RiskCandidateContract = {
  id: string
  title: string
  theme: RiskTheme
  lossEvent: string
  exposedParty: string
  cause: string
  lossType: string[]
  evidenceIds: string[]
  status: 'observing' | 'reviewing' | 'advanced' | 'held' | 'dropped'
  owner?: string
  updatedAt: string
}
