import type {
  CommercializationAssessment,
  CommercializationCriterion,
  CommercializationCriterionCategory,
  CommercializationCriterionStatus,
  CommercializationEvidence,
  CommercializationExternalConstraint,
  CommercializationNextAction,
  ProductFeasibility,
  ReportResult,
} from "../types";

export const COMMERCIALIZATION_CRITERION_DEFINITIONS: Array<{
  id: string;
  category: CommercializationCriterionCategory;
  order: number;
  title: string;
  question: string;
  description: string;
}> = [
  { id: "actual_market_demand", category: "market", order: 1, title: "실제 시장·계약 수요", question: "실제로 구매·가입할 기업이나 계약자가 존재하는가?", description: "고객 요청, 가입 의향, 예상 계약 수와 대체 대응수단을 기준으로 반복 가능한 수요를 검토합니다." },
  { id: "risk_pooling", category: "insurability", order: 2, title: "위험 분산 가능성", question: "동질 위험을 가진 계약자가 충분하고 여러 계약으로 분산할 수 있는가?", description: "특정 고객·시설·지역에 집중되지 않고 위험군을 나눌 수 있는지 검토합니다." },
  { id: "fortuity", category: "insurability", order: 3, title: "우연성", question: "사고가 우연하고 사전에 통제되지 않는가?", description: "계약 전 이미 발생했거나 의도적으로 만든 손해가 아닌지 검토합니다." },
  { id: "insurable_interest", category: "insurability", order: 4, title: "피보험이익 명확성", question: "보험금을 받을 주체가 사고로 실제 경제적 손해를 입는가?", description: "계약자·피보험자·피해자·수령자의 관계와 보호할 경제적 이해관계를 검토합니다." },
  { id: "moral_hazard_control", category: "insurability", order: 5, title: "고의·도덕적 해이·보험사기 통제", question: "고의·조작·과다 청구를 객관적으로 통제할 수 있는가?", description: "인수기준, 사고 검증, 면책·자기부담 등으로 도덕적 해이를 관리할 수 있는지 검토합니다." },
  { id: "gambling_like_structure", category: "insurability", order: 6, title: "사행성·유사수신 배제", question: "실제 경제적 손해와 무관한 투자·베팅 구조가 아닌가?", description: "보험 목적과 실제 손해 보전의 연결이 약한 정액·확정수익 구조인지 검토합니다." },
  { id: "loss_verifiability", category: "loss", order: 7, title: "사고 확인·손해액 산정 가능성", question: "사고와 직접·간접 손해를 객관적 자료로 확인하고 산정할 수 있는가?", description: "사고 시점·장소·원인, 피해별 손해와 기존 보험 중복 여부를 검토합니다." },
  { id: "pml_accumulation", category: "loss", order: 8, title: "최대 가능 손해·누적 위험", question: "단일 사고의 PML과 동시다발 누적 위험을 관리할 수 있는가?", description: "집중·확산 손해와 재보험 이전 필요성을 포함해 인수 가능 범위를 검토합니다." },
  { id: "liability_clarity", category: "product", order: 9, title: "책임주체 명확성", question: "사고 관련 책임 주체와 책임 분담 기준을 구분할 수 있는가?", description: "계약상·법률상 책임, 복수 주체와 구상 가능성을 검토합니다." },
  { id: "wording_clarity", category: "product", order: 10, title: "약관·보장조건 명확성", question: "보장·면책·지급조건을 객관적인 약관으로 표현할 수 있는가?", description: "보장 대상·사고·손해·기간·한도 방향과 분쟁 가능성을 검토합니다." },
  { id: "pricing_data_readiness", category: "product", order: 11, title: "데이터·요율 산출 준비도", question: "사고·손해·노출 데이터를 기반으로 요율 검토를 준비할 수 있는가?", description: "빈도·심도·노출 단위·위험 특성별 차이와 국내외 자료 활용 가능성을 검토합니다." },
  { id: "coverage_gap", category: "product", order: 12, title: "기존 보험 보장 공백·중복·개정 가능성", question: "기존 보험의 공백과 중복을 구분하고 개정·신규 개발 방향을 정할 수 있는가?", description: "기존 보험의 보장 범위, 이중보상 가능성과 특약 개정 대비 신규 상품의 현실성을 검토합니다." },
];

const LEGACY_ID_MAP: Record<string, string> = {
  marketability: "actual_market_demand",
  fortuity: "fortuity",
  measurability: "loss_verifiability",
  responsibility: "liability_clarity",
  moralHazard: "moral_hazard_control",
  dataAvailability: "pricing_data_readiness",
  differentiation: "coverage_gap",
};

