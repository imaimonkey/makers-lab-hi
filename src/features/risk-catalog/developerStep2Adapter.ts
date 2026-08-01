import { readStep2AnalysisResults, type SavedStep2AnalysisRow } from '../llm-util/util-2'
import { type RiskExplorationMetricKey, type RiskExplorationMetricEvidence, type RiskExplorationRecord } from '../../domain/risk/riskExplorationDemo'
import type { ProductRisk } from '../../domain/risk/riskRadarDemo'
import type { SampleRiskAssessment, SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'
import type { RiskTheme } from '../../domain/risk/types'
import type { ArticleContentProfile, ArticleSourceRecord } from '../risk-dashboard/articleSourceData'
import type { SavedStep3AnalysisRow } from '../llm-util/util-3'
import { step3Nested, step3Root, step3Text } from '../risk-detail/step3ResultAdapter'

const actualCheckRequired = '확인 필요'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asText(value: unknown, fallback = actualCheckRequired): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function asTextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => asText(item, '')).filter(Boolean)
  const text = asText(value, '')
  return text ? [text] : []
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = asText(value, '')
    if (text) return text
  }
  return actualCheckRequired
}

function scoreFrom(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(5, parsed)) : fallback
}

function confidenceFrom(score: number): SampleRiskEvidence['confidence'] {
  if (score >= 4) return 'high'
  if (score >= 2.5) return 'medium'
  return 'low'
}

function assessmentConfidenceFrom(score: number): SampleRiskAssessment['confidence'] {
  if (score >= 4) return '높음'
  if (score >= 2.5) return '보통'
  return '낮음'
}

function candidateStatus(raw: string): SampleRiskCandidate['status'] {
  const value = raw.toLowerCase()
  if (value.includes('review') || value.includes('검토')) return '검토 중'
  if (value.includes('observe') || value.includes('관찰')) return '관찰'
  return '검토 중'
}

function themeFrom(candidate: Record<string, unknown>): RiskTheme {
  const value = firstText(candidate.theme, candidate.categories).toLowerCase()
  if (value.includes('climate') || value.includes('기후') || value.includes('에너지')) return 'climate-energy'
  if (value.includes('mobility') || value.includes('이동') || value.includes('모빌리티')) return 'mobility'
  if (value.includes('health') || value.includes('건강')) return 'health-lifestyle'
  return 'ai-digital'
}

function makeActualEvidence(article: ArticleSourceRecord, riskId: string, uncertainty: string[], counterEvidence: string[], score: number): SampleRiskEvidence {
  return {
    id: article.id + '-source',
    type: 'src/article PDF',
    sourceType: 'article',
    sourceName: article.source + ' · ' + article.fileName,
    title: article.title,
    sourceUrl: null,
    publishedAt: article.collectedAt ?? null,
    date: article.collectedAt ?? actualCheckRequired,
    excerpt: article.text.trim().slice(0, 900) || actualCheckRequired,
    supports: ['risk:' + riskId],
    confidence: confidenceFrom(score),
    uncertainty: uncertainty.join(' · ') || '기사 본문만으로 빈도·손해 규모·법률 적용 범위는 확인 필요',
    counterpoint: counterEvidence.join(' · ') || '독립 출처와 실제 손해 데이터 추가 확인 필요',
    verificationStatus: 'source-pending',
    dataStatus: 'actual-article',
  }
}

function makeMetricEvidence(
  article: ArticleSourceRecord,
  riskId: string,
  key: string,
  metric: Record<string, unknown>,
  score: number,
  verified: boolean,
): SampleRiskEvidence {
  const reasons = asTextList(metric.reasons)
  const uncertainty = asTextList(metric.uncertainty)
  const counterEvidence = asTextList(metric.counterEvidence)
  return {
    id: `${article.id}-metric-${key}`,
    type: 'Step 2 AI 평가 근거',
    sourceType: 'article',
    sourceName: `${article.source} · ${article.fileName}`,
    title: `${key} 평가 · ${article.title}`,
    sourceUrl: null,
    publishedAt: article.collectedAt ?? null,
    date: article.collectedAt ?? actualCheckRequired,
    excerpt: reasons.join(' · ') || asText(metric.judgment),
    supports: [`risk:${riskId}`, `assessment:${key}`],
    confidence: verified ? confidenceFrom(score) : 'low',
    uncertainty: uncertainty.join(' · ') || 'AI 점수의 원문 인용 구간을 추가 확인해야 합니다.',
    counterpoint: counterEvidence.join(' · ') || '독립 출처·정량 손해 데이터 추가 확인 필요',
    verificationStatus: verified ? 'source-pending' : 'source-pending',
    dataStatus: 'actual-article',
  }
}

export type DeveloperRiskDetailData = {
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
  articleId: string
}

