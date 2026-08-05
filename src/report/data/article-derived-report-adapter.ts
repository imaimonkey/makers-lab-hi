import { groupArticleSourceRecords, selectArticleGroupRepresentative, type ArticleSourceRecord } from '../../features/risk-dashboard/articleSourceData'
import { createDeveloperReportData } from './developer-report-adapter'
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

const resultText = (article: ArticleSourceRecord) => {
  const { derived } = article
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
        existingCoverageMap: [{ id: 'current-coverage', damage: derived.damageTypes[0] ?? '주요 손해', coverageName: '기존 보장과의 관계 확인 필요', possibleCoverage: '부분 연결 가능성', remainingGap: derived.coverageGap, status: '확인 필요', evidenceIds: fallbackEvidenceIds }],
        keyCoverageGaps: [{ id: 'gap-1', title: '본문 기반 보장 공백 가설', description: derived.coverageGap, importance: 'high', evidenceIds: fallbackEvidenceIds }],
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
        workingName: `${derived.title} 대응 보장 구조`,
        recommendedForm: '조건부 특약·서비스 결합 구조 검토',
        alternativeForms: ['기업성 패키지 검토', '위험관리 서비스 연계'],
        expectedPolicyholder: derived.affectedTargets.slice(0, 3),
        expectedInsured: derived.affectedTargets.join(' · '),
        coveredObject: derived.industries.join(' · '),
        coveredEvent: derived.event,
        coveredLoss: derived.damageTypes.join(' · '),
        existingInsuranceRelationship: '기존 상품·약관과의 중복 및 공백 확인 필요',
        settlementDirection: '손해 정의와 입증 기준을 먼저 설계',
        policyPeriodDirection: '위험 노출 기간과 사고 통지 기준 확인',
        coverageLimitDirection: '손해자료 확보 후 별도 산정',
        deductibleDirection: '위험 통제 수준과 손해 빈도 확인 후 검토',
        underwritingCandidates: derived.affectedTargets,
        outOfScopeCandidates: ['공식 약관 확정', '보험료 확정', '가입 가능 여부 확정'],
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
          criteria: [{ id: 'criterion-1', category: 'data', order: 1, title: '본문 근거·손해 연결성', gateGroup: 'supplementary_execution', question: '본문 지표를 실제 인수·손해자료로 검증할 수 있는가?', description: derived.coverageGap, status: 'additional_check', evidenceStatus: 'reviewer_confirmation_required', sourceSections: ['article 본문'], requiresReviewerInput: true, summary: derived.summary, rationale: derived.nextAction, confirmedFacts: derived.facts.join(' '), evidence: [], confidence: derived.confidence.level, missingInformation: derived.uncertainty, nextActions: [], isBlocking: true }],
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
        assessmentCriteria: [{ id: 'wording-1', question: '사고와 손해를 객관적으로 정의할 수 있는가?', status: '확인 필요', note: derived.coverageGap }],
        structureOptions: [{ id: 'structure-1', title: '조건부 특약 구조', summary: derived.event }],
        selectedDraftType: '본문 기반 검토용 초안',
        coverageDraft: `${derived.event}로 인해 발생한 ${derived.damageTypes.join(', ')} 손해를 검토 대상으로 정의합니다. 구체적인 보장 범위와 지급 요건은 확인 필요합니다.`,
        alternativeLiabilityDraft: '책임 주체와 손해 입증 기준은 공식 자료 및 법무 검토 후 확정합니다.',
        definitions: derived.keywords.slice(0, 5).map((term, index) => ({ id: `definition-${index + 1}`, term, draftDefinition: `${term}의 의미와 적용 범위는 원문·전문가 확인 필요`, status: '확인 필요', evidenceIds: fallbackEvidenceIds })),
        paymentConditions: [{ id: 'payment-1', text: '사고 발생과 손해의 인과관계를 확인할 수 있어야 함', verification: '내부 손해자료·전문가 검토 필요', evidenceIds: fallbackEvidenceIds }],
        exclusionCandidates: [{ id: 'exclusion-1', text: '본문만으로 확인되지 않은 위험 범위', reason: '근거 부족', status: '확인 필요', evidenceIds: fallbackEvidenceIds }],
        ambiguities: derived.uncertainty.map((item, index) => ({ id: `ambiguity-${index + 1}`, issue: item, question: '공식 원문과 내부 자료로 확인 가능한가?', owner: '신규위험 탐색·법무', evidenceIds: fallbackEvidenceIds })),
        referenceDocuments: [{ id: `${article.id}-source`, name: article.fileName, role: '원문 기반 위험 신호·지표 추출', usedFor: '문서 본문 기반 분석', includedInAiInput: false, badge: '문서 원문' }],
      },
    },
    evidence: {
      evidence: derived.evidenceQuotes.map((quote, index) => ({ id: evidenceId(article, index), type: '문서 원문', title: `${article.title} · 본문 근거 ${index + 1}`, source: article.source ?? '문서 원문', referenceDate: article.publishedAt ?? article.collectedAt ?? null, usedFor: ['본문 기반 위험 신호', '정량 지표·보장 공백 분석'], reliability: '원문 근거 연결', isMockData: false, originalAvailable: true, quote })),
      missingResearch: [...derived.uncertainty, ...derived.counterEvidence].map((reason, index) => ({ id: `${article.id}-follow-up-${index + 1}`, priority: index === 0 ? 'high' : 'medium', topic: '추가 검증 필요', reason, responsibleTeam: derived.isRegulatory ? '법무·준법' : '신규위험 탐색', status: 'pending', acquisitionType: '사내 자료 필요', requiredMaterials: ['최신 공식 원문', '내부 손해·인수 자료'] })),
    },
  }
}