const STATUS_LABELS: Record<CommercializationCriterionStatus, string> = {
  pass: "통과",
  conditional: "조건부",
  needs_review: "보완 필요",
  critical: "중대 위험",
  unknown: "미평가",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const asStatus = (value: unknown): CommercializationCriterionStatus => {
  const raw = asString(value).trim().toLowerCase();
  if (["pass", "통과", "양호", "긍정"].includes(raw)) return "pass";
  if (["conditional", "조건부", "조건부 통과", "조건부 검토"].includes(raw)) return "conditional";
  if (["critical", "중대 위험", "위험"].includes(raw)) return "critical";
  if (["needs_review", "needs review", "보완 필요", "추가 확인", "근거 부족"].includes(raw)) return "needs_review";
  return "unknown";
};

const asConfidence = (value: unknown): CommercializationCriterion["confidence"] => {
  const raw = asString(value).toLowerCase();
  return raw === "high" || raw === "medium" || raw === "low" ? raw : "unknown";
};

const asPriority = (value: unknown): CommercializationNextAction["priority"] => {
  const raw = asString(value).toLowerCase();
  return raw === "high" || raw === "medium" || raw === "low" ? raw : "medium";
};

function toEvidence(raw: unknown, fallbackIds: string[], report: ReportResult, criterionId: string): CommercializationEvidence[] {
  const source = Array.isArray(raw) ? raw.filter(isRecord) : [];
  const mapped = source.map((item, index) => ({
    id: asString(item.id, `${criterionId}-evidence-${index + 1}`),
    title: asString(item.title, asString(item.sourceName, "근거자료")),
    sourceType: asString(item.sourceType, "other"),
    sourceName: asString(item.sourceName, asString(item.source, "리포트 입력자료")),
    publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : null,
    collectedAt: typeof item.collectedAt === "string" ? item.collectedAt : null,
    url: asString(item.url),
    excerpt: asString(item.excerpt, asString(item.summary)),
  }));
  const existing = new Set(mapped.map((item) => item.id));
  fallbackIds.forEach((id) => {
    if (existing.has(id)) return;
    const reportEvidence = report.evidence.find((item) => item.id === id);
    mapped.push({
      id,
      title: reportEvidence?.title ?? id,
      sourceType: "other",
      sourceName: reportEvidence?.source ?? "리포트 입력자료",
      publishedAt: reportEvidence?.referenceDate ?? null,
      collectedAt: null,
      url: "",
      excerpt: "",
    });
  });
  return mapped;
}

function toActions(raw: unknown, missing: string[], criterionId: string): CommercializationNextAction[] {
  const source = Array.isArray(raw) ? raw.filter(isRecord) : [];
  const actions = source.map((item, index) => ({
    id: asString(item.id, `${criterionId}-action-${index + 1}`),
    text: asString(item.text, asString(item.action, "추가 확인")),
    owner: asString(item.owner, "담당자 결정 필요"),
    dueDate: asString(item.dueDate),
    priority: asPriority(item.priority),
    completed: item.completed === true,
  }));
  if (actions.length) return actions;
  return missing.map((text, index) => ({ id: `${criterionId}-action-${index + 1}`, text, owner: "담당자 결정 필요", dueDate: "", priority: "medium", completed: false }));
}

const legacyItemFor = (sourceItems: Record<string, unknown>[], definitionId: string) => {
  const legacyId = Object.entries(LEGACY_ID_MAP).find(([, value]) => value === definitionId)?.[0];
  return sourceItems.find((item) => asString(item.id) === definitionId || asString(item.id) === legacyId);
};

function createCriterion(definition: typeof COMMERCIALIZATION_CRITERION_DEFINITIONS[number], raw: Record<string, unknown> | undefined, report: ReportResult): CommercializationCriterion {
  const missing = asStringArray(raw?.missingInformation ?? raw?.additionalChecks);
  const evidenceIds = asStringArray(raw?.evidenceIds);
  const summary = asString(raw?.summary, asString(raw?.judgment, "추가 평가가 필요합니다."));
  return {
    id: definition.id,
    category: definition.category,
    order: definition.order,
    title: definition.title,
    question: definition.question,
    description: definition.description,
    status: asStatus(raw?.status ?? raw?.displayStatus),
    summary,
    rationale: asString(raw?.rationale, asString(raw?.judgment)),
    confirmedFacts: asString(raw?.confirmedFacts, asString(raw?.confirmed_facts)),
    evidence: toEvidence(raw?.evidence, evidenceIds, report, definition.id),
    confidence: asConfidence(raw?.confidence),
    missingInformation: missing,
    nextActions: toActions(raw?.nextActions, missing, definition.id),
    isBlocking: raw?.isBlocking === true,
    reviewerMemo: asString(raw?.reviewerMemo),
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null,
  };
}

const unique = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export function deriveCommercializationGate(
  assessment: Pick<CommercializationAssessment, "criteria" | "externalConstraints">,
): { overallStatus: CommercializationAssessment["overallStatus"]; reason: string; blockingCriteria: string[]; unresolvedCriteria: string[]; priorityActions: string[] } {
  const criteria = assessment.criteria ?? [];
  const blockingCriteria = criteria.filter((item) => item.status === "critical" && ["fortuity", "insurable_interest", "gambling_like_structure", "wording_clarity", "pml_accumulation", "loss_verifiability"].includes(item.id)).map((item) => item.title);
  const externalBlocking = (assessment.externalConstraints ?? []).filter((item) => item.severity === "blocking" && item.confirmed).map((item) => item.title);
  const unresolved = criteria.filter((item) => item.status === "unknown" || item.status === "needs_review").map((item) => item.title);
  const actions = criteria.flatMap((item) => item.nextActions.filter((action) => !action.completed).map((action) => action.text));
  if (externalBlocking.length) return { overallStatus: "redesign", reason: `확정된 외부 제약: ${externalBlocking.join(", ")}`, blockingCriteria: externalBlocking, unresolvedCriteria: unresolved, priorityActions: unique(actions).slice(0, 5) };
  if (blockingCriteria.length) return { overallStatus: "redesign", reason: `핵심 중대 위험: ${blockingCriteria.join(", ")}`, blockingCriteria, unresolvedCriteria: unresolved, priorityActions: unique(actions).slice(0, 5) };
  const coreIds = new Set(["fortuity", "insurable_interest", "gambling_like_structure", "loss_verifiability", "liability_clarity"]);
  const coreUnresolved = criteria.filter((item) => coreIds.has(item.id) && (item.status === "unknown" || item.status === "needs_review"));
  if (unresolved.length >= 4 || coreUnresolved.length) return { overallStatus: "needs_more_data", reason: "핵심 판단에 필요한 자료와 검토가 아직 충분하지 않습니다.", blockingCriteria: [], unresolvedCriteria: unresolved, priorityActions: unique(actions).slice(0, 5) };
  const hasConditional = criteria.some((item) => item.status === "conditional" || item.status === "needs_review");
  return { overallStatus: hasConditional ? "conditional" : "reviewable", reason: hasConditional ? "조건부 보완사항을 확인한 뒤 다음 상품화 검토로 진행할 수 있습니다." : "핵심 평가항목이 통과되어 상품화 검토를 진행할 수 있습니다.", blockingCriteria: [], unresolvedCriteria: unresolved, priorityActions: unique(actions).slice(0, 5) };
}

// Public name used by product-development integrations and tests.
export const deriveCommercializationOverallStatus = deriveCommercializationGate;

export function ensureCommercializationAssessment(report: ReportResult): ReportResult {
  const cloned = JSON.parse(JSON.stringify(report)) as ReportResult;
  const source = (cloned.productFeasibility ?? {}) as ProductFeasibility & Record<string, unknown>;
  const sourceItems = Array.isArray(source.items) ? source.items.filter(isRecord) : [];
  const existing = isRecord(source.assessment) ? source.assessment as Record<string, unknown> : {};
  const existingCriteria = Array.isArray(existing.criteria) ? existing.criteria.filter(isRecord) : [];
  const existingById = new Map(existingCriteria.map((item) => [asString(item.id), item]));
  const legacyRegulation = sourceItems.find((item) => asString(item.id) === "regulation");
  const criteria = COMMERCIALIZATION_CRITERION_DEFINITIONS.map((definition) => createCriterion(definition, existingById.get(definition.id) ?? legacyItemFor(sourceItems, definition.id), cloned));
  const discoveryContext = (existing.discoveryContext && isRecord(existing.discoveryContext)
    ? existing.discoveryContext
    : source.discoveryContext && isRecord(source.discoveryContext)
      ? source.discoveryContext
      : legacyRegulation
        ? { discoveryType: "regulation", sourceName: "기존 상품화 평가의 법령·규제 영향", sourceSummary: asString(legacyRegulation.judgment), marketImpactSummary: asString(legacyRegulation.judgment) }
        : undefined) as CommercializationAssessment["discoveryContext"];
  const externalConstraints = (Array.isArray(existing.externalConstraints) ? existing.externalConstraints : source.externalConstraints) as CommercializationExternalConstraint[] | undefined;
  const gate = deriveCommercializationGate({ criteria, externalConstraints });
  const oldAssessment: Record<string, unknown> = isRecord(source.overallAssessment) ? source.overallAssessment : {};
  const assessment: CommercializationAssessment = {
    overallStatus: gate.overallStatus,
    overallSummary: asString(existing.overallSummary, asString(oldAssessment.conclusion, asString(source.interpretation, "상품화 검토를 위한 종합 판단입니다."))),
    overallReason: gate.reason,
    topStrengths: asStringArray(existing.topStrengths).length ? asStringArray(existing.topStrengths) : asStringArray(oldAssessment.strengths),
    topRisks: unique([...gate.blockingCriteria, ...gate.unresolvedCriteria, ...asStringArray(existing.topRisks), ...asStringArray(oldAssessment.improvements)]).slice(0, 5),
    priorityActions: unique([...gate.priorityActions, ...asStringArray(existing.priorityActions), ...asStringArray(oldAssessment.entryConditions)]).slice(0, 5),
    criteria,
    discoveryContext,
    externalConstraints,
    reviewedAt: typeof existing.reviewedAt === "string" ? existing.reviewedAt : null,
    reviewerMemo: asString(existing.reviewerMemo),
  };
  // Keep the legacy field available to older consumers, but derive it only from
  // the fixed 12 criteria. The old regulation criterion is intentionally not
  // copied back into this compatibility list; its text is retained above in
  // discoveryContext instead.
  const compatibilityItems = criteria.map((criterion) => ({
    ...(existingById.get(criterion.id) ?? legacyItemFor(sourceItems, criterion.id) ?? {}),
    id: criterion.id,
    criterion: criterion.title,
    status: STATUS_LABELS[criterion.status],
    displayStatus: STATUS_LABELS[criterion.status],
    judgment: criterion.rationale || criterion.summary,
    evidenceIds: criterion.evidence.map((evidence) => evidence.id),
    additionalChecks: criterion.missingInformation,
  }));
  cloned.productFeasibility = { ...source, overallStatus: gate.overallStatus, assessment, items: compatibilityItems, discoveryContext, externalConstraints, commercializationAssessmentVersion: 1 };
  return cloned;
}

export function validateCommercializationAssessment(assessment: CommercializationAssessment | undefined): { errors: string[]; warnings: string[] } {
  if (!assessment) return { errors: ["상품화 가능성 평가 데이터가 없습니다."], warnings: [] };
  const ids = assessment.criteria.map((item) => item.id);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (new Set(ids).size !== ids.length) errors.push("평가항목 ID가 중복되었습니다.");
  const required = COMMERCIALIZATION_CRITERION_DEFINITIONS.map((item) => item.id).filter((id) => !ids.includes(id));
  if (required.length) errors.push(`필수 평가항목이 누락되었습니다: ${required.join(", ")}`);
  assessment.criteria.forEach((item) => {
    if (!STATUS_LABELS[item.status]) errors.push(`${item.title}: 상태값을 확인해 주세요.`);
    if (item.status === "critical" && !item.rationale.trim()) errors.push(`${item.title}: 중대 위험의 판단 근거가 필요합니다.`);
    if (item.isBlocking && !item.rationale.trim()) errors.push(`${item.title}: 차단 항목에는 판단 이유가 필요합니다.`);
    if (item.isBlocking && item.nextActions.length === 0) errors.push(`${item.title}: 차단 항목에는 다음 조치가 필요합니다.`);
    if (item.summary.length > 500 || item.rationale.length > 2000) warnings.push(`${item.title}: 판단 문장이 길어 핵심만 다듬어 주세요.`);
    if (item.status === "pass" && item.evidence.length === 0) warnings.push(`${item.title}: 통과 판단의 근거자료가 없습니다.`);
    if (item.confidence === "high" && item.evidence.length === 0) warnings.push(`${item.title}: 근거 충분도가 높음으로 입력되었으므로 근거자료를 연결하는 것이 좋습니다.`);
    item.evidence.forEach((evidence) => {
      if (!evidence.id.trim() || !evidence.title.trim()) warnings.push(`${item.title}: 빈 근거자료 카드는 저장 전 정리해 주세요.`);
      if (evidence.url) {
        try { new URL(evidence.url); } catch { errors.push(`${item.title}: 근거자료 URL 형식이 올바르지 않습니다.`); }
      }
    });
    item.nextActions.forEach((action) => {
      if (!action.completed && !action.text.trim()) errors.push(`${item.title}: 완료하지 않은 다음 조치에는 해야 할 일이 필요합니다.`);
      if (action.dueDate) {
        const date = new Date(action.dueDate);
        if (Number.isNaN(date.getTime())) errors.push(`${item.title}: 목표일 형식이 올바르지 않습니다.`);
      }
    });
  });
  return { errors, warnings };
}

export const commercializationStatusLabel = (status: string) => ({
  ...STATUS_LABELS,
  reviewable: "검토 가능",
  conditional: "조건부 검토",
  needs_more_data: "추가 자료 필요",
  redesign: "상품 구조 재검토",
  not_viable: "현재 상품화 곤란",
}[status] ?? "미평가");