function buildContentDerivedDetailData(article: ArticleSourceRecord): DeveloperRiskDetailData {
  const profile = article.contentProfile
  const assessmentRows = [
    ['신규성', profile.scores.novelty],
    ['증가성', profile.scores.growth],
    ['피해 심각성', profile.scores.severity],
    ['확산 가능성', profile.scores.spread],
    ['보험 사각지대 가능성', profile.scores.coverageGap],
    ['근거 신뢰도', profile.scores.evidenceConfidence],
  ] as const
  const assessments = assessmentRows.map(([label, rawScore]) => ({
    label,
    rawScore,
    score: Math.round(rawScore * 20),
    confidence: assessmentConfidenceFrom(rawScore),
    note: profile.signals[0]?.basis ?? profile.summary,
    formula: `${label} = ${rawScore.toFixed(1)} / 5 × 20`,
    inputs: profile.facts.slice(0, 2).join(' · '),
    calculation: `${rawScore.toFixed(1)} × 20 = ${Math.round(rawScore * 20)}점`,
    interpretation: profile.event,
    evidenceStatus: 'pending' as const,
    evidenceQuotes: profile.facts.slice(0, 2),
    uncertainty: ['본문 기반 구조화 더미이며 공식 인용 구간 검증 전'],
    counterEvidence: ['독립 출처와 반증 자료 확인 필요'],
  }))
  const average = assessments.reduce((sum, item) => sum + item.score, 0) / assessments.length
  const evidence = makeActualEvidence(article, `developer-${article.id}`, profile.reviewActions, ['본문 기반 구조화 더미'], profile.evidenceConfidence)
  return {
    articleId: article.id,
    risk: {
      id: `developer-${article.id}`,
      title: article.title,
      theme: themeFrom({ theme: profile.topic }),
      themeLabel: profile.topic,
      signalStrength: Math.round(profile.scores.growth * 20),
      productFit: Math.round(average),
      evidenceCount: 1,
      status: candidateStatus('review'),
      trend: '본문 기반 구조화 더미',
      updatedAt: article.collectedAt ?? new Date().toISOString(),
      articleId: article.id,
    },
    detail: {
      riskStatement: profile.summary,
      exposedParty: profile.affectedTargets.join(' · '),
      primaryLoss: profile.damageTypes.join(' · '),
      decisionStatus: '본문 기반 구조화 결과 · 담당자 검증 필요',
      decisionBadge: 'CONTENT DERIVED · MOCK',
      decisionTitle: profile.reviewActions[0] ?? '원문 핵심 주장과 인용 구간 확인',
      decisionTone: 'hold',
      decisionChecks: profile.reviewActions.slice(0, 4),
      assessments,
      evidence: [evidence],
    },
  }
}

