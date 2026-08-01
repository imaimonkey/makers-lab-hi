import type { ReportResult, RiskSourceData } from '../types'

type Article = { id: string; title: string; source?: string; fileName: string; collectedAt?: string; text: string }

function parse(text?: string): Record<string, unknown> {
  if (!text) return {}
  try {
    const value: unknown = JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/, ''))
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  } catch { return {} }
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function textValue(value: unknown, fallback = '확인 필요') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function listValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringList(value: unknown): string[] {
  return listValue(value).filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
}

function evidenceIdList(value: unknown): string[] {
  return stringList(value)
}

function normalizeSummaryCards(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `summary-${index + 1}`),
      label: textValue(source.label),
      result: textValue(source.result),
      status: textValue(source.status, '보완 필요'),
      shortReason: textValue(source.shortReason),
      detail: textValue(source.detail),
      evidenceIds: evidenceIdList(source.evidenceIds),
      caveat: textValue(source.caveat),
    }
  })
}

function normalizeNextActions(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `next-${index + 1}`),
      action: textValue(source.action),
      reason: textValue(source.reason),
      evaluationIds: evidenceIdList(source.evaluationIds),
      evidenceIds: evidenceIdList(source.evidenceIds),
      responsibleTeams: stringList(source.responsibleTeams),
    }
  })
}

function normalizeAdditionalConfirmations(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `confirmation-${index + 1}`),
      title: textValue(source.title),
      whatToConfirm: textValue(source.whatToConfirm),
      whyNeeded: textValue(source.whyNeeded),
      requiredMaterials: stringList(source.requiredMaterials),
      responsibleTeams: stringList(source.responsibleTeams),
      evidenceIds: evidenceIdList(source.evidenceIds),
    }
  })
}

function normalizeTargetSuitability(value: unknown) {
  const source = objectValue(value)
  return {
    ...source,
    recommendation: textValue(source.recommendation),
    recommendationLabel: textValue(source.recommendationLabel),
    options: listValue(source.options).map((item, index) => {
      const option = objectValue(item)
      return {
        ...option,
        id: textValue(option.id, `option-${index + 1}`),
        target: textValue(option.target),
        suitability: textValue(option.suitability),
        rank: typeof option.rank === 'number' ? option.rank : index + 1,
        reason: textValue(option.reason),
        limitation: textValue(option.limitation),
        evidenceIds: evidenceIdList(option.evidenceIds),
      }
    }),
    roleStructure: listValue(source.roleStructure).map((item, index) => {
      const role = objectValue(item)
      return {
        ...role,
        id: textValue(role.id, `role-${index + 1}`),
        role: textValue(role.role),
        candidates: stringList(role.candidates),
        status: textValue(role.status),
        question: textValue(role.question),
        evidenceIds: evidenceIdList(role.evidenceIds),
      }
    }),
    caution: textValue(source.caution),
  }
}

function normalizeCommercializationCriterion(value: unknown, index: number) {
  const source = objectValue(value)
  return {
    ...source,
    id: textValue(source.id, `criterion-${index + 1}`),
    category: textValue(source.category, 'data'),
    order: typeof source.order === 'number' ? source.order : index + 1,
    title: textValue(source.title),
    gateGroup: textValue(source.gateGroup, 'supplementary_execution'),
    question: textValue(source.question),
    description: textValue(source.description),
    status: textValue(source.status, 'additional_check'),
    evidenceStatus: textValue(source.evidenceStatus, 'reviewer_confirmation_required'),
    sourceSections: stringList(source.sourceSections),
    requiresReviewerInput: source.requiresReviewerInput === true,
    summary: textValue(source.summary),
    rationale: textValue(source.rationale),
    confirmedFacts: textValue(source.confirmedFacts),
    evidence: listValue(source.evidence).map((item, evidenceIndex) => {
      const evidence = objectValue(item)
      return {
        ...evidence,
        id: textValue(evidence.id, `criterion-${index + 1}-evidence-${evidenceIndex + 1}`),
        title: textValue(evidence.title),
        sourceType: textValue(evidence.sourceType),
        sourceName: textValue(evidence.sourceName),
        isMockData: false,
      }
    }),
    confidence: textValue(source.confidence, 'unknown'),
    missingInformation: stringList(source.missingInformation),
    nextActions: listValue(source.nextActions).map((item, actionIndex) => {
      const action = objectValue(item)
      return {
        ...action,
        id: textValue(action.id, `criterion-${index + 1}-action-${actionIndex + 1}`),
        text: textValue(action.text),
        owner: textValue(action.owner),
        dueDate: textValue(action.dueDate),
        priority: textValue(action.priority, 'medium'),
        completed: action.completed === true,
      }
    }),
    isBlocking: source.isBlocking === true,
  }
}

