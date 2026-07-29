import type {
  AdditionalConfirmation,
  AiNextAction,
  AiRiskInput,
  AiSummary,
  EvidenceItem,
  FeasibilityItem,
  JsonObject,
  MissingResearchItem,
  ProductFeasibility,
  ProductProposal,
  ReportMeta,
  ReportResult,
  ReportValidationWarning,
  SummaryCard,
  TargetSuitability,
  TargetSuitabilityOption,
  WordingFeasibility,
} from "../types";

const SUMMARY_CARDS: Array<[string, string]> = [
  ["target", "보험 대상"],
  ["productDirection", "상품 방향"],
  ["wording", "약관화 가능성"],
  ["dataReadiness", "데이터 준비도"],
];

const FEASIBILITY_ITEMS: Array<[string, string]> = [
  ["actual_market_demand", "실제 시장 수요"],
  ["risk_pooling", "위험 집단화"],
  ["fortuity", "우연성"],
  ["insurable_interest", "보험이익"],
  ["moral_hazard_control", "도덕적 해이 통제"],
  ["gambling_like_structure", "도박적 구조 여부"],
  ["loss_verifiability", "손해의 객관적 확인"],
  ["pml_accumulation", "최대예상손해·누적"],
  ["liability_clarity", "책임 구조 명확성"],
  ["wording_clarity", "약관 표현 명확성"],
  ["pricing_data_readiness", "요율·손해 데이터 준비"],
  ["coverage_gap", "기존 보험의 보장 공백"],
];

const LEGACY_FEASIBILITY_ID_MAP: Record<string, string> = {
  marketability: "actual_market_demand",
  measurability: "loss_verifiability",
  responsibility: "liability_clarity",
  moralHazard: "moral_hazard_control",
  dataAvailability: "pricing_data_readiness",
  differentiation: "coverage_gap",
};

const TARGET_OPTIONS: Array<[string, string]> = [
  ["corporate", "기업보험"],
  ["individual", "개인보험"],
  ["hybrid", "혼합형"],
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = "추가 확인 필요"): string =>
  typeof value === "string" && value.trim() ? value : fallback;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const asObjectArray = (value: unknown): JsonObject[] =>
  Array.isArray(value) ? value.filter(isRecord).map((item) => item as JsonObject) : [];

const recordAt = (value: unknown): JsonObject =>
  isRecord(value) ? (value as JsonObject) : {};

const warning = (code: string, path: string, message: string): ReportValidationWarning => ({
  code,
  path,
  message,
});

const toKoreanSummaryStatus = (value: unknown): SummaryCard["status"] => {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (status === "positive" || status === "긍정" || status === "양호") return "긍정";
  if (status === "conditional" || status === "조건부" || status === "조건부 검토") {
    return "보완 필요";
  }
  return "보완 필요";
};

const toKoreanStatus = (value: unknown, fallback: string): string => {
  const raw = typeof value === "string" ? value.trim() : "";
  const key = raw.toLowerCase();
  const statusMap: Record<string, string> = {
    pass: "충족",
    positive: "긍정",
    conditional: "추가 확인 필요",
    "needs_review": "보완 필요",
    "needs-data": "보완 필요",
    critical: "불충족",
    unknown: "보완 필요",
    reviewable: "검토 가능",
    needs_more_data: "추가 자료 필요",
    redesign: "상품 구조 재검토",
    not_viable: "현재 상품화 곤란",
    pending: "검토 대기",
    review: "검토 필요",
    draft: "검토 초안",
    available: "확보 가능",
    unavailable: "확보 필요",
  };
  return (statusMap[key] ?? raw) || fallback;
};

const normalizeRiskGap = (value: unknown): JsonObject => {
  const source = recordAt(value);
  return {
    ...source,
    definition: asString(source.definition),
    whyNow: asStringArray(source.whyNow),
    affectedParties: asStringArray(source.affectedParties),
    damageTypes: asObjectArray(source.damageTypes).map((item, index) => ({
      ...item,
      id: asString(item.id, `DMG-${String(index + 1).padStart(2, "0")}`),
      name: asString(item.name),
      examples: asStringArray(item.examples),
      initialScope: asString(item.initialScope),
    })),
    existingCoverageMap: asObjectArray(source.existingCoverageMap).map(
      (item, index) => ({
        ...item,
        id: asString(item.id, `COV-${String(index + 1).padStart(2, "0")}`),
        damage: asString(item.damage, `발생 손해 ${index + 1}`),
        coverageName: asString(item.coverageName),
        possibleCoverage: asString(item.possibleCoverage),
        remainingGap: asString(item.remainingGap),
        status: toKoreanStatus(item.status, "추가 확인 필요"),
      }),
    ),
    keyCoverageGaps: asObjectArray(source.keyCoverageGaps).map((item, index) => ({
      ...item,
      id: asString(item.id, `GAP-${String(index + 1).padStart(2, "0")}`),
      title: asString(item.title),
      description: asString(item.description),
      importance: asString(item.importance, "중간"),
    })),
  };
};