export function buildDeveloperRiskDetailData(article: ArticleSourceRecord, rows: SavedStep2AnalysisRow[]): DeveloperRiskDetailData {
  if (!rows.length) return buildContentDerivedDetailData(article)
  const candidate = getStep2Root(rows.find((row) => row.step === 'candidate') ?? rows[0])
  const metrics = getStep2Root(rows.find((row) => row.step === 'metrics') ?? rows[0])
  const review = getStep2Root(rows.find((row) => row.step === 'candidateReview') ?? rows[0])
  const queue = getStep2Root(rows.find((row) => row.step === 'articleQueue') ?? rows[0])
  const metricScores = asRecord(metrics.metricScores)
  const metricEvidence = asRecord(metrics.metricEvidence)
  const keys = ['demand', 'fortuity', 'accumulation', 'measurability', 'adverseSelection', 'moralHazard', 'dataConfidence', 'legalExposure'] as const
  const knownEvidenceIds = new Set([article.id, `${article.id}-source`, ...asTextList(metrics.evidenceIds)])
  const normalizedArticleText = article.text.replace(/\s+/g, ' ').trim()
  const metricHasValidatedEvidence = (key: typeof keys[number]) => {
    const item = asRecord(metricEvidence[key])
    const structuredEvidence = Array.isArray(item.evidence) ? item.evidence : []
    const sourceIds = [...asTextList(item.sources), ...asTextList(item.evidenceId), ...structuredEvidence.map((entry) => asRecord(entry).evidenceId).filter((value): value is string => typeof value === 'string')]
    const quotes = [...asTextList(item.quotes), ...asTextList(item.quote), ...structuredEvidence.map((entry) => asRecord(entry).quote).filter((value): value is string => typeof value === 'string')]
    return sourceIds.some((sourceId) => knownEvidenceIds.has(sourceId)) && quotes.some((quote) => {
      const normalizedQuote = quote.replace(/\s+/g, ' ').trim()
      return normalizedQuote.length >= 8 && normalizedArticleText.includes(normalizedQuote)
    })
  }
  const scores = Object.fromEntries(keys.map((key) => [key, scoreFrom(metricScores[key])])) as Record<typeof keys[number], number>
  const uncertainty = [...asTextList(candidate.uncertainty), ...asTextList(review.uncertainty), ...asTextList(queue.uncertainty)]
  const counterEvidence = [...asTextList(candidate.counterEvidence), ...asTextList(review.counterEvidenceIds)]
  const evidence = makeActualEvidence(article, 'developer-' + article.id, uncertainty, counterEvidence, scores.dataConfidence)
  const baseLabels = ['시장 수요', '우연성', '누적 위험', '측정 가능성', '역선택', '도덕적 해이', '데이터 신뢰도', '법률 노출']
  const metricLabels = ['demand', 'fortuity', 'accumulation', 'measurability', 'adverseSelection', 'moralHazard', 'dataConfidence', 'legalExposure'] as const
  const assessments = metricLabels.map((key, index) => {
    const metric = asRecord(metricEvidence[key])
    const verified = metricHasValidatedEvidence(key)
    const rationale = asText(metric.scoreRationale, '저장된 Step 2 분석의 대표 사유입니다.')
    const reasons = asTextList(metric.reasons).length ? asTextList(metric.reasons) : [rationale]
    const judgment = firstText(metric.judgment, asRecord(metrics.display)[key + 'Val'], actualCheckRequired)
    const score = Math.round(scores[key] * 20)
    return {
      label: baseLabels[index] ?? key,
      score,
      confidence: score >= 80 ? '높음' as const : score >= 50 ? '보통' as const : '낮음' as const,
      note: reasons.join(' · ') || judgment,
      formula: key + ' = ' + scores[key].toFixed(1) + ' / 5',
      inputs: '근거 ' + ([article.id + '-source', ...asTextList(metric.sources)].filter((value, position, values) => values.indexOf(value) === position).join(' · ') || '근거 ID 확인 필요') + ' · ' + asText(metrics.scoreBasis, '점수 산정 근거 확인 필요'),
      calculation: scores[key].toFixed(1) + ' × 20 = ' + score,
      interpretation: rationale + (asTextList(metric.uncertainty).length ? ' · ' + asTextList(metric.uncertainty).join(' · ') : ''),
      evidenceStatus: (verified ? 'verified' : 'pending') as 'verified' | 'pending',
      evidenceQuotes: [...asTextList(metric.quotes), ...asTextList(metric.quote)].slice(0, 3),
      uncertainty: asTextList(metric.uncertainty),
      counterEvidence: asTextList(metric.counterEvidence),
    }
  })
  const title = firstText(candidate.title, review.keyword, queue.headline, article.title)
  const summary = firstText(candidate.summary, candidate.impact, article.summary)
  const statusText = firstText(candidate.status, review.reviewRecommendation, queue.status)
  const status = candidateStatus(statusText)
  const average = keys.reduce((total, key) => total + scores[key], 0) / keys.length
  const decisionTone = statusText.toLowerCase().includes('advance') || statusText.includes('진행') ? 'advance' : status === '관찰' ? 'observe' : 'hold'
  const checks = [...asTextList(candidate.nextAction), ...asTextList(candidate.gap), ...asTextList(review.next), ...uncertainty].filter(Boolean)
  const detail: SampleRiskDetail = {
    riskStatement: summary,
    exposedParty: firstText(candidate.exposedParty, candidate.target, review.audience),
    primaryLoss: firstText(candidate.primaryLoss, candidate.lossEvent, candidate.gap, review.impact),
    decisionStatus: statusText,
    decisionBadge: 'ACTUAL ARTICLE · STEP 2',
    decisionTitle: firstText(candidate.nextAction, review.next, queue.nextAction),
    decisionTone,
    decisionChecks: [...new Set(checks.length ? checks : [actualCheckRequired])].slice(0, 4),
    assessments,
    evidence: [evidence, ...keys.map((key) => makeMetricEvidence(article, 'developer-' + article.id, key, asRecord(metricEvidence[key]), scores[key], metricHasValidatedEvidence(key)))],
  }
  return {
    articleId: article.id,
    risk: {
      id: 'developer-' + article.id,
      title,
      theme: themeFrom(candidate),
      themeLabel: asTextList(candidate.tags)[0] ?? asTextList(candidate.categories)[0] ?? 'ACTUAL ARTICLE',
      signalStrength: Math.round(scores.demand * 20),
      productFit: Math.round(average * 20),
      evidenceCount: 1,
      status,
      trend: 'ACTUAL ARTICLE · Step 2',
      updatedAt: article.collectedAt ?? new Date().toISOString(),
      articleId: article.id,
    },
    detail,
  }
}

function step3SourceType(value: unknown): SampleRiskEvidence['sourceType'] {
  const allowed = ['article', 'news', 'research', 'report', 'statistics', 'regulation', 'customer-voice', 'internal-sample']
  const text = step3Text(value)
  return allowed.includes(text) ? text as SampleRiskEvidence['sourceType'] : 'article'
}

