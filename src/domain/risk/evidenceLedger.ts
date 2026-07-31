import type { SampleRiskEvidence } from './sampleData'
import type { RadarNewsAnalysis, RadarNewsArticle } from './riskRadarTypes'

export type EvidenceLedgerDataStatus = 'live' | 'sample-only' | 'actual-article' | 'pending' | 'stale'

export type EvidenceLedgerItem = {
  id: string
  type: string
  sourceType: string
  sourceName: string
  title: string
  sourceUrl?: string | null
  publishedAt?: string | null
  collectedAt?: string | null
  excerpt?: string
  supports: string[]
  confidence: 'high' | 'medium' | 'low'
  uncertainty: string
  counterpoint: string
  verificationStatus: string
  dataStatus: EvidenceLedgerDataStatus
}

export function toEvidenceLedgerItem(item: SampleRiskEvidence): EvidenceLedgerItem {
  return {
    id: item.id,
    type: item.type,
    sourceType: item.sourceType,
    sourceName: item.sourceName,
    title: item.title,
    sourceUrl: item.sourceUrl,
    publishedAt: item.publishedAt,
    collectedAt: null,
    excerpt: item.excerpt,
    supports: item.supports,
    confidence: item.confidence,
    uncertainty: item.uncertainty,
    counterpoint: item.counterpoint,
    verificationStatus: item.verificationStatus,
    dataStatus: item.dataStatus,
  }
}

export function toLiveEvidenceLedger(
  article: RadarNewsArticle,
  analysis: RadarNewsAnalysis | null,
): EvidenceLedgerItem[] {
  if (!analysis) {
    return []
  }

  return analysis.evidence.map((item, index) => ({
    id: `${article.id}-evidence-${item.sentenceNo ?? index + 1}`,
    type: '기사 원문',
    sourceType: 'news',
    sourceName: article.source ?? '출처 확인 필요',
    title: `${article.title} · 문장 ${item.sentenceNo ?? index + 1}`,
    sourceUrl: article.originalUrl ?? null,
    publishedAt: article.publishedAt ?? null,
    collectedAt: article.collectedAt ?? null,
    excerpt: item.quote,
    supports: [item.reason],
    confidence: analysis.confidence.level.includes('높') ? 'high' : analysis.confidence.level.includes('낮') ? 'low' : 'medium',
    uncertainty: analysis.uncertainty.join(' · ') || '추가 확인 필요',
    counterpoint: analysis.verification?.contradictions.join(' · ') || '반증 확인 필요',
    verificationStatus: analysis.verificationStatus ?? 'verification-pending',
    dataStatus: 'live',
  }))
}

export function toEvidenceLedger(items: SampleRiskEvidence[]): EvidenceLedgerItem[] {
  return items.map(toEvidenceLedgerItem)
}
