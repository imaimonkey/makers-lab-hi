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

export type RiskEvidenceSourceType =
  | 'news'
  | 'research'
  | 'report'
  | 'statistics'
  | 'regulation'
  | 'customer-voice'
  | 'internal-sample'

export type RiskEvidenceContract = {
  id: string
  sourceType: RiskEvidenceSourceType
  sourceName: string
  title: string
  sourceUrl: string | null
  publishedAt: string | null
  excerpt: string
  supports: string[]
  confidence: 'high' | 'medium' | 'low'
  uncertainty: string
  counterpoint: string
  verificationStatus: 'source-pending' | 'link-provided-unverified'
  dataStatus: 'sample-only'
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

export type RiskReviewPersona = '인수심사' | '손해사정' | '리스크관리'

export type RiskReviewStatus = 'pending' | 'completed'

export type RiskReviewRecord = {
  schemaVersion: 1
  riskId: string
  persona: RiskReviewPersona
  status: RiskReviewStatus
  memo: string
  uncertainty: string
  counterpoint: string
  checkedItemIds: string[]
  evidenceIds: string[]
  createdAt: string
  updatedAt: string
  storageMode: 'local-sample'
}