function step3EvidenceToSample(value: unknown, article: Pick<ArticleSourceRecord, 'id' | 'title' | 'source' | 'collectedAt'> & { fileName?: string; text?: string }, riskId: string): SampleRiskEvidence[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry, index) => {
    const item = asRecord(entry)
    const excerpt = step3Text(item.excerpt, '')
    const id = step3Text(item.id, `${article.id}#step3-evidence-${index + 1}`)
    if (!excerpt) return []
    return [{
      id,
      type: step3Text(item.type, 'Step 3 근거 원장'),
      sourceType: step3SourceType(item.sourceType),
      sourceName: step3Text(item.sourceName, article.source ?? 'src/article PDF'),
      title: step3Text(item.title, article.title),
      sourceUrl: /^https?:\/\//i.test(step3Text(item.sourceUrl)) ? step3Text(item.sourceUrl) : null,
      publishedAt: step3Text(item.publishedAt, '') || null,
      date: step3Text(item.date, article.collectedAt ?? actualCheckRequired),
      excerpt,
      supports: asTextList(item.supports).length ? asTextList(item.supports) : [`risk:${riskId}`],
      confidence: (['high', 'medium', 'low'].includes(step3Text(item.confidence)) ? step3Text(item.confidence) : 'low') as SampleRiskEvidence['confidence'],
      uncertainty: step3Text(item.uncertainty, 'Step 3 결과의 불확실성 확인 필요'),
      counterpoint: step3Text(item.counterpoint, '반증 자료 추가 확인 필요'),
      verificationStatus: 'source-pending',
      dataStatus: item.dataStatus === 'live' ? 'actual-article' : 'actual-article',
    }]
  })
}

function findStep3Array(value: unknown, key: string): unknown[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value
  const record = value as Record<string, unknown>
  if (Array.isArray(record[key])) return record[key] as unknown[]
  for (const child of Object.values(record)) {
    const found = findStep3Array(child, key)
    if (found.length) return found
  }
  return []
}

/** Step 3 결과가 있으면 위험 상세의 표시용 모델을 최신 AI 결과로 갱신합니다. */
export function applyStep3ResultsToDeveloperRiskDetailData(data: DeveloperRiskDetailData, rows: SavedStep3AnalysisRow[]): DeveloperRiskDetailData {
  if (!rows.length) return data
  const summary = step3Nested(rows, 'summary', 'riskSummary')
  const context = step3Nested(rows, 'context', 'context')
  const articleFacts = asRecord(context.articleFacts)
  const decision = step3Nested(rows, 'decisionBrief', 'decisionBrief')
  const assessmentRoot = step3Root(rows, 'assessment')
  const rawAssessments = findStep3Array(assessmentRoot, 'assessments')
  const trend = step3Nested(rows, 'trend', 'signalTrend')
  const evidenceRoot = step3Root(rows, 'evidence')
  const step3Evidence = step3EvidenceToSample(evidenceRoot.evidence, { id: data.articleId, title: data.risk.title, source: 'Step 3 evidence ledger', fileName: '', text: '' }, data.risk.id)
  const evidenceById = new Map(step3Evidence.map((item) => [item.id, item.excerpt]))
  const mappedAssessments = rawAssessments.flatMap((value) => {
    const item = asRecord(value)
    const rawScore = scoreFrom(item.rawScore, scoreFrom(item.score) / 20)
    const score = Number.isFinite(Number(item.score)) ? Math.max(0, Math.min(100, Number(item.score))) : Math.round(rawScore * 20)
    const label = step3Text(item.label, '')
    if (!label) return []
    const refs = asTextList(item.evidenceRefs)
    return [{
      label,
      rawScore,
      score,
      confidence: (['높음', '보통', '낮음'].includes(step3Text(item.confidence)) ? step3Text(item.confidence) : '낮음') as SampleRiskDetail['assessments'][number]['confidence'],
      note: step3Text(item.interpretation, step3Text(item.note, 'Step 3 AI 판단 사유 확인 필요')),
      formula: step3Text(item.formula, 'Step 3 원점수 × 20'),
      inputs: step3Text(item.inputs, 'Step 3 입력 근거 확인 필요'),
      calculation: step3Text(item.calculation, `${rawScore.toFixed(1)} × 20 = ${score}`),
      interpretation: step3Text(item.interpretation, step3Text(item.note)),
      evidenceStatus: refs.length && refs.some((ref) => evidenceById.has(ref)) ? 'verified' as const : 'pending' as const,
      evidenceQuotes: refs.map((ref) => evidenceById.get(ref)).filter((quote): quote is string => Boolean(quote)).slice(0, 3),
      uncertainty: asTextList(item.uncertainty),
      counterEvidence: asTextList(item.counterpoint),
    }]
  })
  const nextChecks = Array.isArray(decision.nextChecks)
    ? decision.nextChecks.map((item) => asRecord(item)).map((item) => step3Text(item.task)).filter(Boolean)
    : []
  const blockers = asTextList(decision.blockers)
  const summaryTitle = step3Text(summary.title, data.risk.title)
  const riskStatement = step3Text(summary.riskStatement, data.detail.riskStatement)
  const exposedParty = step3Text(summary.exposedParty, data.detail.exposedParty)
  const primaryLoss = step3Text(summary.primaryLoss, data.detail.primaryLoss)
  const tone = step3Text(decision.recommendedTone, data.detail.decisionTone)
  const decisionTone = tone === 'advance' ? 'advance' : tone === 'observe' ? 'observe' : 'hold'
  const scoreForSignal = mappedAssessments.find((item) => /증가성|시장 수요|수요/.test(item.label))?.score
  const productFit = mappedAssessments.length
    ? Math.round(mappedAssessments.reduce((sum, item) => sum + item.score, 0) / mappedAssessments.length)
    : data.risk.productFit
  const actualEvidence = step3Evidence.length ? [data.detail.evidence[0], ...step3Evidence] : data.detail.evidence
  return {
    articleId: data.articleId,
    risk: {
      ...data.risk,
      title: summaryTitle,
      themeLabel: step3Text(summary.themeLabel, data.risk.themeLabel),
      signalStrength: scoreForSignal ?? data.risk.signalStrength,
      productFit,
      trend: step3Text(trend.direction, data.risk.trend),
    },
    detail: {
      ...data.detail,
      riskStatement,
      exposedParty,
      primaryLoss,
      decisionStatus: step3Text(decision.recommendedStatus, data.detail.decisionStatus),
      decisionTitle: step3Text(decision.title, data.detail.decisionTitle),
      decisionTone,
      decisionChecks: [...new Set([...nextChecks, ...blockers, ...asTextList(articleFacts.timeAndPlace), ...data.detail.decisionChecks])].filter(Boolean).slice(0, 6),
      assessments: mappedAssessments.length ? mappedAssessments : data.detail.assessments,
      evidence: actualEvidence,
    },
  }
}

