import { readStep2AnalysisResults, type SavedStep2AnalysisRow } from '../llm-util/util-2'
import { getPrimaryRiskCategory, type RiskExplorationMetricKey, type RiskExplorationMetricEvidence, type RiskExplorationRecord } from '../../domain/risk/riskExplorationDemo'
import type { ProductRisk } from '../../domain/risk/riskRadarDemo'
import type { SampleRiskAssessment, SampleRiskCandidate, SampleRiskDetail, SampleRiskEvidence } from '../../domain/risk/sampleData'
import type { RiskDetailNarrative } from '../../domain/risk/riskDetailContent'
import type { RiskTheme } from '../../domain/risk/types'
import { groupArticleSourceRecords, isMeaningfulRiskCandidate, selectArticleGroupRepresentative } from '../risk-dashboard/articleSourceData'
import type { ArticleContentProfile, ArticleSourceRecord } from '../risk-dashboard/articleSourceData'
import type { SavedStep3AnalysisRow } from '../llm-util/util-3'
import { step3Nested, step3Root, step3Text } from '../risk-detail/step3ResultAdapter'

const actualCheckRequired = '문서 기준 정보 없음'

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
    type: article.format === 'pdf' ? '문서 원문 PDF' : '문서 원문',
    sourceType: 'article',
    sourceName: article.source ?? '문서 원문',
    title: article.title,
    sourceUrl: article.fileUrl,
    publishedAt: article.collectedAt ?? null,
    date: article.collectedAt ?? actualCheckRequired,
    excerpt: article.text.trim().slice(0, 900) || actualCheckRequired,
    supports: ['risk:' + riskId],
    confidence: confidenceFrom(score),
    uncertainty: uncertainty.join(' · ') || '문서만으로 빈도·손해 규모·법률 적용 범위를 산정하지 않았습니다.',
    counterpoint: counterEvidence.join(' · ') || '문서 밖의 손해자료와 적용 기준은 분석 범위에서 제외했습니다.',
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
    type: '문서 기반 지표 평가',
    sourceType: 'article',
    sourceName: article.source ?? '문서 원문',
    title: `${key} 평가 · ${article.title}`,
    sourceUrl: article.fileUrl,
    publishedAt: article.collectedAt ?? null,
    date: article.collectedAt ?? actualCheckRequired,
    excerpt: reasons.join(' · ') || asText(metric.judgment),
    supports: [`risk:${riskId}`, `assessment:${key}`],
    confidence: verified ? confidenceFrom(score) : 'low',
    uncertainty: uncertainty.join(' · ') || '지표의 대표성·국내 적용성은 문서 범위 밖입니다.',
    counterpoint: counterEvidence.join(' · ') || '문서 밖의 정량 손해자료는 분석 범위에서 제외했습니다.',
    verificationStatus: verified ? 'source-pending' : 'source-pending',
    dataStatus: 'actual-article',
  }
}

export type DeveloperRiskDetailData = {
  risk: SampleRiskCandidate
  detail: SampleRiskDetail
  articleId: string
}