const normalizeSummary = (value: unknown): AiSummary => {
  const source = recordAt(value);
  const sourceCards = asObjectArray(source.cards);
  const byId = new Map(sourceCards.map((card) => [card.id, card]));
  const legacyPriority = recordAt(byId.get("priority"));
  const cards: SummaryCard[] = SUMMARY_CARDS.map(([id, label]) => {
    const card = recordAt(byId.get(id));
    return {
      ...card,
      id,
      label: asString(card.label, label),
      result: asString(card.result),
      status: toKoreanSummaryStatus(card.status),
      shortReason: asString(card.shortReason),
      detail: asString(card.detail),
      evidenceIds: asStringArray(card.evidenceIds),
      caveat: asString(card.caveat),
    };
  });

  const nextActions = asObjectArray(source.nextActions).map((item, index): AiNextAction => ({
    ...item,
    id: asString(item.id, `NEXT-${String(index + 1).padStart(2, "0")}`),
    action: asString(item.action),
    reason: asString(item.reason),
    evaluationIds: asStringArray(item.evaluationIds),
    evidenceIds: asStringArray(item.evidenceIds),
    responsibleTeams: asStringArray(item.responsibleTeams),
  }));

  const additionalConfirmations = asObjectArray(source.additionalConfirmations).map(
    (item, index): AdditionalConfirmation => ({
      ...item,
      id: asString(item.id, `CONF-${String(index + 1).padStart(2, "0")}`),
      title: asString(item.title),
      whatToConfirm: asString(item.whatToConfirm),
      whyNeeded: asString(item.whyNeeded),
      requiredMaterials: asStringArray(item.requiredMaterials),
      responsibleTeams: asStringArray(item.responsibleTeams),
      evidenceIds: asStringArray(item.evidenceIds),
    }),
  );

  const fallbackAction: AiNextAction = {
    id: "NEXT-01",
    action: asString(source.recommendedNextAction, "기존 보험 보상 관계와 사고 자료를 우선 확인합니다."),
    reason: "추가 확인이 필요한 상품화 판단을 실제 검토 단계로 연결하기 위해 필요합니다.",
    evaluationIds: ["responsibility", "dataAvailability", "differentiation"],
    evidenceIds: asStringArray(legacyPriority.evidenceIds),
    responsibleTeams: ["상품개발", "약관·법무", "계리"],
  };

  return {
    ...source,
    decisionLabel: asString(source.decisionLabel, "판단 보류"),
    primaryConclusionReason: asString(
      source.primaryConclusionReason,
      asString(legacyPriority.shortReason, "핵심 판단 근거를 추가 확인해야 합니다."),
    ),
    cards,
    overallOpinion: asString(source.overallOpinion),
    recommendedNextAction: asString(source.recommendedNextAction, fallbackAction.action),
    nextActions: nextActions.length > 0 ? nextActions : [fallbackAction],
    additionalConfirmations,
  };
};

const normalizeTargets = (value: unknown): TargetSuitability => {
  const source = recordAt(value);
  const sourceOptions = asObjectArray(source.options);
  const byId = new Map(sourceOptions.map((option) => [option.id, option]));
  const options: TargetSuitabilityOption[] = TARGET_OPTIONS.map(([id, target], index) => {
    const option = recordAt(byId.get(id));
    return {
      ...option,
      id,
      target: asString(option.target, target),
      suitability: asString(option.suitability),
      rank: typeof option.rank === "number" ? option.rank : index + 1,
      reason: asString(option.reason),
      limitation: asString(option.limitation),
    };
  });

  return {
    ...source,
    recommendation: asString(source.recommendation, "추가 확인 필요"),
    recommendationLabel: asString(source.recommendationLabel),
    options,
    roleStructure: asObjectArray(source.roleStructure).map((item, index) => ({
      ...item,
      role: asString(item.role, `역할 ${index + 1}`),
      candidates: asStringArray(item.candidates),
      status: asString(item.status, "검토안"),
      question: asString(item.question),
    })),
    caution: asString(source.caution),
  };
};