export function parseStep2Json(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, ''))
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  } catch { return {} }
}

const textValue = (value: unknown, fallback = '확인 필요') => typeof value === 'string' && value.trim() ? value : fallback
const numberValue = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : fallback

export function getStep2Root(row?: SavedStep2AnalysisRow): Record<string, unknown> {
  if (!row) return {}
  const data = parseStep2Json(row.resultJson)
  const value = data[row.step]
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : data
}

function buildContentDerivedRecord(article: ArticleSourceRecord, index: number): RiskExplorationRecord {
  const profile: ArticleContentProfile = article.contentProfile
  const scores = {
    demand: profile.scores.growth,
    fortuity: profile.scores.severity,
    accumulation: profile.scores.spread,
    measurability: profile.scores.evidenceConfidence,
    adverseSelection: profile.scores.coverageGap,
    moralHazard: profile.scores.novelty,
    dataConfidence: profile.scores.evidenceConfidence,
    legalExposure: profile.scores.coverageGap,
  }
  const metricKeys = Object.keys(scores) as RiskExplorationMetricKey[]
  const displayScore = (key: RiskExplorationMetricKey) => `${scores[key].toFixed(1)}/5`
  const metricEvidence = Object.fromEntries(metricKeys.map((key, metricIndex) => {
    const signal = profile.signals[metricIndex % Math.max(profile.signals.length, 1)]
    return [key, {
      reasons: [signal?.value ?? profile.summary],
      sourceIds: [article.id],
      quotes: [signal?.basis ?? profile.facts[0] ?? profile.summary],
      judgment: signal?.label ?? profile.topic,
      scoreRationale: '본문 기반 구조화 더미 결과 · 공식 검증 전 참고값',
      confidence: profile.evidenceConfidence >= 4 ? 'medium' : 'low',
      evidenceStatus: 'pending' as const,
      counterEvidence: ['독립 출처와 원문 인용 구간 확인 필요'],
      uncertainty: ['AI·Step 2 실제 분석 결과가 아닌 본문 기반 더미 구조화'],
    }]
  })) as Partial<Record<RiskExplorationMetricKey, RiskExplorationMetricEvidence>>
  const display = {
    demandVal: displayScore('demand'), fortVal: displayScore('fortuity'), fortuityDots: Math.round(scores.fortuity),
    accumVal: displayScore('accumulation'), accumulationDots: Math.round(scores.accumulation),
    measVal: displayScore('measurability'), measurabilityDots: Math.round(scores.measurability),
    adverseVal: displayScore('adverseSelection'), moralVal: displayScore('moralHazard'),
    dataVal: `${Math.round(scores.dataConfidence * 20)}%`, dataConfidencePercent: Math.round(scores.dataConfidence * 20),
    riskLabel: displayScore('legalExposure'), riskSub: profile.topic, legalRiskSub: profile.reviewActions[0] ?? '검토 필요',
  }
  const categories: RiskExplorationRecord['categories'] = profile.topic === '법률·사회보험' ? ['legal', 'corporate'] : ['corporate']
  return {
    id: `developer-${article.id}`,
    detailRiskId: `developer-${article.id}`,
    title: article.title,
    summary: profile.summary,
    tags: profile.keywords.slice(0, 4),
    categories: [...categories],
    demand: display.demandVal,
    fortuity: display.fortVal,
    accumulation: display.accumVal,
    measurability: display.measVal,
    adverseSelection: display.adverseVal,
    moralHazard: display.moralVal,
    dataConfidence: display.dataVal,
    legalExposure: display.riskLabel,
    metricScores: scores,
    metricEvidence,
    evidenceIds: [article.id],
    articleId: article.id,
    sourceName: article.source,
    collectedAt: article.collectedAt,
    contentInsight: {
      topic: profile.topic,
      event: profile.event,
      facts: profile.facts.slice(0, 3),
      signals: profile.signals,
      reviewActions: profile.reviewActions.slice(0, 3),
    },
    display,
    gap: profile.damageTypes.slice(0, 2).join(' · ') || '보장 공백 확인 필요',
    nextAction: profile.reviewActions.slice(0, 2).join(' · ') || `원문 ${index + 1}차 검토 필요`,
  }
}

