import { calculateRiskExplorationScore, riskExplorationRecords, type RiskExplorationRecord } from '../../domain/risk/riskExplorationDemo'
import { sampleRiskDetails } from '../../domain/risk/sampleData'
import { getRiskDetailNarrative } from '../../domain/risk/riskDetailContent'
import { createArticleDerivedReportData, type ArticleDerivedReportEntry } from './article-derived-report-adapter'
import type { ArticleContentProfile, ArticleSourceRecord } from '../../features/risk-dashboard/articleSourceData'

const AS_OF = '2026-07-23T00:00:00.000Z'

function percent(value: string) {
  const parsed = Number(value.match(/\d+/)?.[0])
  return Number.isFinite(parsed) ? parsed : 50
}

function confidence(value: string): ArticleSourceRecord['derived']['confidence'] {
  const score = percent(value)
  if (score >= 80) return { level: 'high', reason: '큐레이션 후보에 연결된 근거와 위험 지표가 비교적 충분함' }
  if (score >= 65) return { level: 'medium', reason: '핵심 위험 구조는 확인되나 내부 손해·인수 자료의 추가 확인이 필요함' }
  return { level: 'low', reason: '공개 근거만으로는 상품 조건을 확정하기 어려워 추가 검증이 필요함' }
}

function makeCuratedArticle(record: RiskExplorationRecord): ArticleSourceRecord {
  const detail = sampleRiskDetails[record.detailRiskId]
  const narrative = getRiskDetailNarrative(record.detailRiskId) ?? detail?.narrative
  const evidence = detail?.evidence ?? []
  const targets = [detail?.exposedParty ?? '위험 노출 대상 확인 필요']
  const damages = [detail?.primaryLoss ?? record.gap]
  const facts = [
    record.summary,
    record.gap,
    record.nextAction,
    ...(narrative?.analysisSections ?? []).slice(0, 3).map((section) => section[1]),
  ].filter(Boolean).slice(0, 6)
  const keywords = [...new Set([...record.tags, record.title.split(/[·,\s]+/).filter((word) => word.length > 1)])].flat()
  const metricScores = record.metricScores
  const contentProfile: ArticleContentProfile = {
    topic: record.tags.join(' · '),
    event: detail?.riskStatement ?? record.summary,
    summary: record.summary,
    facts,
    affectedTargets: targets,
    damageTypes: damages,
    industries: record.tags,
    keywords,
    signals: [
      { label: '시장 수요', value: record.demand, basis: '큐레이션 후보의 수요 지표', tone: 'blue' },
      { label: '사고 우연성', value: record.fortuity, basis: '위험 발생 구조 지표', tone: 'orange' },
      { label: '누적 가능성', value: record.accumulation, basis: '집적·동시 손해 지표', tone: 'red' },
      { label: '근거 신뢰도', value: record.dataConfidence, basis: '연결 근거의 확인 수준', tone: 'green' },
    ],
    reviewActions: detail?.decisionChecks ?? [record.nextAction, record.gap],
    evidenceConfidence: percent(record.dataConfidence) / 20,
    scores: {
      novelty: metricScores.moralHazard,
      growth: metricScores.demand,
      severity: metricScores.fortuity,
      spread: metricScores.accumulation,
      coverageGap: metricScores.legalExposure,
      evidenceConfidence: metricScores.dataConfidence,
    },
  }
  const coveredEvent = narrative?.incident ?? detail?.riskStatement ?? record.summary
  const coveredLoss = narrative?.damage ?? detail?.primaryLoss ?? record.gap
  const existingInsurance = narrative?.existingInsurance ?? '기존 보험의 보장 범위와 책임 주체를 대조해야 함'
  const underwritingInputs = narrative?.underwriting
    ? [narrative.underwriting, record.nextAction]
    : [record.nextAction, '사고 이력·위험관리 수준·책임 주체 확인']
  const pricingInputs = narrative?.evidenceNeeded
    ? [narrative.evidenceNeeded, '사고 빈도·심도·집적 손해 자료 확인']
    : ['사고 빈도·심도 자료 확인', '누적 손해와 보장 한도 산정 자료 확인']
  const outOfScope = [
    '공식 약관·법률 검토 없이 확정한 보장 또는 보험금 산정',
    '원문에서 확인되지 않은 손해 유형과 금액',
    ...(narrative?.questions ?? []).slice(0, 1),
  ]
  const derived: ArticleSourceRecord['derived'] = {
    title: record.title,
    clusterKey: record.id,
    category: record.categories[0] ?? 'corporate',
    summary: record.summary,
    event: coveredEvent,
    changeType: record.gap,
    affectedTargets: targets,
    damageTypes: damages,
    industries: record.tags,
    facts,
    metrics: Object.entries(metricScores).map(([label, value]) => ({ label, value: `${value.toFixed(1)} / 5`, sourceHint: '큐레이션 위험 지표' })),
    keywords,
    evidenceQuotes: evidence.map((item) => item.excerpt).filter(Boolean),
    coverageGap: record.gap,
    nextAction: record.nextAction,
    uncertainty: [
      '정적 큐레이션 후보의 손해·청구·약관 원문은 실무자 확인이 필요함',
      ...(detail?.evidence ?? []).map((item) => item.uncertainty).filter(Boolean),
    ].slice(0, 3),
    counterEvidence: (detail?.evidence ?? []).map((item) => item.counterpoint).filter(Boolean).slice(0, 2),
    productConcept: {
      workingName: `${record.title} 보완보험 검토안`,
      form: '기존 담보와의 중복을 대조한 조건부 보완형 구조',
      policyholder: narrative?.stakeholders?.[1]?.[0] ?? targets[0],
      insured: detail?.exposedParty ?? targets[0],
      coveredEvent,
      coveredLoss,
      existingInsuranceRelationship: existingInsurance,
      underwritingInputs,
      pricingInputs,
      outOfScope,
    },
    confidence: confidence(record.dataConfidence),
    metricScores,
    trend: [metricScores.demand, metricScores.accumulation, metricScores.dataConfidence],
    publishedAt: AS_OF,
    isRegulatory: record.categories.includes('legal'),
    disposition: 'candidate',
    recommendation: calculateRiskExplorationScore(record.metricScores) >= 3.25 ? 'review' : 'hold',
  }
  return {
    id: `curated-${record.id}`,
    title: record.title,
    summary: record.summary,
    source: '위험 후보 큐레이션 데이터',
    publishedAt: AS_OF,
    collectedAt: AS_OF,
    originalUrl: undefined,
    content: facts.join('\n'),
    text: `${record.title}\n${record.summary}\n${facts.join('\n')}`,
    fileName: `curated-risk-${record.id}`,
    sourcePath: 'src/domain/risk/riskExplorationDemo.ts',
    fileUrl: '',
    format: 'pdf',
    contentStatus: 'curated',
    analysisStatus: 'curated',
    verificationStatus: 'review-required',
    contentProfile,
    derived,
  }
}