const normalizeFeasibility = (value: unknown): ProductFeasibility => {
  const source = recordAt(value);
  const sourceItems = asObjectArray(source.items);
  const byId = new Map(sourceItems.flatMap((item) => {
    const id = typeof item.id === "string" ? item.id : "";
    const mappedId = LEGACY_FEASIBILITY_ID_MAP[id] ?? id;
    return [[id, item], [mappedId, item]] as Array<[string, JsonObject]>;
  }));
  const items: FeasibilityItem[] = FEASIBILITY_ITEMS.map(([id, criterion]) => {
    const item = recordAt(byId.get(id));
    return {
      ...item,
      id,
      criterion: asString(item.criterion, criterion),
      status: asString(item.status, "근거 부족"),
      displayStatus:
        typeof item.displayStatus === "string" ? item.displayStatus : undefined,
      judgment: asString(item.judgment),
      evidenceIds: asStringArray(item.evidenceIds),
      additionalChecks: asStringArray(item.additionalChecks),
    };
  });
  const assessment = recordAt(source.overallAssessment);
  const strengths = asStringArray(assessment.strengths);
  const improvements = asStringArray(assessment.improvements);
  const entryConditions = asStringArray(assessment.entryConditions);

  const regulation = sourceItems.find((item) => item.id === "regulation");
  return {
    ...source,
    overallStatus: toKoreanStatus(source.overallStatus, "판단 보류"),
    overallAssessment: {
      conclusion: asString(source.overallAssessment && assessment.conclusion, asString(source.interpretation)),
      strengths:
        strengths.length > 0
          ? strengths
          : items.filter((item) => item.status === "양호").map((item) => item.criterion),
      improvements:
        improvements.length > 0
          ? improvements
          : items
              .filter((item) => /조건부|보완 필요|근거 부족/.test(item.status))
              .map((item) => item.criterion),
      entryConditions:
        entryConditions.length > 0
          ? entryConditions
          : items
              .filter((item) => /조건부|보완 필요|근거 부족/.test(item.status))
              .flatMap((item) => item.additionalChecks)
              .slice(0, 4),
    },
    items,
    interpretation: asString(source.interpretation),
    discoveryContext: regulation

      ? {
          discoveryType: "regulation",
          sourceName: "기존 상품화 평가의 법령·규제 영향",
          sourceSummary: asString(regulation.judgment),
          marketImpactSummary: asString(regulation.judgment),
        }
      : isRecord(source.discoveryContext)
        ? source.discoveryContext as ProductFeasibility["discoveryContext"]
        : undefined,
  };
};

const fallbackResponsibleTeams = (id: string): string[] => {
  const byCriterion: Record<string, string[]> = {
    responsibility: ["약관·법무", "손해사정"],
    dataAvailability: ["계리", "재보험"],
    differentiation: ["상품개발", "보상"],
  };
  return byCriterion[id] ?? ["상품개발"];
};

const createFallbackConfirmations = (
  feasibility: ProductFeasibility,
): AdditionalConfirmation[] => feasibility.items
  .filter((item) => /조건부|보완 필요|근거 부족/.test(item.displayStatus ?? item.status))
  .slice(0, 4)
  .map((item, index) => ({
    id: `CONF-${String(index + 1).padStart(2, "0")}`,
    title: `${item.criterion} 추가 확인`,
    whatToConfirm: item.additionalChecks.join(", ") || "판단 근거와 적용 조건",
    whyNeeded: item.judgment,
    requiredMaterials: item.additionalChecks,
    responsibleTeams: fallbackResponsibleTeams(item.id),
    evidenceIds: item.evidenceIds,
  }));

const normalizeProductProposal = (value: unknown): ProductProposal => {
  const source = recordAt(value);
  return {
    ...source,
    status: asString(source.status, "AI 제안 검토안"),
    workingName: asString(source.workingName),
    recommendedForm: asString(source.recommendedForm),
    alternativeForms: asStringArray(source.alternativeForms),
    expectedPolicyholder: asStringArray(source.expectedPolicyholder),
    expectedInsured: asString(source.expectedInsured),
    coveredObject: asString(source.coveredObject),
    coveredEvent: asString(source.coveredEvent),
    coveredLoss: asString(source.coveredLoss),
    existingInsuranceRelationship: asString(source.existingInsuranceRelationship),
    settlementDirection: asString(source.settlementDirection),
    policyPeriodDirection: asString(source.policyPeriodDirection),
    coverageLimitDirection: asString(source.coverageLimitDirection),
    deductibleDirection: asString(source.deductibleDirection),
    underwritingCandidates: asStringArray(source.underwritingCandidates),
    outOfScopeCandidates: asStringArray(source.outOfScopeCandidates),
    recommendationReason: asString(source.recommendationReason),
    unresolvedItems: asStringArray(source.unresolvedItems),
  };
};