export function buildDeveloperStep2Records(rows: SavedStep2AnalysisRow[], articles: ArticleSourceRecord[] = []): RiskExplorationRecord[] {
  const grouped = new Map<string, SavedStep2AnalysisRow[]>()
  rows.filter((row) => row.mode !== 'mock').forEach((row) => grouped.set(row.articleId, [...(grouped.get(row.articleId) ?? []), row]))
  const storedRecords: RiskExplorationRecord[] = [...grouped.entries()].map(([articleId, articleRows], index) => {
    const article = articles.find((item) => item.id === articleId)
    const candidate = getStep2Root(articleRows.find((row) => row.step === 'candidate') ?? articleRows[0])
    const metrics = getStep2Root(articleRows.find((row) => row.step === 'metrics') ?? articleRows[0])
    const scores = (metrics.metricScores && typeof metrics.metricScores === 'object' ? metrics.metricScores : {}) as Record<string, unknown>
    const rawMetricEvidence = asRecord(metrics.metricEvidence)
    const articleText = article?.text ?? ''
    const normalizedArticleText = articleText.replace(/\s+/g, ' ').trim()
    const validatedEvidence = (key: RiskExplorationMetricKey) => {
      const item = asRecord(rawMetricEvidence[key])
      const structuredEvidence = Array.isArray(item.evidence) ? item.evidence : []
      const sourceIds = [...asTextList(item.sources), ...structuredEvidence.map((evidence) => asRecord(evidence).evidenceId).filter((value): value is string => typeof value === 'string')]
      const quotes = [...asTextList(item.quotes), ...asTextList(item.quote), ...structuredEvidence.map((evidence) => asRecord(evidence).quote).filter((value): value is string => typeof value === 'string' && value.trim().length > 0)]
      const knownIds = new Set([articleId, `${articleId}-source`, ...asTextList(metrics.evidenceIds)])
      return sourceIds.some((sourceId) => knownIds.has(sourceId)) && quotes.some((quote) => {
        const normalizedQuote = quote.replace(/\s+/g, ' ').trim()
        return normalizedQuote.length >= 8 && normalizedArticleText.includes(normalizedQuote)
      })
    }
    // Keep the stored AI suggestion visible for practical review, but carry the
    // evidence state separately so an unquoted score is never mistaken for a
    // verified underwriting conclusion.
    const score = (key: RiskExplorationMetricKey) => numberValue(scores[key], 0)
    const metricEvidence = Object.fromEntries((['demand', 'fortuity', 'accumulation', 'measurability', 'adverseSelection', 'moralHazard', 'dataConfidence', 'legalExposure'] as RiskExplorationMetricKey[]).map((key) => {
      const item = asRecord(rawMetricEvidence[key])
      const structuredEvidence = Array.isArray(item.evidence) ? item.evidence : []
      const quotes = [
        ...asTextList(item.quotes),
        ...asTextList(item.quote),
        ...structuredEvidence.map((evidence) => asRecord(evidence).quote).filter((quote): quote is string => typeof quote === 'string' && quote.trim().length > 0),
      ]
      const sourceIds = [
        ...asTextList(item.sources),
        ...structuredEvidence.map((evidence) => asRecord(evidence).evidenceId).filter((sourceId): sourceId is string => typeof sourceId === 'string' && sourceId.trim().length > 0),
      ]
      const verified = validatedEvidence(key)
      const scoreRationale = asText(item.scoreRationale, '저장된 Step 2 분석의 대표 사유입니다.')
      const value: RiskExplorationMetricEvidence = {
        reasons: asTextList(item.reasons).length ? asTextList(item.reasons) : [scoreRationale],
        sourceIds: [...new Set(sourceIds)],
        quotes: [...new Set(quotes)].slice(0, 3),
        judgment: asText(item.judgment),
        scoreRationale,
        confidence: verified ? asText(item.confidence, 'low') : 'low',
        evidenceStatus: verified ? 'verified' : 'pending',
        counterEvidence: asTextList(item.counterEvidence),
        uncertainty: asTextList(item.uncertainty),
      }
      return [key, value]
    })) as Partial<Record<RiskExplorationMetricKey, RiskExplorationMetricEvidence>>
    const evidenceIds = [...new Set([
      ...asTextList(candidate.evidenceIds),
      ...asTextList(metrics.evidenceIds),
      ...Object.values(metricEvidence).flatMap((item) => item?.sourceIds ?? []),
    ])]
    const title = textValue(candidate.title, article?.title ?? `실제 아티클 위험 후보 ${index + 1}`)
    const tags = Array.isArray(candidate.tags) ? candidate.tags.map(String) : ['실제 아티클']
    const displayScore = (key: RiskExplorationMetricKey) => score(key) > 0 ? `${score(key).toFixed(1)}/5` : actualCheckRequired
    const displayPercent = score('dataConfidence') > 0 ? `${Math.round(score('dataConfidence') * 20)}%` : actualCheckRequired
    const display = {
      demandVal: displayScore('demand'), fortVal: displayScore('fortuity'), fortuityDots: Math.round(score('fortuity')),
      accumVal: displayScore('accumulation'), accumulationDots: Math.round(score('accumulation')),
      measVal: displayScore('measurability'), measurabilityDots: Math.round(score('measurability')),
      adverseVal: displayScore('adverseSelection'), moralVal: displayScore('moralHazard'),
      dataVal: displayPercent, dataConfidencePercent: Math.round(score('dataConfidence') * 20),
      riskLabel: displayScore('legalExposure'), riskSub: textValue(candidate.uncertainty), legalRiskSub: textValue(candidate.uncertainty),
    }
    return {
      id: `developer-${articleId}`, detailRiskId: `developer-${articleId}`, title,
      summary: textValue(candidate.summary, article?.summary ?? actualCheckRequired), tags,
      categories: ['corporate'], demand: display.demandVal, fortuity: display.fortVal, accumulation: display.accumVal,
      measurability: display.measVal, adverseSelection: display.adverseVal, moralHazard: display.moralVal,
      dataConfidence: display.dataVal, legalExposure: display.riskLabel,
      metricScores: { demand: score('demand'), fortuity: score('fortuity'), accumulation: score('accumulation'), measurability: score('measurability'), adverseSelection: score('adverseSelection'), moralHazard: score('moralHazard'), dataConfidence: score('dataConfidence'), legalExposure: score('legalExposure') },
      metricEvidence, evidenceIds, articleId, sourceName: article?.source, collectedAt: article?.collectedAt,
      display, gap: textValue(candidate.gap), nextAction: textValue(candidate.nextAction),
    }
  })
  const contentDerivedRecords = articles
    .filter((article) => !grouped.has(article.id))
    .map((article, index) => buildContentDerivedRecord(article, index))
  return [...storedRecords, ...contentDerivedRecords]
}

