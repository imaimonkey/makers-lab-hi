import { readStep2AnalysisResults, type SavedStep2AnalysisRow } from '../llm-util/util-2'
import { type RiskExplorationMetricKey, type RiskExplorationRecord } from '../../domain/risk/riskExplorationDemo'
import type { ProductRisk } from '../../domain/risk/riskRadarDemo'
import { sampleRiskDetails, type SampleRiskCandidate, type SampleRiskDetail, type SampleRiskEvidence } from '../../domain/risk/sampleData'
import type { RiskTheme } from '../../domain/risk/types'
import type { ArticleSourceRecord } from '../risk-dashboard/articleSourceData'

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

function scoreFrom(value: unknown, fallback = 1): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? Math.max(1, Math.min(5, parsed)) : fallback
}

function confidenceFrom(score: number): SampleRiskEvidence['confidence'] {
  if (score >= 4) return 'high'
  if (score >= 2.5) return 'medium'
  return 'low'
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

export type DeveloperRiskDetailData = {
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
  articleId: string
}

export function buildDeveloperRiskDetailData(article: ArticleSourceRecord, rows: SavedStep2AnalysisRow[]): DeveloperRiskDetailData {
  const candidate = getStep2Root(rows.find((row) => row.step === 'candidate') ?? rows[0])
  const metrics = getStep2Root(rows.find((row) => row.step === 'metrics') ?? rows[0])
  const review = getStep2Root(rows.find((row) => row.step === 'candidateReview') ?? rows[0])
  const queue = getStep2Root(rows.find((row) => row.step === 'articleQueue') ?? rows[0])
  const metricScores = asRecord(metrics.metricScores)
  const metricEvidence = asRecord(metrics.metricEvidence)
  const keys = ['demand', 'fortuity', 'accumulation', 'measurability', 'adverseSelection', 'moralHazard', 'dataConfidence', 'legalExposure'] as const
  const scores = Object.fromEntries(keys.map((key) => [key, scoreFrom(metricScores[key])])) as Record<typeof keys[number], number>
  const uncertainty = [...asTextList(candidate.uncertainty), ...asTextList(review.uncertainty), ...asTextList(queue.uncertainty)]
  const counterEvidence = [...asTextList(candidate.counterEvidence), ...asTextList(review.counterEvidenceIds)]
  const evidence = makeActualEvidence(article, 'developer-' + article.id, uncertainty, counterEvidence, scores.dataConfidence)
  const baseLabels = sampleRiskDetails['generative-ai-copyright']?.assessments.map((item) => item.label) ?? keys.map((key) => key)
  const metricLabels = ['demand', 'fortuity', 'accumulation', 'measurability', 'adverseSelection', 'moralHazard', 'dataConfidence', 'legalExposure'] as const
  const assessments = metricLabels.map((key, index) => {
    const metric = asRecord(metricEvidence[key])
    const reasons = asTextList(metric.reasons)
    const judgment = firstText(metric.judgment, asRecord(metrics.display)[key + 'Val'], actualCheckRequired)
    const score = Math.round(scores[key] * 20)
    return {
      label: baseLabels[index] ?? key,
      score,
      confidence: score >= 80 ? '높음' as const : score >= 50 ? '보통' as const : '낮음' as const,
      note: reasons.join(' · ') || judgment,
      formula: key + ' = ' + scores[key].toFixed(1) + ' / 5',
      inputs: '근거 ' + article.id + ' · ' + asText(metrics.scoreBasis, '점수 산정 근거 확인 필요'),
      calculation: scores[key].toFixed(1) + ' × 20 = ' + score,
      interpretation: judgment + (asTextList(metric.uncertainty).length ? ' · ' + asTextList(metric.uncertainty).join(' · ') : ''),
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
    evidence: [evidence],
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
    },
    detail,
  }
}

export function parseStep2Json(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, ''))
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  } catch { return {} }
}

const textValue = (value: unknown, fallback = '확인 필요') => typeof value === 'string' && value.trim() ? value : fallback
const numberValue = (value: unknown, fallback = 3) => typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(5, value)) : fallback

export function getStep2Root(row?: SavedStep2AnalysisRow): Record<string, unknown> {
  if (!row) return {}
  const data = parseStep2Json(row.resultJson)
  const value = data[row.step]
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : data
}

export function buildDeveloperStep2Records(rows: SavedStep2AnalysisRow[], articles: ArticleSourceRecord[] = []): RiskExplorationRecord[] {
  const grouped = new Map<string, SavedStep2AnalysisRow[]>()
  articles.forEach((article) => grouped.set(article.id, []))
  rows.forEach((row) => grouped.set(row.articleId, [...(grouped.get(row.articleId) ?? []), row]))
  return [...grouped.entries()].map(([articleId, articleRows], index) => {
    const article = articles.find((item) => item.id === articleId)
    const candidate = getStep2Root(articleRows.find((row) => row.step === 'candidate') ?? articleRows[0])
    const metrics = getStep2Root(articleRows.find((row) => row.step === 'metrics') ?? articleRows[0])
    const scores = (metrics.metricScores && typeof metrics.metricScores === 'object' ? metrics.metricScores : {}) as Record<string, unknown>
    const score = (key: RiskExplorationMetricKey) => numberValue(scores[key], 0)
    const title = textValue(candidate.title, article?.title ?? `실제 아티클 위험 후보 ${index + 1}`)
    const tags = Array.isArray(candidate.tags) ? candidate.tags.map(String) : ['실제 아티클']
    const displayScore = (key: RiskExplorationMetricKey) => score(key) > 0 ? `${score(key)}/5` : actualCheckRequired
    const displayPercent = score('dataConfidence') > 0 ? `${Math.round(score('dataConfidence') * 20)}%` : actualCheckRequired
    const display = {
      demandVal: textValue(candidate.demand), fortVal: displayScore('fortuity'), fortuityDots: Math.round(score('fortuity')),
      accumVal: displayScore('accumulation'), accumulationDots: Math.round(score('accumulation')),
      measVal: displayScore('measurability'), measurabilityDots: Math.round(score('measurability')),
      adverseVal: textValue(candidate.adverseSelection), moralVal: textValue(candidate.moralHazard),
      dataVal: displayPercent, dataConfidencePercent: Math.round(score('dataConfidence') * 20),
      riskLabel: textValue(candidate.legalExposure), riskSub: textValue(candidate.uncertainty), legalRiskSub: textValue(candidate.uncertainty),
    }
    return {
      id: `developer-${articleId}`, detailRiskId: `developer-${articleId}`, title,
      summary: textValue(candidate.summary, article?.summary ?? actualCheckRequired), tags,
      categories: ['corporate'], demand: display.demandVal, fortuity: display.fortVal, accumulation: display.accumVal,
      measurability: display.measVal, adverseSelection: display.adverseVal, moralHazard: display.moralVal,
      dataConfidence: display.dataVal, legalExposure: display.riskLabel,
      metricScores: { demand: score('demand'), fortuity: score('fortuity'), accumulation: score('accumulation'), measurability: score('measurability'), adverseSelection: score('adverseSelection'), moralHazard: score('moralHazard'), dataConfidence: score('dataConfidence'), legalExposure: score('legalExposure') },
      display, gap: textValue(candidate.gap), nextAction: textValue(candidate.nextAction),
    }
  })
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
  const rows = (await readStep2AnalysisResults()).filter((row) => row.articleId === articleId)
  return { rows, results: Object.fromEntries(rows.map((row) => [row.step, getStep2Root(row)])) }
}