function buildArticleNarrative(article: ArticleSourceRecord): RiskDetailNarrative {
  const { contentProfile: profile, derived } = article
  const concept = derived.productConcept
  const facts = profile.facts.filter(Boolean)
  const targets = profile.affectedTargets.filter(Boolean)
  const damages = profile.damageTypes.filter(Boolean)
  const reviewActions = profile.reviewActions.filter(Boolean)
  const signals = profile.signals.filter(Boolean)
  const factAt = (index: number, fallback: string) => facts[index] ?? fallback
  const targetText = targets.join(' · ') || concept.insured
  const damageText = damages.join(' · ') || concept.coveredLoss
  const reviewText = reviewActions.join(' · ') || '원문과 추가 손해자료를 연결해 검토해야 합니다.'
  const sourceText = article.source ?? '연결 원문'

  return {
    overview: derived.summary,
    analysisIntro: `${article.title}을 보험의 관점에서 바라볼 때 가장 먼저 구분해야 할 것은, 이 위험이 단순히 하나의 사고나 분쟁으로 끝나는 문제가 아니라는 점입니다. 위험은 ${derived.event}에서 시작해 ${concept.coveredEvent}와 ${damageText}를 거쳐 운영·복구·책임 분쟁으로 확산될 수 있습니다. 따라서 상품화 가능성을 판단하려면 ${sourceText} 원문에서 확인된 사실만 보는 것이 아니라, 어떤 행위가 사고를 만들고 어떤 비용이 실제 손해로 전환되는지, 책임 주체를 식별할 수 있는지와 기업별 통제 수준을 함께 살펴봐야 합니다.`,
    background: derived.event,
    mechanism: `${concept.coveredEvent}로 인해 ${damageText}가 발생하거나 확대되는 구조입니다.`,
    damage: concept.coveredLoss,
    exposure: targetText,
    responsibility: `${concept.policyholder}와 ${concept.insured} 사이의 사고 예방·관리·배상 책임을 구분해야 합니다.`,
    management: reviewText,
    customerImpact: `${targetText}의 사고 대응과 복구 부담이 ${damageText}로 이어질 수 있어 보장 공백과 접근 가능한 관리 기준을 함께 확인해야 합니다.`,
    existingInsurance: concept.existingInsuranceRelationship,
    additionalInsurance: concept.form,
    productIssue: derived.coverageGap,
    incident: factAt(0, derived.event),
    escalation: `${factAt(1, derived.summary)} ${concept.coveredLoss}`,
    insuranceBoundary: `보장 범위는 ${concept.coveredEvent}에 한정할지, ${concept.coveredLoss}와 운영·복구 비용까지 연결할지 구분해야 합니다.`,
    insuranceReasons: [
      ['위험이 보험사고로 전환되는 지점', derived.event, concept.coveredEvent],
      ['손해가 확산되는 경로', concept.coveredLoss, profile.scores.coverageGap >= 4 ? '보장 공백 검토 우선' : '기존 담보와 연결 여부 검토'],
      ['실무 검토가 필요한 이유', reviewText, concept.existingInsuranceRelationship],
    ],
    lossRows: [
      ['직접 손해', damageText, '원문 연결'],
      ['법률·방어 비용', `${concept.coveredEvent} 이후 원인 조사, 전문가 자문, 민원·분쟁 대응 비용이 발생할 수 있습니다.`, '비용 손해'],
      ['운영·복구 손해', `${factAt(2, derived.summary)}와 ${concept.coveredLoss}를 정상화·복구하는 과정에서 재작업·교체·서비스 회복 비용이 발생할 수 있습니다.`, '운영 손해'],
      ['계약상 배상책임', `${concept.policyholder}와 ${concept.insured} 사이의 계약·법률상 책임 분담에 따라 제3자 배상책임으로 확산될 수 있습니다.`, '계약 책임'],
      ['서비스·업무 중단', `${derived.coverageGap}가 장기화되면 매출 손실, 납품 지연, 고객 대응과 평판 회복 비용이 추가될 수 있습니다.`, '간접 손해'],
    ],
    stakeholders: [
      ['주요 노출 대상', targetText],
      ['위험을 관리하는 주체', `${concept.policyholder}가 ${reviewText}을 관리하고 사고 대응 절차를 운영해야 합니다.`],
      ['사고를 경험하는 주체', `${targetText}가 ${damageText}와 운영·복구 부담을 직접 또는 간접적으로 경험할 수 있습니다.`],
      ['계약·인수 관계자', `${concept.policyholder}와 ${concept.insured}의 역할·계약·책임 분담을 확인해야 보험계약자·피보험자·제3자의 범위를 구분할 수 있습니다.`],
      ['규제·감독 기관', `${sourceText}와 관련 법령·감독 기준의 변경이 사고 정의와 보장 범위에 영향을 줄 수 있습니다.`],
      ['보험 계약자', `${concept.underwritingInputs.join(' · ') || reviewText}를 인수조건·면책·자기부담금 검토에 반영할 필요가 있습니다.`],
    ],
    coverageRows: [
      ['기존 보험 연결', concept.existingInsuranceRelationship, '연결 검토'],
      ['재산·운영손해보험', `${concept.coveredLoss}와 복구·영업중단 비용이 어떤 사고 원인과 조건에서 연결되는지 확인합니다.`, '보장 경계 검토'],
      ['전문·사이버 위험보험', concept.form, '연결 가능성 검토'],
      ['법률비용·방어비용', '책임이 확정되기 전 조사·자문·소송·피해 통지 비용을 별도 담보로 구조화할 수 있는지 살펴봅니다.', '구조화 가능'],
      ['신규 특약·시범상품', `${derived.coverageGap}가 객관적인 사고 정의와 자료로 측정되는 범위부터 제한적 특약을 검토합니다.`, '추가 검토'],
    ],
    questions: [
      `사고를 ${concept.coveredEvent}로 정의할 때 객관적으로 확인할 수 있는 증빙은 무엇인가?`,
      `직접 손해와 운영·복구 손해 중 ${concept.coveredLoss}의 어느 범위까지 담보할 것인가?`,
      `${concept.policyholder}와 ${concept.insured}의 책임을 어떤 로그·계약·점검 기록으로 구분할 것인가?`,
      `인수 판단에 필요한 ${concept.underwritingInputs.slice(0, 2).join(' · ') || '위험관리 정보'}를 확보하고 통제 수준을 보험조건에 반영할 수 있는가?`,
      `보험료와 한도 산출에 필요한 ${concept.pricingInputs.slice(0, 2).join(' · ') || '빈도·심도 자료'}와 국내 손해자료가 원문 밖에서 보완되었는가?`,
    ],
    analysisSections: [
      ['위험은 특정 결과가 아니라 전 과정에서 만들어진다', `${derived.event}에서 시작한 위험은 ${concept.coveredEvent}와 ${damageText}를 거쳐 운영·복구·책임 분쟁으로 확산될 수 있습니다. ${factAt(0, derived.summary)}`],
      ['현재 기준은 결론보다 사건별 판단을 요구한다', `${concept.existingInsuranceRelationship} 같은 기존 기준이 있더라도 발생 원인, 이용 목적, 통제 수준과 계약 구조에 따라 책임과 보장 가능성이 달라질 수 있습니다. ${concept.outOfScope.join(' · ') || '적용 제외 범위와 예외 조건'}를 공식 원문과 약관에서 함께 확인해야 합니다.`],
      ['책임 확정 전에도 손해가 발생한다', `${concept.coveredLoss}에 대한 조사·복구·피해 대응 비용은 최종 책임 판단 전에 먼저 발생할 수 있습니다. 특히 ${factAt(1, derived.summary)}가 이어지면 방어비용과 운영손해를 별도 항목으로 구조화해야 합니다.`],
      ['책임 주체가 여러 단계로 나뉜다', `${concept.policyholder}와 ${concept.insured}, 서비스·위탁·이용 주체 사이의 역할과 증빙이 분리되지 않으면 사고 원인과 구상 관계를 확정하기 어렵습니다. ${reviewText}`],
      ['국내 공식 자료와 손해자료를 함께 봐야 한다', `${sourceText} 원문과 ${signals.map((signal) => `${signal.label}: ${signal.value}`).join(' · ') || '현재 확인된 위험 신호'}는 위험의 존재와 관리 방향을 보여주지만, 사고 빈도·평균 손해액·보험 청구자료는 별도로 축적해야 합니다.`],
      ['기존 보험은 일부 손해와 먼저 연결된다', `${concept.existingInsuranceRelationship} ${concept.form} 전면적인 신규 담보를 단정하기보다 기존 배상·재산·전문·사이버·법률비용 담보의 적용 범위와 면책을 먼저 대조할 필요가 있습니다.`],
      ['상품화는 사고 정의와 통제 조건을 좁히는 데서 시작한다', `${derived.coverageGap}를 명확한 사고 시점과 손해 항목으로 제한하고, ${concept.underwritingInputs.join(' · ') || reviewText}를 인수조건·자기부담금·면책 기준에 반영할 수 있는지 검토해야 합니다.`],
      ['현실적인 도입은 제한적 특약과 시범상품부터다', `우선 검토 담보는 ${concept.coveredLoss}와 법률·방어비용, 제한적 제3자 배상책임으로 나누어 설계할 수 있습니다. 다만 ${concept.pricingInputs.join(' · ') || '국내 사고 빈도·평균 손해액'}를 확인하고 실제 약관·법무·계리 검증을 거쳐 보장 범위를 단계적으로 확대해야 합니다.`],
    ],
    priorityCover: concept.coveredLoss,
    underwriting: concept.underwritingInputs.join(' · ') || reviewText,
    evidenceNeeded: `${sourceText} 원문 밖의 실제 손해·청구·약관 자료와 국내 적용 기준 확인`,
  }
}