const normalizeWording = (
  value: unknown,
  warnings: ReportValidationWarning[],
): WordingFeasibility => {
  const source = recordAt(value);
  const optionSource = asObjectArray(source.structureOptions);
  const byId = new Map(optionSource.map((option) => [option.id, option]));
  let selectedSeen = false;
  const structureOptions = [
    ["liability", "배상책임형"],
    ["damageSupplement", "피해보완형"],
  ].map(([id, name]) => {
    const option = recordAt(byId.get(id));
    const selected = option.selected === true && !selectedSeen;
    if (selected) {
      selectedSeen = true;
    }
    return {
      ...option,
      id,
      name: asString(option.name, name),
      selected,
      description: asString(option.description),
      strength: asString(option.strength),
      limitation: asString(option.limitation),
    };
  });

  if (optionSource.length !== 2 || optionSource.filter((item) => item.selected === true).length > 1) {
    warnings.push(
      warning(
        "WORDING_OPTIONS_NORMALIZED",
        "wordingFeasibility.structureOptions",
        "약관 구조 선택 항목의 누락 또는 중복 선택을 정규화했습니다.",
      ),
    );
  }

  const selectedDraftType = selectedSeen
    ? asString(source.selectedDraftType)
    : "구조 판단 보류";

  return {
    ...source,
    status: asString(source.status, "보완 필요"),
    label: asString(source.label, "약관화 가능성 및 검토용 문구 제안"),
    disclaimer: asString(source.disclaimer, "AI가 생성한 검토용 초안입니다."),
    possibleReasons: asStringArray(source.possibleReasons),
    improvementReasons: asStringArray(source.improvementReasons),
    assessmentCriteria: asObjectArray(source.assessmentCriteria).map((item, index) => ({
      ...item,
      id: asString(item.id, `TERM-CRITERIA-${String(index + 1).padStart(2, "0")}`),
      question: asString(item.question),
      status: asString(item.status, "보완 필요"),
      note: asString(item.note),
    })),
    structureOptions,
    selectedDraftType,
    coverageDraft: asString(source.coverageDraft),
    alternativeLiabilityDraft:
      typeof source.alternativeLiabilityDraft === "string"
        ? source.alternativeLiabilityDraft
        : undefined,
    definitions: asObjectArray(source.definitions).map((item, index) => ({
      ...item,
      term: asString(item.term, `용어 ${index + 1}`),
      draftDefinition: asString(item.draftDefinition),
      status: asString(item.status, "정의 필요"),
    })),
    paymentConditions: asObjectArray(source.paymentConditions).map((item, index) => ({
      ...item,
      id: asString(item.id, `PAY-${String(index + 1).padStart(2, "0")}`),
      text: asString(item.text),
      verification: asString(item.verification),
    })),
    exclusionCandidates: asObjectArray(source.exclusionCandidates).map(
      (item, index) => ({
        ...item,
        id: asString(item.id, `EXC-${String(index + 1).padStart(2, "0")}`),
        text: asString(item.text),
        reason: asString(item.reason),
        status: asString(item.status, "면책 검토 후보"),
      }),
    ),
    ambiguities: asObjectArray(source.ambiguities).map((item, index) => ({
      ...item,
      id: asString(item.id, `AMB-${String(index + 1).padStart(2, "0")}`),
      issue: asString(item.issue),
      question: asString(item.question),
      owner: asString(item.owner),
    })),
    referenceDocuments: asObjectArray(source.referenceDocuments).map((item, index) => ({
      ...item,
      id: asString(item.id, `DOC-${String(index + 1).padStart(2, "0")}`),
      name: asString(item.name),
      role: asString(item.role, "REFERENCE DOCUMENT"),
      usedFor: asString(item.usedFor),
      includedInAiInput: item.includedInAiInput === true,
      badge: typeof item.badge === "string" ? item.badge : undefined,
    })),
  };
};

const normalizeEvidence = (value: unknown, riskInput: AiRiskInput): EvidenceItem[] => {
  const returned = asObjectArray(value);
  const byId = new Map(returned.map((item) => [item.id, item]));

  return riskInput.evidenceItems.map((input) => {
    const item = recordAt(byId.get(input.id));
    return {
      ...input,
      ...item,
      id: input.id,
      type: asString(item.type, input.type),
      title: input.title,
      source: input.source,
      referenceDate:
        typeof item.referenceDate === "string" || item.referenceDate === null
          ? item.referenceDate
          : input.referenceDate,
      usedFor: asStringArray(item.usedFor).length > 0 ? asStringArray(item.usedFor) : input.usedFor,
      reliability: asString(item.reliability, input.reliability),
      isMockData: input.isMockData,
      originalAvailable:
        typeof item.originalAvailable === "boolean"
          ? item.originalAvailable
          : !input.isMockData,
    };
  });
};

