import { groupArticleSourceRecords, isArticleReportCandidate, selectArticleGroupRepresentative, type ArticleSourceRecord } from '../../features/risk-dashboard/articleSourceData'
import { COMMERCIALIZATION_GATE_GROUP_BY_ID } from '../services/commercialization-assessment'
import { createDeveloperReportData } from './developer-report-adapter'
import { calculateProductizationScores } from '../../features/risk-catalog/productizationScore'
import type { RiskDetailNarrative } from '../../domain/risk/riskDetailContent'
import { createArticleReportDepthContext, deepenReport } from './report-depth-adapter'
import type { ReportResult, RiskSourceData } from '../types'

export type ArticleDerivedReportEntry = {
  riskData: RiskSourceData
  report: ReportResult
}

const evidenceId = (article: ArticleSourceRecord, index: number) =>
  `${article.id}-content-evidence-${index + 1}`

const displayDecision = (recommendation: ArticleSourceRecord['derived']['recommendation']) => {
  if (recommendation === 'review') return '우선 검토 · 원문 기반'
  if (recommendation === 'hold') return '보류 · 원문 기반'
  return '관찰 지속 · 원문 기반'
}

const ARTICLE_CRITERIA: Array<[string, string]> = [
  ['actual_market_demand', '실제 시장 수요'],
  ['risk_pooling', '위험 분산 가능성'],
  ['fortuity', '우연성'],
  ['insurable_interest', '피보험이익'],
  ['moral_hazard_control', '고의·도덕적 해이 통제'],
  ['gambling_like_structure', '사행성 배제·실손보상 원칙'],
  ['loss_verifiability', '손해 확인·산정 가능성'],
  ['pml_accumulation', '최대가능손해(PML)'],
  ['liability_clarity', '책임주체 명확성'],
  ['wording_clarity', '약관·보장조건 명확성'],
  ['pricing_data_readiness', '위험 데이터 확보 가능성'],
  ['coverage_gap', '보장 공백·중복 여부'],
]

const articleCriterionCopy = (article: ArticleSourceRecord, id: string) => {
  const { derived } = article
  const targets = derived.affectedTargets.slice(0, 3).join(' · ')
  const damages = derived.damageTypes.slice(0, 3).join(' · ')
  const facts = derived.facts.slice(0, 3).join(' ')
  const metrics = derived.metrics.slice(0, 3).map((metric) => `${metric.label}: ${metric.value}`).join(' · ')
  const copy: Record<string, { summary: string; rationale: string }> = {
    actual_market_demand: { summary: derived.summary, rationale: `${targets}를 중심으로 문서에서 확인된 수요·성장 신호를 연결했습니다. ${facts}` },
    risk_pooling: { summary: `${targets}의 노출을 여러 계약·지역·시설 단위로 나누어 관리할 수 있는지 검토합니다.`, rationale: `문서에서 제시한 영향 대상과 노출 범위를 위험 집단으로 나눌 수 있는지 확인합니다. ${targets}` },
    fortuity: { summary: derived.event, rationale: `사고 발생 여부와 시점이 사전에 확정되는지, 문서의 사건 구조가 우연한 손해인지 검토합니다. ${derived.changeType}` },
    insurable_interest: { summary: `${targets}의 경제적 손해와 보험금 수령 주체의 연결을 검토합니다.`, rationale: `피해 대상과 책임 후보를 보험목적·손해 부담 주체와 연결합니다. ${targets}` },
    moral_hazard_control: { summary: derived.uncertainty[0] ?? '사고 원인·손해 입증과 고의·과다청구 통제 기준을 검토합니다.', rationale: `문서의 손해 유형을 객관적 자료로 확인하고 고의·과다청구 가능성을 분리해야 합니다. ${damages}` },
    gambling_like_structure: { summary: `${damages}처럼 실제 손해가 확인되는 위험을 기준으로 보상 구조를 검토합니다.`, rationale: `실제 경제적 손해와 위험 사건을 연결해 정액·투자성 구조가 아닌지 확인합니다. ${derived.event}` },
    loss_verifiability: { summary: `${damages}의 발생 여부와 손해 규모를 객관적으로 확인할 수 있는지 검토합니다.`, rationale: `문서의 사실·지표를 사고 및 손해자료와 연결할 수 있는지 확인합니다. ${facts}` },
    pml_accumulation: { summary: `${damages}가 한 사고 또는 다수 목적물에 동시에 발생할 때의 최대 손해를 검토합니다.`, rationale: `노출 대상과 손해 유형을 기준으로 사고당 손해와 누적손해를 분리합니다. ${targets} · ${damages}` },
    liability_clarity: { summary: `${targets} 사이의 책임 주체와 책임 분담 기준을 구분합니다.`, rationale: '사고 원인, 운영, 손해 보유 주체별 역할과 책임을 나누어 확인합니다.' },
    wording_clarity: { summary: `${derived.event}와 ${damages}를 보장사고·보상손해·면책으로 구분할 수 있는지 검토합니다.`, rationale: '문서의 위험 표현을 사고 정의와 지급요건으로 변환하고 불명확한 범위를 기록합니다.' },
    pricing_data_readiness: { summary: metrics || '문서에서 확인된 정량 지표와 손해자료 연결 수준을 검토합니다.', rationale: `문서의 지표를 사고 빈도·손해액·노출량 자료로 전환할 수 있는지 확인합니다. ${metrics}` },
    coverage_gap: { summary: derived.coverageGap, rationale: `기존 보장과 문서에서 확인된 손해 유형 사이의 중복·공백을 구분합니다. ${damages}` },
  }
  return copy[id] ?? { summary: derived.summary, rationale: facts }
}