function normalizeCommercializationAssessment(value: unknown, overallStatus: string) {
  const source = objectValue(value)
  return {
    ...source,
    overallStatus: textValue(source.overallStatus, overallStatus),
    overallSummary: textValue(source.overallSummary),
    overallReason: textValue(source.overallReason),
    topStrengths: stringList(source.topStrengths),
    topRisks: stringList(source.topRisks),
    priorityActions: stringList(source.priorityActions),
    aiProductJudgment: textValue(source.aiProductJudgment, 'additional_check_required'),
    aiProductJudgmentReason: textValue(source.aiProductJudgmentReason),
    criteria: listValue(source.criteria).map(normalizeCommercializationCriterion),
    discoveryContext: objectValue(source.discoveryContext),
    externalConstraints: listValue(source.externalConstraints),
  }
}

function normalizeFeasibilityItems(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `feasibility-${index + 1}`),
      criterion: textValue(source.criterion),
      status: textValue(source.status, 'additional_check'),
      displayStatus: textValue(source.displayStatus),
      judgment: textValue(source.judgment),
      evidenceIds: evidenceIdList(source.evidenceIds),
      additionalChecks: stringList(source.additionalChecks),
    }
  })
}

function normalizeWordingList(value: unknown, fallbackPrefix: string) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return { ...source, id: textValue(source.id, `${fallbackPrefix}-${index + 1}`) }
  })
}

function normalizeCoverageRows(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `coverage-${index + 1}`),
      damage: textValue(source.damage),
      coverageName: textValue(source.coverageName),
      possibleCoverage: textValue(source.possibleCoverage),
      remainingGap: textValue(source.remainingGap),
      status: textValue(source.status),
      evidenceIds: evidenceIdList(source.evidenceIds),
    }
  })
}

function normalizeCoverageGaps(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `gap-${index + 1}`),
      title: textValue(source.title),
      description: textValue(source.description),
      importance: textValue(source.importance),
      evidenceIds: evidenceIdList(source.evidenceIds),
    }
  })
}

function normalizeWordingCriteria(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `wording-criterion-${index + 1}`),
      question: textValue(source.question),
      status: textValue(source.status),
      note: textValue(source.note),
    }
  })
}

function normalizeWordingDefinitions(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `definition-${index + 1}`),
      term: textValue(source.term),
      draftDefinition: textValue(source.draftDefinition),
      status: textValue(source.status),
      evidenceIds: evidenceIdList(source.evidenceIds),
    }
  })
}

function normalizeWordingConditions(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `payment-${index + 1}`),
      text: textValue(source.text),
      verification: textValue(source.verification),
      evidenceIds: evidenceIdList(source.evidenceIds),
    }
  })
}

function normalizeWordingExclusions(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `exclusion-${index + 1}`),
      text: textValue(source.text),
      reason: textValue(source.reason),
      status: textValue(source.status),
      evidenceIds: evidenceIdList(source.evidenceIds),
    }
  })
}

function normalizeWordingAmbiguities(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `ambiguity-${index + 1}`),
      issue: textValue(source.issue),
      question: textValue(source.question),
      owner: textValue(source.owner),
      evidenceIds: evidenceIdList(source.evidenceIds),
    }
  })
}

function normalizeReferenceDocuments(value: unknown) {
  return listValue(value).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, `document-${index + 1}`),
      name: textValue(source.name),
      role: textValue(source.role),
      usedFor: textValue(source.usedFor),
      includedInAiInput: source.includedInAiInput === true,
      badge: textValue(source.badge),
    }
  })
}