export function createCuratedReportEntry(record: RiskExplorationRecord): ArticleDerivedReportEntry {
  const article = makeCuratedArticle(record)
  const entry = createArticleDerivedReportData(article, [article], getRiskDetailNarrative(record.detailRiskId))
  const reportId = `RPT-RISK-${record.detailRiskId}`
  const evidence = entry.report.evidence.map((item) => ({
    ...item,
    source: '위험 후보 큐레이션 데이터',
    isMockData: true,
    originalAvailable: false,
  }))
  return {
    riskData: {
      ...entry.riskData,
      schemaVersion: 'curated-risk-v1',
      meta: {
        ...entry.riskData.meta,
        riskId: record.detailRiskId,
        analysisMode: 'curated-risk-v1',
        dataStatus: '큐레이션 후보 · 실무자 추가 확인 필요',
        isMockData: true,
        badges: ['큐레이션 후보', '실무자 검토용'],
        inputEvidenceCount: evidence.length,
      },
      risk: { ...entry.riskData.risk, categories: record.categories },
      demoContext: { ...entry.riskData.demoContext, mode: 'curated-risk', source: '위험 후보 큐레이션 데이터' },
      evidenceItems: evidence,
      disclaimer: '위험 후보 큐레이션과 기존 화면 사례를 연결한 실무자 검토용 데이터입니다. 공식 약관·보험료·가입 가능 여부를 확정하지 않습니다.',
    },
    report: {
      ...entry.report,
      meta: {
        ...entry.report.meta,
        reportId,
        sourceRiskId: record.detailRiskId,
        analysisMode: 'curated-risk-v1',
        aiStatus: '큐레이션 후보 구조화',
        dataStatus: '실무자 검토용 · 추가 확인 필요',
        isMockData: true,
        badges: ['큐레이션 후보', '실무자 검토용'],
        disclaimer: '위험 후보 큐레이션과 기존 화면 사례를 연결한 초안입니다. 공식 약관·보험료·가입 가능 여부를 확정하지 않습니다.',
      },
      evidence,
    },
  }
}

export function createCuratedReportEntries(records: RiskExplorationRecord[] = riskExplorationRecords) {
  return records
    .filter((record) => record.detailRiskId !== 'ev-battery-fire')
    .map(createCuratedReportEntry)
}