const articleCriteria = (article: ArticleSourceRecord, evidenceIds: string[]) => ARTICLE_CRITERIA.map(([id, title], index) => {
  const copy = articleCriterionCopy(article, id)
  return {
    id,
    category: COMMERCIALIZATION_GATE_GROUP_BY_ID[id] === 'insurance_gate' ? 'insurability' : COMMERCIALIZATION_GATE_GROUP_BY_ID[id] === 'productization_gate' ? 'coverage' : 'execution',
    order: index + 1,
    title,
    gateGroup: COMMERCIALIZATION_GATE_GROUP_BY_ID[id] ?? 'supplementary_execution',
    question: `${title} 기준을 문서 근거와 실제 운영자료로 확인할 수 있는가?`,
    description: copy.summary,
    aiDecision: 'unfulfilled',
    reviewStatus: 'pending',
    status: 'additional_check',
    evidenceStatus: 'reviewer_confirmation_required',
    sourceSections: ['article', 'evidence'],
    requiresReviewerInput: true,
    summary: copy.summary,
    rationale: copy.rationale,
    confirmedFacts: article.derived.facts.join(' '),
    evidence: [],
    evidenceIds,
    confidence: article.derived.confidence.level,
    missingInformation: article.derived.uncertainty.slice(0, 3),
    nextActions: [{ id: `${id}-next`, text: article.derived.nextAction, owner: article.derived.isRegulatory ? '법무·준법' : '상품개발·리스크관리', completed: false }],
    isBlocking: false,
    analysisDetail: {
      aiSummary: copy.summary,
      rationale: [copy.rationale],
      materials: article.derived.facts.slice(0, 3),
      assumptions: ['문서에 포함된 사실·지표를 상품화 검토용 근거로 연결'],
      limitations: article.derived.uncertainty.slice(0, 3),
      reviewerChecks: [article.derived.nextAction],
    },
  }
})