function buildContentDerivedDetailData(article: ArticleSourceRecord): DeveloperRiskDetailData {
  const profile = article.contentProfile
  const derived = article.derived
  const concept = derived.productConcept
  const metricLabels: Record<keyof ArticleSourceRecord['derived']['metricScores'], string> = {
    demand: '시장 수요', fortuity: '우연성', accumulation: '누적 위험', measurability: '측정 가능성',
    adverseSelection: '역선택', moralHazard: '도덕적 해이', dataConfidence: '데이터 신뢰도', legalExposure: '법률·책임 노출',
  }
  const metricKeys = Object.keys(derived.metricScores) as Array<keyof ArticleSourceRecord['derived']['metricScores']>
  const assessmentEvidence = [
    derived.summary,
    concept.coveredEvent,
    `${profile.affectedTargets.slice(0, 3).join(' · ')}에 ${profile.damageTypes.slice(0, 3).join(' · ')}가 동시에 발생할 수 있는지 확인`,
    derived.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(' · '),
    concept.underwritingInputs.slice(0, 2).join(' · '),
    concept.pricingInputs.slice(0, 2).join(' · '),
    `${article.source ?? '문서 원문'}의 발행·본문·인용 정보를 기준으로 연결`,
    concept.existingInsuranceRelationship,
  ]
  const assessments = metricKeys.map((key, index) => {
    const label = metricLabels[key]
    const rawScore = derived.metricScores[key]
    return {
    label,
    rawScore,
    score: Math.round(rawScore * 20),
    confidence: assessmentConfidenceFrom(rawScore),
    note: assessmentEvidence[index] ?? derived.summary,
    formula: `${label} = ${rawScore.toFixed(1)} / 5 × 20`,
    inputs: [assessmentEvidence[index] ?? derived.summary, derived.metrics[index % Math.max(derived.metrics.length, 1)]?.sourceHint].filter(Boolean).join(' · '),
    calculation: `${rawScore.toFixed(1)} × 20 = ${Math.round(rawScore * 20)}점`,
    interpretation: derived.event,
    evidenceStatus: 'pending' as const,
    evidenceQuotes: [assessmentEvidence[index] ?? derived.summary, ...derived.facts.slice(0, 2)].filter(Boolean).slice(0, 3),
    uncertainty: derived.uncertainty,
    counterEvidence: derived.counterEvidence,
    }
  })
  const average = assessments.reduce((sum, item) => sum + item.score, 0) / assessments.length
  const riskId = `developer-${article.id}`
  const evidence = makeActualEvidence(article, riskId, derived.uncertainty, derived.counterEvidence, profile.evidenceConfidence)
  const metricEvidence = metricKeys.map((key, index) => makeMetricEvidence(article, riskId, key, {
    reasons: [assessmentEvidence[index] ?? derived.summary],
    judgment: metricLabels[key],
    uncertainty: derived.uncertainty,
    counterEvidence: derived.counterEvidence,
  }, derived.metricScores[key], false))
  return {
    articleId: article.id,
    risk: {
      id: `developer-${article.id}`,
      title: article.title,
      theme: themeFrom({ theme: profile.topic }),
      themeLabel: profile.topic,
      signalStrength: Math.round(derived.metricScores.demand * 20),
      productFit: Math.round(average * 20),
      evidenceCount: 1 + metricEvidence.length,
      status: candidateStatus(derived.recommendation),
      trend: '원문 기반 구조화',
      updatedAt: article.collectedAt ?? new Date().toISOString(),
      articleId: article.id,
    },
    detail: {
      riskStatement: `${derived.summary} ${derived.coverageGap}`,
      exposedParty: concept.insured,
      primaryLoss: concept.coveredLoss,
      decisionStatus: derived.recommendation === 'review' ? '우선 검토 · 추가 확인 필요' : '관찰 지속 · 추가 확인 필요',
      decisionBadge: '원문 기반 분석',
      decisionTitle: concept.workingName,
      decisionTone: 'hold',
      decisionChecks: [...profile.reviewActions, ...concept.underwritingInputs.slice(0, 2)].slice(0, 6),
      assessments,
      evidence: [evidence, ...metricEvidence],
      narrative: buildArticleNarrative(article),
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
      inputs: '근거 ' + ([article.id + '-source', ...asTextList(metric.sources)].filter((value, position, values) => values.indexOf(value) === position).join(' · ') || '공식 원문 확인 필요') + ' · ' + asText(metrics.scoreBasis, '점수 산정 근거 확인 필요'),
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
    narrative: buildArticleNarrative(article),
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
      sourceName: step3Text(item.sourceName, article.source ?? '문서 원문'),
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
  const scores = article.derived.metricScores
  const metricKeys = Object.keys(scores) as RiskExplorationMetricKey[]
  const displayScore = (key: RiskExplorationMetricKey) => `${scores[key].toFixed(1)}/5`
  const metricCopy: Record<RiskExplorationMetricKey, { reason: string; quote: string; judgment: string }> = {
    demand: { reason: profile.summary, quote: profile.facts[0] ?? profile.summary, judgment: '시장·노출 변화' },
    fortuity: { reason: profile.event, quote: profile.damageTypes[0] ?? profile.event, judgment: '사고 발생과 시점의 우연성' },
    accumulation: { reason: `${profile.affectedTargets.slice(0, 3).join(' · ')}에 손해가 동시에 발생할 가능성을 검토`, quote: profile.facts[1] ?? profile.summary, judgment: '집적·누적 PML' },
    measurability: { reason: profile.signals.map((signal) => `${signal.label} ${signal.value}`).join(' · '), quote: profile.signals[0]?.basis ?? profile.facts[0] ?? profile.summary, judgment: '지표·손해자료 연결성' },
    adverseSelection: { reason: `${profile.affectedTargets.join(' · ')}의 위험 차이와 가입 대상 선별 기준을 확인`, quote: profile.reviewActions[0] ?? profile.summary, judgment: '대상별 위험 차이' },
    moralHazard: { reason: `${profile.damageTypes.join(' · ')}에 대한 사고 원인·관리 로그·손해 입증을 확인`, quote: profile.reviewActions[1] ?? profile.summary, judgment: '고의·과다청구 통제' },
    dataConfidence: { reason: `${article.source ?? '문서 원문'}에서 확인한 발행 자료와 수치 신뢰도를 검토`, quote: profile.signals.map((signal) => signal.basis).join(' · ') || profile.facts[0] || profile.summary, judgment: '원문·지표 신뢰도' },
    legalExposure: { reason: article.derived.productConcept.existingInsuranceRelationship, quote: profile.reviewActions.at(-1) ?? profile.summary, judgment: '법령·약관·책임 범위' },
  }
  const metricEvidence = Object.fromEntries(metricKeys.map((key, metricIndex) => {
    const copy = metricCopy[key]
    return [key, {
      reasons: [copy.reason],
      sourceIds: [article.id],
      quotes: [copy.quote, article.derived.facts[metricIndex % Math.max(article.derived.facts.length, 1)] ?? profile.summary],
      judgment: copy.judgment,
      scoreRationale: `${copy.judgment} 기준으로 원문 사실·지표·추가 확인사항을 함께 검토한 값`,
      confidence: profile.evidenceConfidence >= 4 ? 'medium' : 'low',
      evidenceStatus: 'pending' as const,
      counterEvidence: article.derived.counterEvidence,
      uncertainty: article.derived.uncertainty,
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
  const personalExposure = /고령|취약|개인|소비자|근로자|주민|가계|환자|이용자/.test(`${profile.topic} ${profile.affectedTargets.join(' ')} ${profile.damageTypes.join(' ')}`)
  const categories: RiskExplorationRecord['categories'] = personalExposure ? ['individual', 'corporate'] : ['corporate']
  return {
    id: `developer-${article.id}`,
    detailRiskId: `developer-${article.id}`,
    title: article.title,
    summary: profile.summary,
    tags: profile.keywords.slice(0, 4),
    secondaryTags: profile.keywords.slice(0, 4),
    primaryCategory: personalExposure ? 'personal' : 'corporate',
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
    gap: article.derived.coverageGap,
    nextAction: article.derived.nextAction || `원문 ${index + 1}차 검토 필요`,
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
      summary: textValue(candidate.summary, article?.summary ?? actualCheckRequired), tags, secondaryTags: tags,
      primaryCategory: getPrimaryRiskCategory(`developer-${articleId}`, ['corporate']),
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
      industry: record.secondaryTags.join(' · ') || '확인 필요',
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
      keywords: record.secondaryTags,
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
  const candidateArticles = groupArticleSourceRecords(articles.filter(isMeaningfulRiskCandidate)).map(selectArticleGroupRepresentative)
  const records = buildDeveloperStep2Records(rows, candidateArticles)
  const risks = buildDeveloperProductRisks(records)
  const rowsByArticle = new Map<string, SavedStep2AnalysisRow[]>()
  rows.forEach((row) => rowsByArticle.set(row.articleId, [...(rowsByArticle.get(row.articleId) ?? []), row]))
  const laws: DeveloperLawQueueItem[] = []
  const localLaws = new Map<string, DeveloperLawQueueItem>()
  const trends: DeveloperTrendItem[] = []
  const keywords = new Set<string>()

  articles.forEach((article) => keywords.add(article.title))
  records.forEach((record) => record.secondaryTags.forEach((tag) => keywords.add(tag)))

  for (const article of articles) {
    if (article.derived.isRegulatory) {
      const existing = localLaws.get(article.title)
      localLaws.set(article.title, {
        id: existing?.id ?? `${article.id}-law`,
        institution: article.source ?? '국가법령정보센터',
        title: article.title,
        description: existing?.description ?? (article.summary ?? article.contentProfile.summary),
        date: article.collectedAt ?? existing?.date ?? actualCheckRequired,
        sourceName: article.source ?? '국가법령정보센터',
        sourceUrl: existing?.sourceUrl || article.fileUrl,
        verificationStatus: '원문 근거 연결',
      })
    }
    const articleRows = rowsByArticle.get(article.id) ?? []
    const lawRoot = getStep2Root(articleRows.find((row) => row.step === 'law'))
    const references = Array.isArray(lawRoot.references) ? lawRoot.references : []
    if (!article.derived.isRegulatory) references.forEach((item, index) => {
      const reference = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {}
      laws.push({
        id: `${article.id}-law-${index + 1}`,
        institution: asText(reference.institution),
        title: asText(reference.title),
        description: asText(reference.description),
        date: asText(reference.date ?? reference.publishedAt),
        sourceName: asText(reference.sourceName, article.source ?? '국가법령정보센터'),
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

  if (localLaws.size) laws.push(...localLaws.values())

  const articleCount = articles.length
  const withBody = articles.filter((article) => Boolean(article.text.trim())).length
  const analyzed = articles.length
  const verified = new Set(rows.filter((row) => row.step === 'caseLossMarket').map((row) => row.articleId)).size
  const corporateDemand = records.filter((record) => record.categories.includes('corporate') || /기업|기관|사업자/.test(`${record.title} ${record.summary}`)).length
  const workflow: Array<readonly [string, number]> = [
    ['수집', articleCount],
    ['본문 확보', withBody],
    ['AI 분석', analyzed],
    ['교차검증', verified],
    ['법령 검토', new Set(rows.filter((row) => row.step === 'law').map((row) => row.articleId)).size],
    ['근거 연결', articles.filter((article) => article.contentProfile.facts.length > 0).length],
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
