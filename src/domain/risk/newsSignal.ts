export type NewsSourceRecord = {
  id: string
  title: string
  sourceName: string
  sourceUrl: string
  excerpt: string
  publishedAt: string
  collectedAt: string
  query?: string
}

export type NewsRiskGroupAction = 'matched' | 'new' | 'uncertain'
export type NewsClassificationMode = 'mock' | 'gemini'
export type NewsClassificationDataQuality = 'sample' | 'actual'

export type NewsRiskGroup = {
  groupKey: string
  title: string
  summary: string
  labels: string[]
  riskObject: string
  observedFacts: string[]
  changeDirection: 'increase' | 'decrease' | 'new' | 'unclear'
  exposedGroups: string[]
  potentialLoss: string[]
  sourceIds: string[]
  confidence: 'high' | 'medium' | 'low'
  needsReview: string[]
  groupingReason: string
  action: NewsRiskGroupAction
}

export type NewsRiskGroupRevision = {
  runId: string
  changedAt: string
  title: string
  action: NewsRiskGroupAction
  sourceIds: string[]
}

export type NewsRiskGroupRecord = NewsRiskGroup & {
  firstObservedAt: string | null
  lastObservedAt: string | null
  articleCount: number
  sourceNames: string[]
  sourceCount: number
  createdAt: string
  updatedAt: string
  dataQuality: NewsClassificationDataQuality
  status: 'new' | 'reviewing' | 'held'
  history: NewsRiskGroupRevision[]
}

export type NewsClassificationRun = {
  id: string
  utilityId: 'util-1'
  classificationVersion: string
  createdAt: string
  mode: NewsClassificationMode
  dataQuality: NewsClassificationDataQuality
  model?: string
  sourceItems: NewsSourceRecord[]
  sourceIds: string[]
  sourceItemCount: number
  groups: NewsRiskGroup[]
  rawOutput: string
}

export type NewsClassificationStore = {
  version: 1
  updatedAt: string | null
  runs: NewsClassificationRun[]
  groups: NewsRiskGroupRecord[]
}