const resultText = (article: ArticleSourceRecord) => {
  const { derived } = article
  const concept = derived.productConcept
  const sourceEvidenceIds = derived.evidenceQuotes.map((_, index) => evidenceId(article, index))
  const fallbackEvidenceIds = sourceEvidenceIds.length ? sourceEvidenceIds : [`${article.id}-source`]
  const metricSummary = derived.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(' · ')

  return {
    summary: {
      aiSummary: {
        decisionLabel: displayDecision(derived.recommendation),
        primaryConclusionReason: `${derived.summary} 문서에서 확인된 지표와 위험 신호를 연결한 원문 기반 분석 결과입니다.`,
        cards: [
          {
            id: 'event',
            label: '핵심 위험 이벤트',
            result: derived.event,
            status: '조건부 검토',
            shortReason: derived.changeType,
            detail: derived.facts.slice(0, 2).join(' '),
            evidenceIds: fallbackEvidenceIds,
            caveat: derived.uncertainty[0] ?? '원문 외부 검증이 필요합니다.',
          },
          {
            id: 'metrics',
            label: '본문 기반 정량 지표',
            result: metricSummary || '본문에서 수치 지표를 추가 확인해야 합니다.',
            status: '확인 필요',
            shortReason: 'article 본문에서 추출한 표시용 지표',
            detail: derived.facts.join(' '),
            evidenceIds: fallbackEvidenceIds,
            caveat: '보험료·보장한도·가입 가능 여부를 확정하지 않습니다.',
          },
          {
            id: 'gap',
            label: '보장 공백 가설',
            result: derived.coverageGap,
            status: '검토 필요',
            shortReason: derived.nextAction,
            detail: derived.damageTypes.join(' · '),
            evidenceIds: fallbackEvidenceIds,
            caveat: '기존 약관과 손해자료를 대조해야 합니다.',
          },
        ],
        overallOpinion: `현재 판단은 ${derived.confidence.level === 'high' ? '문서 근거가 비교적 충분한' : '문서 범위가 제한된'} 원문 기반 분석입니다. ${derived.counterEvidence[0] ?? ''}`,
        recommendedNextAction: derived.nextAction,
        nextActions: [
          {
            id: 'source-validation',
            action: derived.nextAction,
            reason: derived.uncertainty[0] ?? '원문과 내부 자료의 교차 검증이 필요합니다.',
            evaluationIds: [],
            evidenceIds: fallbackEvidenceIds,
            responsibleTeams: ['신규위험 탐색', '상품개발', derived.isRegulatory ? '법무·준법' : '리스크관리'],
          },
        ],
        additionalConfirmations: derived.uncertainty.map((item, index) => ({
          id: `confirmation-${index + 1}`,
          title: '추가 확인 필요',
          whatToConfirm: item,
          whyNeeded: '본문 기반 구조화 결과만으로 최종 판단할 수 없기 때문입니다.',
          requiredMaterials: ['공식 원문 또는 최신 발행본', '내부 손해·인수 자료'],
          responsibleTeams: [derived.isRegulatory ? '법무·준법' : '신규위험 탐색'],
          evidenceIds: fallbackEvidenceIds,
        })),
      },
    },
    gap: {
      riskGapSummary: {
        definition: derived.coverageGap,
        whyNow: [derived.event, derived.changeType],
        damageTypes: derived.damageTypes.map((damage, index) => ({ id: `damage-${index + 1}`, name: damage, title: damage, summary: damage })),
        affectedParties: derived.affectedTargets,
        existingCoverageMap: derived.damageTypes.map((damage, index) => ({ id: `current-coverage-${index + 1}`, damage, coverageName: index === 0 ? '기존 재산·배상책임·기업휴지보험과 대조' : '관련 기존 보험·면책 조항 확인 필요', possibleCoverage: '부분 연결 가능성', remainingGap: derived.coverageGap, status: '확인 필요', evidenceIds: fallbackEvidenceIds })),
        keyCoverageGaps: [{ id: 'gap-1', title: '원문 기반 보장 공백 가설', description: derived.coverageGap, importance: 'high', evidenceIds: fallbackEvidenceIds }, { id: 'gap-2', title: '손해·책임 연결 공백', description: concept.existingInsuranceRelationship, importance: 'medium', evidenceIds: fallbackEvidenceIds }],
      },
    },
    structure: {
      targetSuitability: {
        recommendation: '조건부 검토',
        recommendationLabel: '원문 기반 분석 · 보충 자료 연결',
        options: derived.affectedTargets.slice(0, 3).map((target, index) => ({ id: `target-${index + 1}`, target, suitability: '검토 대상', rank: index + 1, reason: derived.event, limitation: derived.uncertainty[0] ?? '노출량과 손해자료 확인 필요', evidenceIds: fallbackEvidenceIds })),
        roleStructure: [{ id: 'role-1', role: '위험 보유자·운영 주체', candidates: derived.affectedTargets, status: '확인 필요', question: '사고 책임과 데이터 보유 주체는 누구인가?', evidenceIds: fallbackEvidenceIds }],
        caution: '대상 적합성은 본문 기반 가설이며 가입 가능 여부를 의미하지 않습니다.',
      },
      productProposal: {
        status: '초안 검토 · 원문 기반',
        workingName: concept.workingName,
        recommendedForm: concept.form,
        alternativeForms: ['기업성 패키지와 위험관리 서비스 결합 검토', '재보험·ILS 또는 공공기금 연계 가능성 확인'],
        expectedPolicyholder: [concept.policyholder],
        expectedInsured: [concept.insured],
        coveredObject: [concept.coveredEvent],
        coveredEvent: concept.coveredEvent,
        coveredLoss: concept.coveredLoss,
        existingInsuranceRelationship: concept.existingInsuranceRelationship,
        settlementDirection: '사고 정의·손해 입증·책임 분담을 먼저 설계한 뒤 실손 보상 범위를 검토',
        policyPeriodDirection: '건설·운영·사고 대응 단계별 보장 개시·종료와 사고 통지 기준 확인',
        coverageLimitDirection: `PML·복구기간·누적노출을 반영해 별도 산정 · ${concept.pricingInputs.slice(0, 2).join(' · ')}`,
        deductibleDirection: `위험 통제 수준과 손해 빈도 확인 후 검토 · ${concept.underwritingInputs.slice(0, 2).join(' · ')}`,
        underwritingCandidates: concept.underwritingInputs,
        outOfScopeCandidates: concept.outOfScope,
        recommendationReason: derived.nextAction,
        unresolvedItems: [...derived.uncertainty, ...derived.counterEvidence],
        evidenceIds: fallbackEvidenceIds,
      },
    },
    assessment: {
      productFeasibility: {
        overallStatus: 'additional_check_required',
        overallAssessment: {
          conclusion: '본문 기반 후보 구조는 확인되지만 추가 자료 검증이 필요합니다.',
          strengths: derived.facts.slice(0, 3),
          improvements: derived.uncertainty,
          entryConditions: [derived.nextAction, '공식 원문·내부 손해자료 교차 검증'],
        },
        items: [
          { id: 'demand', criterion: '수요·위험 신호', status: 'additional_check', displayStatus: '추가 확인 필요', judgment: derived.summary, evidenceIds: fallbackEvidenceIds, additionalChecks: derived.uncertainty },
          { id: 'data', criterion: '데이터 신뢰도', status: derived.confidence.level === 'high' ? 'conditional' : 'additional_check', displayStatus: derived.confidence.level === 'high' ? '조건부' : '추가 확인 필요', judgment: derived.confidence.reason, evidenceIds: fallbackEvidenceIds, additionalChecks: ['최신성·대표성·국내 적용성 확인'] },
        ],
        interpretation: '이 화면의 평가는 문서 본문을 읽어 연결한 분석 지표이며 실제 상품 승인 판단을 대신하지 않습니다.',
        assessment: {
          overallStatus: 'additional_check_required',
          overallSummary: '본문 기반 분석 결과',
          overallReason: derived.coverageGap,
          topStrengths: derived.facts.slice(0, 3),
          topRisks: derived.uncertainty,
          priorityActions: [derived.nextAction],
          aiProductJudgment: 'additional_check_required',
          aiProductJudgmentReason: '근거와 불확실성을 확인한 뒤 사람의 검토가 필요합니다.',
          criteria: articleCriteria(article, fallbackEvidenceIds),
          discoveryContext: { discoveryType: derived.isRegulatory ? 'regulation' : 'research', sourceName: article.source ?? '문서 원문', sourceSummary: derived.summary },
          externalConstraints: [],
        },
      },
    },
    wording: {
      wordingFeasibility: {
        status: 'additional_check_required',
        label: '약관 문구 검토 · 원문 기반',
        disclaimer: '본문 기반 구조화 초안이며 실제 약관·보장·면책 문구가 아닙니다.',
        possibleReasons: ['위험 이벤트와 손해 유형은 본문에서 확인됨'],
        improvementReasons: [...derived.uncertainty, '보상 요건·면책·입증 기준 추가 검토'],
        assessmentCriteria: [
          { id: 'wording-1', question: '사고·발동 요건을 객관적으로 정의할 수 있는가?', status: '확인 필요', note: concept.coveredEvent },
          { id: 'wording-2', question: '보상 손해와 기존 보장의 중복을 구분할 수 있는가?', status: '확인 필요', note: concept.coveredLoss },
          { id: 'wording-3', question: '책임 주체와 손해 입증 자료를 특정할 수 있는가?', status: '확인 필요', note: concept.existingInsuranceRelationship },
          { id: 'wording-4', question: '면책·한도·누적손해 기준을 명확히 작성할 수 있는가?', status: '확인 필요', note: concept.outOfScope.join(' · ') },
        ],
        structureOptions: [{ id: 'structure-1', title: concept.form, summary: concept.coveredEvent }, { id: 'structure-2', title: '위험관리 서비스 결합 구조', summary: concept.underwritingInputs.join(' · ') }],
        selectedDraftType: '본문 기반 검토용 초안',
        coverageDraft: `${concept.coveredEvent.replace(/[.!?。！？]+$/u, '')}로 발생한 ${concept.coveredLoss}를 검토 대상 손해로 정의합니다. 구체적인 보장 범위·면책·지급 요건은 원문과 내부 손해·약관 자료 확인 후 확정합니다.`,
        alternativeLiabilityDraft: '책임 주체와 손해 입증 기준은 공식 자료 및 법무 검토 후 확정합니다.',
        definitions: derived.keywords.slice(0, 5).map((term, index) => ({ id: `definition-${index + 1}`, term, draftDefinition: `${term}의 의미와 적용 범위는 원문·전문가 확인 필요`, status: '확인 필요', evidenceIds: fallbackEvidenceIds })),
        paymentConditions: [{ id: 'payment-1', text: '사고 발생과 손해의 인과관계를 확인할 수 있어야 함', verification: '내부 손해자료·전문가 검토 필요', evidenceIds: fallbackEvidenceIds }, { id: 'payment-2', text: '실제 손해액·복구비·영업중단 기간을 객관적 자료로 확인해야 함', verification: concept.pricingInputs.join(' · '), evidenceIds: fallbackEvidenceIds }],
        exclusionCandidates: concept.outOfScope.map((item, index) => ({ id: `exclusion-${index + 1}`, text: item, reason: '현재 원문·내부자료만으로 확정 불가', status: '확인 필요', evidenceIds: fallbackEvidenceIds })),
        ambiguities: derived.uncertainty.map((item, index) => ({ id: `ambiguity-${index + 1}`, issue: item, question: '공식 원문과 내부 자료로 확인 가능한가?', owner: '신규위험 탐색·법무', evidenceIds: fallbackEvidenceIds })),
        referenceDocuments: [{ id: `${article.id}-source`, name: `${article.source ?? '문서 원문'} · ${article.title}`, role: '원문 기반 위험 신호·지표 추출', usedFor: '문서 본문 기반 분석', includedInAiInput: false, badge: '문서 원문', sourcePath: article.sourcePath }],
      },
    },
    evidence: {
      evidence: derived.evidenceQuotes.map((quote, index) => ({ id: evidenceId(article, index), type: '문서 원문', title: `${article.title} · 본문 근거 ${index + 1}`, source: article.source ?? '문서 원문', referenceDate: article.publishedAt ?? article.collectedAt ?? null, usedFor: ['본문 기반 위험 신호', '정량 지표·보장 공백 분석'], reliability: '원문 근거 연결', isMockData: false, originalAvailable: true, quote })),
      missingResearch: [...derived.uncertainty, ...derived.counterEvidence].map((reason, index) => ({ id: `${article.id}-follow-up-${index + 1}`, priority: index === 0 ? 'high' : 'medium', topic: '추가 검증 필요', reason, responsibleTeam: derived.isRegulatory ? '법무·준법' : '신규위험 탐색', status: 'pending', acquisitionType: '사내 자료 필요', requiredMaterials: ['최신 공식 원문', '내부 손해·인수 자료'] })),
    },
  }
}