export function createArticleDerivedReportData(article: ArticleSourceRecord, relatedArticles: ArticleSourceRecord[] = [article]): ArticleDerivedReportEntry {
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
  const evidenceCount = article.derived.evidenceQuotes.length + relatedEvidence.length || 1
  const report: ReportResult = {
    ...base.report,
    meta: {
      ...base.report.meta,
      analysisMode: 'article-derived-v1',
      reportId: `article-report-${article.id}`,
      sourceRiskId: `developer-${article.id}`,
      aiStatus: '원문 기반 분석',
      dataStatus: '원문 기반 분석',
      isMockData: false,
      evidenceCount,
      relatedDocumentCount: relatedArticles.length,
      relatedDocumentTitles: relatedArticles.map((relatedArticle) => relatedArticle.title),
      badges: ['원문 기반 분석', '문서 근거'],
      disclaimer: '문서 본문을 구조화한 분석 결과이며 공식 약관·보험료·가입 가능 여부를 확정하지 않습니다.',
    },
    evidence: [...base.report.evidence.map((item) => ({ ...item, reliability: '원문 근거 연결' })), ...relatedEvidence],
  }
  const riskData: RiskSourceData = {
    ...base.riskData,
    schemaVersion: 'article-derived-v1',
    meta: { ...base.riskData.meta, analysisMode: 'article-derived-v1', dataStatus: '원문 기반 분석', isMockData: false, inputEvidenceCount: evidenceCount, badges: ['원문 기반 분석', '문서 근거'], reportId: `article-report-${article.id}` },
    risk: { ...base.riskData.risk, categories: [article.derived.category] },
    demoContext: { ...base.riskData.demoContext, mode: 'article-derived', source: article.source ?? '문서 원문', fileName: article.fileName },
    selectionPreview: { ...base.riskData.selectionPreview, oneLineReason: article.derived.summary },
    disclaimer: '문서 원문 본문 기반 분석 데이터입니다.',
  }
  return { riskData, report }
}

export function createArticleDerivedReportEntries(articles: ArticleSourceRecord[]): ArticleDerivedReportEntry[] {
  return groupArticleSourceRecords(articles).map((group) => {
    const representative = selectArticleGroupRepresentative(group)
    return createArticleDerivedReportData(representative, group)
  })
}