export async function loadDeveloperStep2Records() {
  return buildDeveloperStep2Records(await readStep2AnalysisResults())
}

export function buildDeveloperProductRisks(records: RiskExplorationRecord[]): ProductRisk[] {
  const marketOf = (value: string): ProductRisk['market'] => /매우 높|높음|높다/.test(value) ? '높음' : /중간|보통/.test(value) ? '중간' : /낮음|낮다/.test(value) ? '낮음' : '확인 필요'
  const severityOf = (value: string): ProductRisk['severity'] => /심각|매우 높/.test(value) ? '심각' : /높음|높다/.test(value) ? '높음' : /중간|보통/.test(value) ? '중간' : '확인 필요'
  const dataOf = (value: string): ProductRisk['data'] => /충분|높음/.test(value) ? '충분' : /없음|미확보/.test(value) ? '없음' : /보강|확인/.test(value) ? '보강 필요' : '확인 필요'
  const lawOf = (value: string): ProductRisk['law'] => /관련 없음/.test(value) ? '관련 없음 확인' : /^확인$|원문 확인/.test(value) ? '확인' : /검토|법률|규제/.test(value) ? '검토 필요' : '확인 필요'
  return records.map((record, index) => {
    const score = Object.values(record.metricScores).reduce((sum, value) => sum + value, 0) / 8
    return {
      id: record.id,
      keyword: record.title,
      audience: '개인·기업',
      target: record.summary,
      industry: record.tags.join(' · ') || '확인 필요',
      loss: record.summary,
      coverageGap: record.gap,
      market: marketOf(record.demand),
      severity: severityOf(record.legalExposure),
      data: dataOf(record.dataConfidence),
      law: lawOf(record.legalExposure),
      existing: '확인 필요' as ProductRisk['existing'],
      rider: '확인 필요' as ProductRisk['rider'],
      mainCoverage: '확인 필요' as ProductRisk['mainCoverage'],
      score,
      mentions: 1,
      sourceCount: 1,
      keywords: record.tags,
      trend: score > 0 ? Array.from({ length: 7 }, (_, point) => Math.max(12, Math.round(score * 16 + point * 3 + index))) : [],
      impact: record.summary,
      next: record.nextAction,
      articleId: record.id.replace(/^developer-/, ''),
    }
  })
}