export function createArticleDerivedReportData(article: ArticleSourceRecord, relatedArticles: ArticleSourceRecord[] = [article], narrative?: RiskDetailNarrative): ArticleDerivedReportEntry {
  const generatedAt = article.collectedAt ?? new Date().toISOString()
  const result = resultText(article)
  const base = createDeveloperReportData(article, Object.fromEntries(Object.entries(result).map(([key, value]) => [key, { text: JSON.stringify(value), generatedAt }])))
  const relatedEvidence = relatedArticles.slice(1).flatMap((relatedArticle) =>
    (relatedArticle.derived.evidenceQuotes.length ? relatedArticle.derived.evidenceQuotes : [relatedArticle.derived.summary])
      .slice(0, 3)
      .map((quote, index) => ({
        id: `${relatedArticle.id}-group-evidence-${index + 1}`,
        type: relatedArticle.derived.isRegulatory ? '법령 원문' : '문서 원문',
        title: `${relatedArticle.title} 연결 근거 ${index + 1}`,
        source: relatedArticle.source ?? '문서 원문',
        referenceDate: relatedArticle.publishedAt ?? relatedArticle.collectedAt ?? null,
        usedFor: ['위험 후보 분류', '상품화 검토 근거'],
        reliability: '원문 근거 연결',
        isMockData: false,
        originalAvailable: true,
        quote,
      })),
  )
  const reportEvidence = [...base.report.evidence.map((item) => ({ ...item, reliability: '원문 근거 연결' })), ...relatedEvidence]
  const depthContext = createArticleReportDepthContext(article, narrative)
  const reportWithDepth = deepenReport({ ...base.report, evidence: reportEvidence }, depthContext)
  const report: ReportResult = {
    ...reportWithDepth,
    meta: {
      ...reportWithDepth.meta,
      analysisMode: 'article-derived-v1',
      reportId: `article-report-${article.id}`,
      sourceRiskId: `developer-${article.id}`,
      aiStatus: '원문 기반 분석',
      dataStatus: '원문 기반 분석',
      isMockData: false,
      evidenceCount: reportWithDepth.evidence.length,
      relatedDocumentCount: relatedArticles.length,
      relatedDocumentTitles: relatedArticles.map((relatedArticle) => relatedArticle.title),
      articleTopic: article.contentProfile.topic,
      marketScore: calculateProductizationScores(article.derived.metricScores).market,
      pmlScore: calculateProductizationScores(article.derived.metricScores).pml,
      productizationScore: calculateProductizationScores(article.derived.metricScores).total,
      badges: ['원문 기반 분석', '문서 근거'],
      disclaimer: '문서 본문을 구조화한 분석 결과이며 공식 약관·보험료·가입 가능 여부를 확정하지 않습니다.',
    },
    evidence: reportWithDepth.evidence,
  }
  const riskData: RiskSourceData = {
    ...base.riskData,
    schemaVersion: 'article-derived-v1',
    meta: { ...base.riskData.meta, analysisMode: 'article-derived-v1', dataStatus: '원문 기반 분석', isMockData: false, inputEvidenceCount: report.evidence.length, badges: ['원문 기반 분석', '문서 근거'], reportId: `article-report-${article.id}` },
    risk: { ...base.riskData.risk, categories: [article.derived.category] },
    demoContext: {
      ...base.riskData.demoContext,
      mode: 'article-derived',
      source: article.source ?? '문서 원문',
      sourceTitle: article.title,
      sourcePath: article.sourcePath,
      sourceAnalysis: {
        disposition: article.derived.disposition,
        recommendation: article.derived.recommendation,
        confidenceLevel: article.derived.confidence.level,
        evidenceQuoteCount: article.derived.evidenceQuotes.length,
        metricCount: article.derived.metrics.length,
        scores: article.contentProfile.scores,
        metricScores: article.derived.metricScores,
      },
    },
    selectionPreview: { ...base.riskData.selectionPreview, oneLineReason: article.derived.summary },
    disclaimer: '문서 원문 본문 기반 분석 데이터입니다.',
  }
  return { riskData, report }
}

export function createArticleDerivedReportEntries(articles: ArticleSourceRecord[]): ArticleDerivedReportEntry[] {
  return groupArticleSourceRecords(articles.filter(isArticleReportCandidate)).map((group) => {
    const representative = selectArticleGroupRepresentative(group)
    return createArticleDerivedReportData(representative, group)
  })
}