export function createDeveloperReportData(article: Article, results: Partial<Record<string, { text: string; generatedAt: string }>>) {
  const parsed = Object.fromEntries(Object.entries(results).map(([key, result]) => [key, parse(result?.text)]))
  const summary = objectValue(parsed.summary)
  const gap = objectValue(parsed.gap)
  const wording = objectValue(parsed.wording)
  const assessment = objectValue(parsed.assessment)
  const structure = objectValue(parsed.structure)
  const briefing = objectValue(parsed.briefing)
  const evidence = objectValue(parsed.evidence)
  const summaryData = objectValue(summary.aiSummary ?? summary)
  const gapData = objectValue(gap.riskGapSummary ?? gap)
  const wordingData = objectValue(wording.wordingFeasibility ?? wording)
  const assessmentData = objectValue(assessment.productFeasibility ?? assessment)
  const targetData = objectValue(structure.targetSuitability)
  const proposalData = objectValue(structure.productProposal ?? structure)
  const briefingUi = objectValue(briefing.ui)
  const briefingData = objectValue(briefingUi.briefing ?? briefing.briefing ?? briefing)
  const evidenceItem = { id: article.id + '-source', type: 'PDF article', title: article.title, source: article.source ?? 'src/article', referenceDate: article.collectedAt ?? null, usedFor: ['Step 4 report'], reliability: '실제 아티클 원문', isMockData: false, originalAvailable: true }
  const generatedAt = Object.values(results).map((item) => item?.generatedAt).filter(Boolean).sort().at(-1) ?? new Date().toISOString()
  const aiEvidence = listValue(evidence.evidence).map((item, index) => {
    const source = objectValue(item)
    return {
      ...source,
      id: textValue(source.id, article.id + '-step4-' + String(index + 1)),
      type: textValue(source.type, 'PDF article'),
      title: textValue(source.title, article.title),
      source: textValue(source.source, article.source ?? 'src/article'),
      referenceDate: typeof source.referenceDate === 'string' ? source.referenceDate : article.collectedAt ?? null,
      usedFor: Array.isArray(source.usedFor) ? source.usedFor : ['Step 4 report'],
      reliability: textValue(source.reliability, '실제 아티클 원문'),
      isMockData: false,
      originalAvailable: true,
    }
  })
  const report = {
    meta: {
      reportId: 'RPT-' + article.id,
      sourceRiskId: article.id,
      title: article.title,
      riskTitle: article.title,
      riskCategories: ['실제 아티클'],
      analysisMode: 'developer / Step 4',
      analysisBaseDate: article.collectedAt ?? generatedAt,
      generatedAt,
      evidenceCount: aiEvidence.length || 1,
      aiStatus: 'ACTUAL ARTICLE',
      dataStatus: 'ACTUAL ARTICLE · REVIEW REQUIRED',
      isMockData: false,
      badges: ['ACTUAL ARTICLE', 'STEP 4'],
      disclaimer: 'src/article 원문과 Step 4 분석 결과를 대입한 개발자 테스트 초안입니다. 결과에 없는 내용은 확인 필요로 표시합니다.',
    },
    aiSummary: {
      ...summaryData,
      decisionLabel: textValue(summaryData.decisionLabel),
      primaryConclusionReason: textValue(summaryData.primaryConclusionReason, article.title + '에 대한 Step 4 분석 결과입니다.'),
      cards: normalizeSummaryCards(summaryData.cards),
      overallOpinion: textValue(summaryData.overallOpinion),
      recommendedNextAction: textValue(summaryData.recommendedNextAction),
      nextActions: normalizeNextActions(summaryData.nextActions),
      additionalConfirmations: normalizeAdditionalConfirmations(summaryData.additionalConfirmations),
    },
    riskGapSummary: {
      ...gapData,
      definition: textValue(gapData.definition),
      whyNow: listValue(gapData.whyNow),
      damageTypes: normalizeWordingList(gapData.damageTypes, 'damage'),
      affectedParties: stringList(gapData.affectedParties),
      existingCoverageMap: normalizeCoverageRows(gapData.existingCoverageMap),
      keyCoverageGaps: normalizeCoverageGaps(gapData.keyCoverageGaps),
    },
    targetSuitability: normalizeTargetSuitability(targetData),
    productFeasibility: {
      ...assessmentData,
      overallStatus: textValue(assessmentData.overallStatus, 'additional_check_required'),
      overallAssessment: {
        ...objectValue(assessmentData.overallAssessment),
        conclusion: textValue(objectValue(assessmentData.overallAssessment).conclusion),
        strengths: stringList(objectValue(assessmentData.overallAssessment).strengths),
        improvements: stringList(objectValue(assessmentData.overallAssessment).improvements),
        entryConditions: stringList(objectValue(assessmentData.overallAssessment).entryConditions),
      },
      items: normalizeFeasibilityItems(assessmentData.items),
      assessment: normalizeCommercializationAssessment(assessmentData.assessment, textValue(assessmentData.overallStatus, 'needs_more_data')),
      interpretation: textValue(assessmentData.interpretation),
    },
    productProposal: {
      ...proposalData,
      status: textValue(proposalData.status),
      workingName: textValue(proposalData.workingName),
      recommendedForm: textValue(proposalData.recommendedForm),
      alternativeForms: stringList(proposalData.alternativeForms),
      expectedPolicyholder: stringList(proposalData.expectedPolicyholder),
      expectedInsured: textValue(proposalData.expectedInsured),
      coveredObject: textValue(proposalData.coveredObject),
      coveredEvent: textValue(proposalData.coveredEvent),
      coveredLoss: textValue(proposalData.coveredLoss),
      existingInsuranceRelationship: textValue(proposalData.existingInsuranceRelationship),
      settlementDirection: textValue(proposalData.settlementDirection),
      policyPeriodDirection: textValue(proposalData.policyPeriodDirection),
      coverageLimitDirection: textValue(proposalData.coverageLimitDirection),
      deductibleDirection: textValue(proposalData.deductibleDirection),
      underwritingCandidates: stringList(proposalData.underwritingCandidates),
      outOfScopeCandidates: stringList(proposalData.outOfScopeCandidates),
      recommendationReason: textValue(proposalData.recommendationReason),
      unresolvedItems: stringList(proposalData.unresolvedItems),
      // Actual insurer/product rows are supplied through the Step 4
      // productProposal.noveltyAnalysis payload; this adapter does not invent
      // comparison subjects when the source payload is pending.
      noveltyAnalysis: proposalData.noveltyAnalysis,
      evidenceIds: evidenceIdList(proposalData.evidenceIds),
    },
    wordingFeasibility: {
      ...wordingData,
      status: textValue(wordingData.status),
      label: textValue(wordingData.label),
      disclaimer: textValue(wordingData.disclaimer),
      possibleReasons: stringList(wordingData.possibleReasons),
      improvementReasons: stringList(wordingData.improvementReasons),
      assessmentCriteria: normalizeWordingCriteria(wordingData.assessmentCriteria),
      structureOptions: normalizeWordingList(wordingData.structureOptions, 'structure'),
      selectedDraftType: textValue(wordingData.selectedDraftType),
      coverageDraft: textValue(wordingData.coverageDraft),
      alternativeLiabilityDraft: textValue(wordingData.alternativeLiabilityDraft),
      definitions: normalizeWordingDefinitions(wordingData.definitions),
      paymentConditions: normalizeWordingConditions(wordingData.paymentConditions),
      exclusionCandidates: normalizeWordingExclusions(wordingData.exclusionCandidates),
      ambiguities: normalizeWordingAmbiguities(wordingData.ambiguities),
      referenceDocuments: normalizeReferenceDocuments(wordingData.referenceDocuments),
    },
    evidence: aiEvidence.length ? aiEvidence : [evidenceItem],
    missingResearch: listValue(evidence.missingResearch ?? evidence.followUpTasks).map((item, index) => {
      const missing = objectValue(item)
      return {
        id: textValue(missing.id, 'follow-up-' + String(index + 1)),
        priority: textValue(missing.priority),
        topic: textValue(missing.topic, 'Step 4 추가 확인 항목'),
        reason: textValue(missing.reason, '실제 아티클만으로 확인할 수 없는 항목'),
        responsibleTeam: textValue(missing.responsibleTeam),
        status: textValue(missing.status, 'pending'),
        acquisitionType: textValue(missing.acquisitionType),
        requiredMaterials: listValue(missing.requiredMaterials).map(String),
      }
    }),
    ui: { briefing: briefingData },
  } as unknown as ReportResult
  const riskData = {
    schemaVersion: 'developer-actual-v1',
    meta: { riskId: article.id, analysisMode: 'developer / actual article', analysisBaseDate: article.collectedAt ?? generatedAt, preparedAt: article.collectedAt, dataStatus: 'ACTUAL ARTICLE', isMockData: false, inputEvidenceCount: 1, badges: ['ACTUAL ARTICLE', 'STEP 4'] },
    risk: { title: article.title, shortTitle: article.title, formalDefinition: article.title, categories: ['실제 아티클'] },
    demoContext: { mode: 'developer', source: article.source ?? 'src/article', fileName: article.fileName },
    selectionPreview: { oneLineReason: article.title, source: article.source ?? 'src/article', articleId: article.id },
    riskSignals: [],
    accidentScenario: { description: '실제 아티클 본문에서 사고·손해 시나리오를 확인합니다.' },
    stakeholders: [],
    existingCoverage: [],
    coverageGapHypotheses: [],
    insurabilityInputs: {},
    referenceDocuments: { includedInAiInput: [evidenceItem] },
    evidenceItems: [evidenceItem],
    missingResearch: [],
    analysisQuestions: [],
    expectedReportSections: ['summary', 'gap', 'structure', 'assessment', 'wording', 'briefing', 'evidence'],
    aiGuardrails: { sourcePolicy: 'actual-article-only', missingEvidencePolicy: '확인 필요로 표시', finalDecisionPolicy: '보험 인수·판매 승인 아님' },
    disclaimer: '실제 아티클 원문과 Step 4 분석 결과를 결합한 개발자 테스트용 데이터입니다.',
  } as RiskSourceData
  return { riskData, report }
}