export type DeveloperLawQueueItem = {
  id: string
  institution: string
  title: string
  description: string
  date: string
  sourceName: string
  sourceUrl?: string
  verificationStatus: string
}

export type DeveloperTrendItem = {
  id: string
  label: string
  values: number[]
  metric: string
  summary: string
}

export type DeveloperRiskCatalogViewData = {
  risks: ProductRisk[]
  keywords: string[]
  laws: DeveloperLawQueueItem[]
  trends: DeveloperTrendItem[]
  counts: {
    articles: number
    bodyReady: number
    analyzed: number
    verified: number
    laws: number
    candidates: number
    corporateDemand: number
  }
  workflow: Array<readonly [string, number]>
}

export function buildDeveloperRiskCatalogViewData(articles: ArticleSourceRecord[], rows: SavedStep2AnalysisRow[]): DeveloperRiskCatalogViewData {
  const records = buildDeveloperStep2Records(rows, articles)
  const risks = buildDeveloperProductRisks(records)
  const rowsByArticle = new Map<string, SavedStep2AnalysisRow[]>()
  rows.forEach((row) => rowsByArticle.set(row.articleId, [...(rowsByArticle.get(row.articleId) ?? []), row]))
  const laws: DeveloperLawQueueItem[] = []
  const trends: DeveloperTrendItem[] = []
  const keywords = new Set<string>()

  articles.forEach((article) => keywords.add(article.title))
  records.forEach((record) => record.tags.forEach((tag) => keywords.add(tag)))

  for (const article of articles) {
    const articleRows = rowsByArticle.get(article.id) ?? []
    const lawRoot = getStep2Root(articleRows.find((row) => row.step === 'law'))
    const references = Array.isArray(lawRoot.references) ? lawRoot.references : []
    references.forEach((item, index) => {
      const reference = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {}
      laws.push({
        id: `${article.id}-law-${index + 1}`,
        institution: asText(reference.institution),
        title: asText(reference.title),
        description: asText(reference.description),
        date: asText(reference.date ?? reference.publishedAt),
        sourceName: asText(reference.sourceName, article.source),
        sourceUrl: asText(reference.sourceUrl ?? reference.url),
        verificationStatus: asText(reference.verificationStatus),
      })
    })

    const trendRoot = getStep2Root(articleRows.find((row) => row.step === 'signalTrend'))
    const observations = Array.isArray(trendRoot.observations) ? trendRoot.observations : []
    const values = observations.map((item) => {
      const observation = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {}
      const value = Number(observation.value)
      return Number.isFinite(value) ? value : 0
    }).filter((value) => value > 0)
    trends.push({
      id: article.id,
      label: asText(trendRoot.candidateKey, article.title),
      values,
      metric: asText(trendRoot.metric),
      summary: asText(trendRoot.summary),
    })
  }

  const articleCount = articles.length
  const withBody = articles.filter((article) => Boolean(article.text.trim())).length
  const analyzed = new Set(rows.filter((row) => row.step === 'candidate').map((row) => row.articleId)).size
  const verified = new Set(rows.filter((row) => row.step === 'caseLossMarket').map((row) => row.articleId)).size
  const corporateDemand = records.filter((record) => record.categories.includes('corporate') || /기업|기관|사업자/.test(`${record.title} ${record.summary}`)).length
  const workflow: Array<readonly [string, number]> = [
    ['수집', articleCount],
    ['본문 확보', withBody],
    ['AI 분석', analyzed],
    ['교차검증', verified],
    ['법령 검토', new Set(rows.filter((row) => row.step === 'law').map((row) => row.articleId)).size],
    ['담당자 확인', new Set(rows.filter((row) => row.step === 'candidateReview').map((row) => row.articleId)).size],
    ['위험 후보', records.length],
  ]
  return {
    risks,
    keywords: [...keywords].filter(Boolean).slice(0, 20),
    laws,
    trends,
    counts: { articles: articleCount, bodyReady: withBody, analyzed, verified, laws: laws.length, candidates: records.length, corporateDemand },
    workflow,
  }
}

export async function loadDeveloperStep2Detail(articleId: string) {
  const rows = (await readStep2AnalysisResults()).filter((row) => row.articleId === articleId && row.mode !== 'mock')
  return { rows, results: Object.fromEntries(rows.map((row) => [row.step, getStep2Root(row)])) }
}