const normalizeMeta = (value: unknown, riskInput: AiRiskInput): ReportMeta => {
  const source = recordAt(value);
  return {
    ...source,
    reportId: typeof source.reportId === "string" ? source.reportId : undefined,
    sourceRiskId: riskInput.meta.riskId,
    sourceAsOf: typeof source.sourceAsOf === "string" ? source.sourceAsOf : riskInput.meta.analysisBaseDate,
    sourceAssessmentVersion: typeof source.sourceAssessmentVersion === "string" ? source.sourceAssessmentVersion : null,
    evidenceSnapshotVersion: typeof source.evidenceSnapshotVersion === "string" ? source.evidenceSnapshotVersion : null,
    revision: typeof source.revision === "number" && Number.isFinite(source.revision) ? source.revision : 1,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
    title: asString(source.title, `${riskInput.risk.shortTitle} 상품화 검토 리포트`),
    riskTitle: asString(source.riskTitle, riskInput.risk.title),
    riskCategories: asStringArray(source.riskCategories).length
      ? asStringArray(source.riskCategories)
      : riskInput.risk.categories,
    analysisMode: riskInput.meta.analysisMode,
    analysisBaseDate: riskInput.meta.analysisBaseDate,
    generatedAt: null,
    evidenceCount: riskInput.evidenceItems.length,
    aiStatus: "AI 생성 초안",
    dataStatus: asString(source.dataStatus, "프로토타입용 가상데이터"),
    isMockData: riskInput.meta.isMockData === true,
    badges: asStringArray(source.badges),
    disclaimer: asString(
      source.disclaimer,
      "의사결정 지원용 AI 초안이며 최종 상품·보험료·요율·약관·법률 의견이 아닙니다.",
    ),
  };
};

const normalizeAcquisitionType = (value: unknown, responsibleTeam: string): MissingResearchItem["acquisitionType"] => {
  if (
    value === "AI·공공 API로 확보 가능" ||
    value === "사내자료 필요" ||
    value === "전문가 판단 필요"
  ) {
    return value;
  }
  return /법무|손해사정|준법|재보험/.test(responsibleTeam)
    ? "전문가 판단 필요"
    : "사내자료 필요";
};

export interface NormalizedReportResult {
  report: ReportResult;
  warnings: ReportValidationWarning[];
}

export const normalizeReport = (
  report: JsonObject,
  riskInput: AiRiskInput,
): NormalizedReportResult => {
  const warnings: ReportValidationWarning[] = [];
  const missingResearchSource = asObjectArray(report.missingResearch);
  const missingById = new Map(missingResearchSource.map((item) => [item.id, item]));
  const productFeasibility = normalizeFeasibility(report.productFeasibility);
  const aiSummary = normalizeSummary(report.aiSummary);
  const additionalConfirmations = aiSummary.additionalConfirmations.length > 0
    ? aiSummary.additionalConfirmations
    : createFallbackConfirmations(productFeasibility);

  const normalized: ReportResult = {
    schemaVersion: typeof report.schemaVersion === "string" ? report.schemaVersion : "1.0.0",
    meta: normalizeMeta(report.meta, riskInput),
    aiSummary: {
      ...aiSummary,
      additionalConfirmations,
    },
    riskGapSummary: normalizeRiskGap(report.riskGapSummary),
    targetSuitability: normalizeTargets(report.targetSuitability),
    productFeasibility,
    productProposal: normalizeProductProposal(report.productProposal),
    wordingFeasibility: normalizeWording(report.wordingFeasibility, warnings),
    evidence: normalizeEvidence(report.evidence, riskInput),
    missingResearch: riskInput.missingResearch.map((input) => {
      const item = recordAt(missingById.get(input.id));
      const responsibleTeam = asString(item.responsibleTeam, asString(input.responsibleTeam, "담당 분야 추가 확인"));
      return {
        ...input,
        ...item,
        id: input.id,
        priority: asString(item.priority, input.priority),
        topic: asString(item.topic, input.topic),
        reason: asString(item.reason, input.reason),
        responsibleTeam,
        status: toKoreanStatus(item.status, "미확보"),
        acquisitionType: normalizeAcquisitionType(item.acquisitionType, responsibleTeam),
        requiredMaterials: asStringArray(item.requiredMaterials),
      };
    }),
  };

  return { report: normalized, warnings };
};
