export type RadarStatus = string

export type RadarEvidenceCheck = {
  total: number
  matched: number
  unmatched: number
  status: string
}

export type RadarRelatedLaw = {
  id?: string
  title?: string
  desc?: string
  sourceUrl?: string
  date?: string
  source?: string
  relevance?: { score: number; matchReasons: string[] }
}

export type RadarNewsAnalysis = {
  articleId?: string
  articleFacts: {
    facts: string[]
    event: string
    changeType: string
    affectedTargets: string[]
    damageTypes: string[]
    industries: string[]
    timeAndPlace: string
  }
  riskInterpretation: {
    riskEnvironment: string
    whyNow: string
    expectedLosses: string[]
    responsibilityCandidates: string[]
    searchKeywords: string[]
  }
  evidence: Array<{ sentenceNo: number | null; quote: string; reason: string }>
  uncertainty: string[]
  confidence: { level: string; reason: string }
  verificationStatus: string
  verificationGate?: {
    status: string
    blockers: string[]
    sourceCount: number
    requiredSourceCount: number
    evidenceCheck?: RadarEvidenceCheck
    lawSearchStatus?: string
  }
  verification?: {
    verifiedFacts: Array<{ claim: string; verdict: string; evidenceQuote: string; reason: string }>
    contradictions: string[]
    missingInformation: string[]
    sourceAgreement: { level: string; reason: string }
    confidence: { level: string; reason: string }
  }
  evidenceCheck?: RadarEvidenceCheck
  sourceCount?: number
  lawSearchStatus?: string
  lawSource?: string
  lawQuery?: string
  relatedLaws?: RadarRelatedLaw[]
  analyzedAt?: string
  verifiedAt?: string | null
  verifiedCheckAt?: string
  model?: string
  analysisModel?: string
  verificationModel?: string
  promptVersion?: string
  crossValidationMode?: string
  comparisonArticleIds?: string[]
}

export type RadarNewsArticle = {
  id: string
  title: string
  summary?: string
  content?: string
  source?: string
  publishedAt?: string
  collectedAt?: string
  originalUrl?: string
  contentStatus?: RadarStatus
  contentSource?: string
  contentQuality?: { chars: number; paragraphs: number; titleMatched: number; titleTokens: number }
  contentError?: string
  analysisStatus?: RadarStatus
  verificationStatus?: RadarStatus
  verificationGate?: RadarNewsAnalysis['verificationGate']
  lawSearchStatus?: string
  analysisError?: string
  clusterId?: string
  analysis?: RadarNewsAnalysis | null
}

export type RadarRiskCandidate = {
  id: string
  articleId?: string
  clusterId?: string
  name: string
  source?: string
  status: string
  eligibleForProductReview?: boolean
  promotionBlockReason?: string
  facts?: RadarNewsAnalysis['articleFacts']
  riskInterpretation?: RadarNewsAnalysis['riskInterpretation']
  confidence?: RadarNewsAnalysis['confidence']
}

export type RadarChecklist = Record<string, boolean | string>

export type RadarEvaluation = {
  id: string
  riskId: string
  decision: string
  finalDecision?: string
  score: number
  productFit: string
  coverageFit: string
  lawStatus: string
  note: string
  checklist?: RadarChecklist
  additionalResearch?: string
  reviewer: string
  status?: string
  createdAt: string
  reviewedAt?: string
}

export type RadarSignal = {
  id: string
  channel: string
  title: string
  description: string
  reporter: string
  status: string
  createdAt: string
}

export type RadarIssueRecord = {
  id: string
  kind: 'issue'
  type: string
  title: string
  problemStatement: string
  affectedTargets: string[]
  damageTypes: string[]
  industries: string[]
  sourceChannels: string[]
  articleIds?: string[]
  signalIds?: string[]
  signalCount: number
  sourceCount: number
  repeatedKeywords: string[]
  contentStatus: string
  analysisStatus: string
  evidenceStatus: string
  coverageGap: string
  nextAction: string
  latestAt?: string
}

export type RadarDashboardData = {
  generatedAt: string
  metrics: {
    news: number
    contentReady: number
    analyzed: number
    pending: number
    failed: number
    clusters: number
    evidencePending: number
    riskCandidates: number
    totalSignals?: number
    verificationPassed?: number
    verificationPending?: number
    lawMatched?: number
    reviewerPending?: number
    productApiWaiting?: number
    issueClusters?: number
    issueSignals?: number
  }
  channels: Record<string, number>
  analysisCounts: Record<string, number>
  clusters: Array<{
    id: string
    title: string
    articleIds?: string[]
    articleCount: number
    sourceCount: number
    keywords: string[]
    sources?: string[]
  }>
  topNews: RadarNewsArticle[]
  risks: RadarRiskCandidate[]
  issues?: RadarIssueRecord[]
  signals?: RadarSignal[]
  recentActivities?: Array<{ type: string; title: string; status: string; at?: string }>
  failures?: Array<{ id: string; title: string; error?: string }>
  apiStatus?: { potens: string; law: string; products: string }
  lastSync?: { completedAt?: string; status?: string } | null
}

export type RadarNewsDetail = {
  article: RadarNewsArticle
  analysis: RadarNewsAnalysis | null
  relatedArticles: RadarNewsArticle[]
  relatedLaws: RadarRelatedLaw[]
  referenceLaws?: RadarRelatedLaw[]
  relatedProducts: unknown[]
  lawSearchStatus?: string
  lawSource?: string
  lawQuery?: string
}
