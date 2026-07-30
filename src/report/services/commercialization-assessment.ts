import type {
  CommercializationAssessment,
  CommercializationAiDecision,
  CommercializationCriterion,
  CommercializationCriterionCategory,
  CommercializationCriterionDetail,
  CommercializationCriterionReviewStatus,
  CommercializationCriterionStatus,
  CommercializationAiProductJudgment,
  CommercializationEvidenceStatus,
  CommercializationEvidence,
  CommercializationExternalConstraint,
  CommercializationNextAction,
  CommercializationRateDataPoint,
  CommercializationRateDataStatus,
  CommercializationInputDataPoint,
  CommercializationReviewerDecision,
  CommercializationReviewerProductJudgment,
  CommercializationReviewerReview,
  CommercializationReviewStatus,
  ProductFeasibility,
  ReportResult,
} from "../types";
import { FEASIBILITY_CRITERION_DETAILS } from "../data/product-feasibility-mock";

export const COMMERCIALIZATION_CRITERION_DEFINITIONS: Array<{
  id: string;
  category: CommercializationCriterionCategory;
  order: number;
  title: string;
  question: string;
  description: string;
}> = [
  { id: "actual_market_demand", category: "market", order: 1, title: "실제 시장 수요", question: "실제로 구매·가입할 기업이나 계약자가 존재하는가?", description: "실제로 가입할 기업과 계약 수요가 있는지 확인합니다." },
  { id: "risk_pooling", category: "insurability", order: 2, title: "위험 분산 가능성", question: "동질 위험을 가진 계약자가 충분하고 여러 계약으로 분산할 수 있는가?", description: "특정 지역이나 시설에 손해가 집중되지 않도록 위험을 분산할 수 있는지 검토합니다." },
  { id: "fortuity", category: "insurability", order: 3, title: "우연성", question: "사고가 우연하고 사전에 통제되지 않는가?", description: "화재 발생 여부와 시점을 사전에 확정하기 어려워 우연한 사고로 볼 수 있습니다." },
  { id: "insurable_interest", category: "insurability", order: 4, title: "피보험이익", question: "보험금을 받을 주체가 사고로 실제 경제적 손해를 입는가?", description: "보장 대상과 실제 경제적 손해의 관계를 확인할 수 있습니다." },
  { id: "moral_hazard_control", category: "insurability", order: 5, title: "고의·도덕적 해이 통제", question: "고의·조작·과다 청구를 객관적으로 통제할 수 있는가?", description: "고의사고와 보험사기 위험을 확인하고 통제할 수 있는지 검토합니다." },
  { id: "gambling_like_structure", category: "insurability", order: 6, title: "사행성 배제·실손보상 원칙", question: "실제 경제적 손해와 무관한 투자·베팅 구조가 아닌가?", description: "실제 발생한 직접 재산손해 범위에서 보상하고, 중복 보상액을 조정할 수 있습니다." },
  { id: "loss_verifiability", category: "coverage", order: 7, title: "손해 확인·산정 가능성", question: "사고와 직접·간접 손해를 객관적 자료로 확인하고 산정할 수 있는가?", description: "사고 발생 여부와 손해액을 객관적인 자료로 확인할 수 있는지 검토합니다." },
  { id: "pml_accumulation", category: "coverage", order: 8, title: "최대가능손해(PML)", question: "단일 사고의 PML과 동시다발 누적 위험을 관리할 수 있는가?", description: "사고 한 번에 발생할 수 있는 최대 손해와 누적 위험을 검토합니다." },
  { id: "liability_clarity", category: "coverage", order: 9, title: "책임주체 명확성", question: "사고 관련 책임 주체와 책임 분담 기준을 구분할 수 있는가?", description: "차량 소유자, 제조사, 충전시설과 시설관리자의 책임을 구분할 수 있는지 검토합니다." },
  { id: "wording_clarity", category: "wording", order: 10, title: "약관·보장조건 명확성", question: "보장·면책·지급조건을 객관적인 약관으로 표현할 수 있는가?", description: "보장하는 손해, 보장하지 않는 손해와 보험금 지급요건을 명확히 정할 수 있는지 검토합니다." },
  { id: "pricing_data_readiness", category: "data", order: 11, title: "위험 데이터 확보 가능성", question: "사고·손해·노출 데이터를 바탕으로 요율 검토를 진행할 준비가 되어 있는가?", description: "위험을 지속적으로 확인할 수 있는 자료가 있고, 사고 빈도와 손해액을 추정할 데이터를 확보할 수 있는지 검토합니다." },
  { id: "coverage_gap", category: "coverage", order: 12, title: "보장 공백·중복 여부", question: "기존 보험의 공백과 중복을 구분하고 개정·신규 개발 방향을 정할 수 있는가?", description: "기존 보험과 겹치는 보장과 새롭게 보완할 보장 공백을 확인합니다." },
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

/** 상품성 판단의 우선순위를 정의하는 3단계 기준 그룹입니다. 기준 ID는 기존 값을 유지합니다. */
export const COMMERCIALIZATION_GATE_GROUPS: Record<"insurance_gate" | "productization_gate" | "supplementary_execution", string[]> = {
  insurance_gate: ["insurable_interest", "fortuity", "gambling_like_structure"],
  productization_gate: ["moral_hazard_control", "coverage_gap", "actual_market_demand", "pml_accumulation", "loss_verifiability"],
  supplementary_execution: ["risk_pooling", "wording_clarity", "liability_clarity", "pricing_data_readiness"],
};

export const COMMERCIALIZATION_GATE_GROUP_BY_ID: Record<string, "insurance_gate" | "productization_gate" | "supplementary_execution"> = Object.entries(COMMERCIALIZATION_GATE_GROUPS).reduce((result, [group, ids]) => {
  ids.forEach((id) => { result[id] = group as keyof typeof COMMERCIALIZATION_GATE_GROUPS; });
  return result;
}, {} as Record<string, "insurance_gate" | "productization_gate" | "supplementary_execution">);

const STATUS_LABELS: Record<CommercializationCriterionStatus, string> = {
  pass: "충족",
  needs_review: "보완 필요",
  additional_check: "추가 확인",
  critical: "불충족",
};

export const EVIDENCE_STATUS_LABELS: Record<CommercializationEvidenceStatus, string> = {
  sufficient: "근거 충분",
  external_data_required: "외부자료 필요",
  internal_data_required: "내부자료 필요",
  reviewer_confirmation_required: "자료 확인 필요",
};

export const REVIEWER_DECISION_LABELS: Record<CommercializationReviewerDecision, string> = {
  keep_ai: "AI 판단 유지",
  pass: "충족",
  conditional: "보완 필요",
  needs_review: "보완 필요",
  additional_check: "추가 확인",
  critical: "불충족",
  deferred: "검토 보류",
};

export const RATE_DATA_STATUS_LABELS: Record<CommercializationRateDataStatus, string> = {
  available: "확보",
  partial: "일부 확보",
  missing: "미확보",
  not_applicable: "해당 없음",
};

export const RATE_DATA_FIELD_DEFINITIONS: Array<Pick<CommercializationRateDataPoint, "id" | "label">> = [
  { id: "incident_count", label: "사고 발생 건수" },
  { id: "exposure_volume", label: "대상 차량 또는 시설 노출량" },
  { id: "incident_frequency_by_state", label: "주차·충전 상태별 사고 빈도" },
  { id: "average_loss", label: "평균 손해액" },
  { id: "loss_distribution", label: "손해액 분포" },
  { id: "pml", label: "최대예상손실" },
  { id: "accumulation_loss", label: "집적손해" },
  { id: "unknown_cause_ratio", label: "원인 미상 사고 비율" },
  { id: "reinsurance_material", label: "재보험 검토자료" },
];

const DEFAULT_EVIDENCE_STATUS: Record<string, CommercializationEvidenceStatus> = {
  risk_pooling: "external_data_required",
  insurable_interest: "reviewer_confirmation_required",
  gambling_like_structure: "reviewer_confirmation_required",
  pml_accumulation: "internal_data_required",
  wording_clarity: "reviewer_confirmation_required",
};

const DEFAULT_SOURCE_SECTIONS: Record<string, string[]> = {
  actual_market_demand: ["evidence"],
  risk_pooling: ["evidence"],
  fortuity: ["risk-detail", "evidence"],
  insurable_interest: ["risk-detail", "wording"],
  moral_hazard_control: ["wording", "evidence"],
  gambling_like_structure: ["risk-detail", "wording"],
  loss_verifiability: ["coverage-gap", "evidence"],
  pml_accumulation: ["coverage-gap", "internal_data"],
  liability_clarity: ["coverage-gap", "wording", "reviewer"],
  wording_clarity: ["wording", "reviewer"],
  pricing_data_readiness: ["evidence", "internal_data"],
  coverage_gap: ["coverage-gap", "wording"],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const conditionalStatusFromContext = (context: string): CommercializationCriterionStatus =>
  /근거|자료|확인|미확보|내부|외부|데이터|통계|검토 필요|판단하기 어렵|불명확/i.test(context)
    ? "additional_check"
    : "needs_review";

const asStatus = (value: unknown, context = ""): CommercializationCriterionStatus => {
  const raw = asString(value).trim().toLowerCase();
  if (["pass", "통과", "양호", "긍정", "충족", "가능", "적합"].includes(raw)) return "pass";
  if (["conditional", "조건부", "조건부 통과", "조건부 검토"].includes(raw)) return conditionalStatusFromContext(context);
  if (["additional_check", "additional check", "추가 확인", "추가 확인 필요", "추가 자료 필요", "근거 부족"].includes(raw)) return "additional_check";
  if (["critical", "중대 위험", "불충족", "위험"].includes(raw)) return "critical";
  if (["needs_review", "needs review", "보완 필요"].includes(raw)) return "needs_review";
  // Legacy 미평가/unknown 또는 누락 상태는 추가 확인으로 이관합니다.
  return "additional_check";
};

const asAiDecision = (value: unknown): CommercializationAiDecision | undefined => {
  const raw = asString(value).trim().toLowerCase();
  if (["fulfilled", "pass", "충족", "통과", "양호", "가능", "적합"].includes(raw)) return "fulfilled";
  if (["unfulfilled", "critical", "불충족", "중대 위험", "위험", "실패"].includes(raw)) return "unfulfilled";
  return undefined;
};

const asCriterionReviewStatus = (value: unknown): CommercializationCriterionReviewStatus | undefined => {
  const raw = asString(value).trim().toLowerCase();
  if (["completed", "완료", "검토 완료"].includes(raw)) return "completed";
  if (["pending", "판단 전", "검토 전", "not_started", "in_progress", "additional_data_required"].includes(raw)) return "pending";
  return undefined;
};

const asEvidenceStatus = (value: unknown): CommercializationEvidenceStatus | undefined => {
  const raw = asString(value).trim().toLowerCase();
  if (["sufficient", "충분", "근거 충분"].includes(raw)) return "sufficient";
  if (["external_data_required", "외부 자료 보완 필요", "외부 자료 필요", "외부자료 보완 필요", "외부자료 필요"].includes(raw)) return "external_data_required";
  if (["internal_data_required", "내부 자료 필요", "내부 자료 보완 필요", "내부자료 필요", "내부자료 보완 필요"].includes(raw)) return "internal_data_required";
  if (["reviewer_confirmation_required", "실무자 확인 필요", "담당자 확인 필요", "자료 확인 필요"].includes(raw)) return "reviewer_confirmation_required";
  return undefined;
};

const asConfidence = (value: unknown): CommercializationCriterion["confidence"] => {
  const raw = asString(value).toLowerCase();
  return raw === "high" || raw === "medium" || raw === "low" ? raw : "unknown";
};

const asPriority = (value: unknown): CommercializationNextAction["priority"] => {
  const raw = asString(value).toLowerCase();
  return raw === "high" || raw === "medium" || raw === "low" ? raw : "medium";
};

const asReviewerDecision = (value: unknown, context = ""): CommercializationReviewerDecision => {
  const raw = asString(value).trim().toLowerCase();
  if (raw === "conditional" || raw === "조건부") return conditionalStatusFromContext(context) as CommercializationReviewerDecision;
  if (raw === "additional_check" || raw === "추가 확인") return "additional_check";
  if (["keep_ai", "pass", "needs_review", "critical", "deferred"].includes(raw)) return raw as CommercializationReviewerDecision;
  return "keep_ai";
};

const asReviewStatus = (value: unknown): CommercializationReviewStatus => {
  const raw = asString(value).trim().toLowerCase();
  if (["in_progress", "검토 중"].includes(raw)) return "in_progress";
  if (["additional_data_required", "추가 자료 필요"].includes(raw)) return "additional_data_required";
  if (["completed", "검토 완료"].includes(raw)) return "completed";
  if (["deferred", "보류"].includes(raw)) return "deferred";
  return "not_started";
};

const asRateDataStatus = (value: unknown): CommercializationRateDataStatus => {
  const raw = asString(value).trim().toLowerCase();
  if (["available", "확보"].includes(raw)) return "available";
  if (["partial", "일부 확보"].includes(raw)) return "partial";
  if (["missing", "미확보"].includes(raw)) return "missing";
  return "not_applicable";
};

function normalizeReviewerReview(raw: unknown, legacyMemo = ""): CommercializationReviewerReview {
  const source = isRecord(raw) ? raw : {};
  const decision = asReviewerDecision(source.decision, `${asString(source.changeReason)} ${asString(source.memo)}`);
  const confirmed = source.confirmed === true;
  return {
    decision,
    status: source.status ? asReviewStatus(source.status) : confirmed ? (decision === "deferred" ? "deferred" : "completed") : "not_started",
    action: source.action === "accepted" || source.action === "modified" ? source.action : undefined,
    resultAiDecision: asAiDecision(source.resultAiDecision ?? source.resultStatus),
    acceptedAi: source.acceptedAi === true || (confirmed && decision === "keep_ai"),
    resultStatus: source.resultStatus ? asStatus(source.resultStatus, `${asString(source.changeReason)} ${asString(source.memo)}`) : undefined,
    changeReason: asString(source.changeReason),
    followUpMaterials: asStringArray(source.followUpMaterials),
    deferReason: asString(source.deferReason),
    owner: asString(source.owner, ""),
    memo: asString(source.memo, legacyMemo),
    confirmed,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
  };
}

function normalizeCriterionDetail(
  raw: unknown,
  fallback: CommercializationCriterionDetail,
  summary: string,
  rationale: string,
  evidence: CommercializationEvidence[],
  missingInformation: string[],
  nextActions: CommercializationNextAction[],
): CommercializationCriterionDetail {
  const source = isRecord(raw) ? raw : {};
  const list = (key: string, fallbackItems: readonly string[]): string[] => {
    const items = asStringArray(source[key]);
    return items.length ? items : [...fallbackItems];
  };
  return {
    aiSummary: asString(source.aiSummary, fallback.aiSummary || summary),
    rationale: list("rationale", fallback.rationale.length ? fallback.rationale : [rationale]),
    materials: list("materials", fallback.materials.length ? fallback.materials : evidence.map((item) => `${item.title}${item.sourceName ? ` · ${item.sourceName}` : ""}`)),
    assumptions: list("assumptions", fallback.assumptions),
    limitations: list("limitations", fallback.limitations.length ? fallback.limitations : missingInformation),
    reviewerChecks: list("reviewerChecks", fallback.reviewerChecks.length ? fallback.reviewerChecks : nextActions.map((action) => action.text)),
  };
}

function normalizeRateData(raw: unknown, criterionId: string): CommercializationRateDataPoint[] {
  const source = Array.isArray(raw) ? raw.filter(isRecord) : [];
  if (source.length) {
    return source.map((item, index) => ({
      id: asString(item.id, `${criterionId}-data-${index + 1}`),
      label: asString(item.label, `요율 검토 자료 ${index + 1}`),
      status: asRateDataStatus(item.status),
      value: asString(item.value, ""),
      asOf: asString(item.asOf, ""),
      source: asString(item.source, ""),
      reviewerMemo: asString(item.reviewerMemo, ""),
      owner: asString(item.owner, ""),
      confirmed: item.confirmed === true,
    }));
  }
  if (criterionId !== "pricing_data_readiness") return [];
  return RATE_DATA_FIELD_DEFINITIONS.map((field) => ({ ...field, status: "missing", value: "", asOf: "", source: "", reviewerMemo: "", owner: "", confirmed: false }));
}

function normalizeInputData(
  raw: unknown,
  criterionId: string,
  missingInformation: string[],
  nextActions: CommercializationNextAction[],
): CommercializationInputDataPoint[] {
  const source = Array.isArray(raw) ? raw.filter(isRecord) : [];
  const mapped = source.map((item, index) => ({
    id: asString(item.id, `${criterionId}-input-${index + 1}`),
    label: asString(item.label, asString(item.title, `실무 입력 ${index + 1}`)),
    status: asRateDataStatus(item.status),
    value: asString(item.value, asString(item.summary)),
    asOf: asString(item.asOf),
    source: asString(item.source, asString(item.location)),
    owner: asString(item.owner),
    memo: asString(item.memo, asString(item.reviewerMemo)),
    confirmed: item.confirmed === true,
  }));
  if (mapped.length) return mapped;
  const inferred: Array<{ id: string; label: string; owner?: string }> = [
    ...missingInformation.map((item, index) => ({ id: `${criterionId}-input-missing-${index + 1}`, label: item })),
    ...nextActions.filter((action) => !missingInformation.includes(action.text)).map((action) => ({ id: `${criterionId}-input-action-${action.id}`, label: action.text, owner: action.owner })),
  ];
  return inferred.map((item) => ({
    ...item,
    status: "missing" as const,
    value: "",
    asOf: "",
    source: "",
    owner: item.owner ?? "",
    memo: "",
    confirmed: false,
  }));
}

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
    isMockData: item.isMockData === true,
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
      isMockData: reportEvidence?.isMockData === true,
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

function deriveEvidenceStatus(
  criterionId: string,
  raw: Record<string, unknown> | undefined,
  status: CommercializationCriterionStatus,
  evidence: CommercializationEvidence[],
  missingInformation: string[],
  nextActions: CommercializationNextAction[],
): CommercializationEvidenceStatus {
  const explicit = asEvidenceStatus(raw?.evidenceStatus ?? raw?.verificationStatus);
  if (explicit) return explicit;
  const text = [...missingInformation, ...nextActions.map((action) => `${action.text} ${action.owner}`)].join(" ");
  if (/내부|보험사|손해율|노출|재보험|요율|pml|통계|집적손해/i.test(text)) return "internal_data_required";
  if (/법무|계리|상품개발|담당자|실무자|책임|확인|검토/i.test(text)) return "reviewer_confirmation_required";
  if (/외부|공공|판례|법령|시장|자료|데이터|통계/i.test(text)) return "external_data_required";
  if (status === "pass" && evidence.length > 0) return "sufficient";
  return DEFAULT_EVIDENCE_STATUS[criterionId] ?? (status === "pass" ? "sufficient" : "external_data_required");
}

function deriveSourceSections(criterionId: string, raw: Record<string, unknown> | undefined, evidenceStatus: CommercializationEvidenceStatus): string[] {
  // 상품 구조 추천은 종합평가 이후 단계이므로 선행 분석 출처로 연결하지 않습니다.
  const sourceSections = asStringArray(raw?.sourceSections ?? raw?.sources)
    .filter((source) => !['product', 'proposal', 'product-proposal'].includes(source));
  if (sourceSections.length) return sourceSections;
  if (DEFAULT_SOURCE_SECTIONS[criterionId]) return DEFAULT_SOURCE_SECTIONS[criterionId];
  return evidenceStatus === "internal_data_required" ? ["internal_data"] : ["evidence"];
}

const legacyItemFor = (sourceItems: Record<string, unknown>[], definitionId: string) => {
  const legacyId = Object.entries(LEGACY_ID_MAP).find(([, value]) => value === definitionId)?.[0];
  return sourceItems.find((item) => asString(item.id) === definitionId || asString(item.id) === legacyId);
};

function createCriterion(definition: typeof COMMERCIALIZATION_CRITERION_DEFINITIONS[number], raw: Record<string, unknown> | undefined, report: ReportResult): CommercializationCriterion {
  // Legacy records used `additionalChecks`, while the normalized assessment
  // uses `missingInformation`. Keep both when a record contains both fields so
  // migrating away from the old 미평가 status never drops an existing follow-up.
  const missing = Array.from(new Set([
    ...asStringArray(raw?.missingInformation),
    ...asStringArray(raw?.additionalChecks),
  ]));
  const evidenceIds = asStringArray(raw?.evidenceIds);
  const defaultDetail = FEASIBILITY_CRITERION_DETAILS[definition.id as keyof typeof FEASIBILITY_CRITERION_DETAILS];
  const defaultDetailForUse: CommercializationCriterionDetail | undefined = defaultDetail ? {
    aiSummary: defaultDetail.aiSummary,
    rationale: [...defaultDetail.rationale],
    materials: [...defaultDetail.materials],
    assumptions: [...defaultDetail.assumptions],
    limitations: [...defaultDetail.limitations],
    reviewerChecks: [...defaultDetail.reviewerChecks],
  } : undefined;
  const summary = asString(raw?.summary, asString(raw?.judgment, defaultDetail?.aiSummary ?? "평가 근거를 기준으로 이진 판단을 산출했습니다."));
  const evidence = toEvidence(raw?.evidence, evidenceIds, report, definition.id);
  const nextActions = toActions(raw?.nextActions, missing, definition.id);
  const explicitAiDecision = asAiDecision(raw?.aiDecision);
  const legacyAiDecision = asAiDecision(raw?.status ?? raw?.displayStatus);
  const aiDecision = explicitAiDecision ?? legacyAiDecision ?? "fulfilled";
  const status: CommercializationCriterionStatus = aiDecision === "fulfilled" ? "pass" : "critical";
  const normalizedReviewerReview = normalizeReviewerReview(raw?.reviewerReview, asString(raw?.reviewerMemo, ""));
  const reviewStatus = asCriterionReviewStatus(raw?.reviewStatus) ?? (normalizedReviewerReview.confirmed ? "completed" : "pending");
  const reviewAction = raw?.reviewAction === "accepted" || raw?.reviewAction === "modified"
    ? raw.reviewAction
    : normalizedReviewerReview.action;
  const evidenceStatus = deriveEvidenceStatus(definition.id, raw, status, evidence, missing, nextActions);
  const rationale = asString(raw?.rationale, defaultDetail?.rationale.join(" ") ?? asString(raw?.judgment));
  const analysisDetail = normalizeCriterionDetail(raw?.analysisDetail, defaultDetailForUse ?? {
    aiSummary: summary,
    rationale: [rationale],
    materials: [],
    assumptions: [],
    limitations: [],
    reviewerChecks: [],
  }, summary, rationale, evidence, missing, nextActions);
  return {
    id: definition.id,
    category: definition.category,
    order: definition.order,
    title: definition.title,
    gateGroup: COMMERCIALIZATION_GATE_GROUP_BY_ID[definition.id],
    question: definition.question,
    description: definition.description,
    aiDecision,
    reviewStatus,
    reviewAction,
    analysisDetail,
    status,
    evidenceStatus,
    sourceSections: deriveSourceSections(definition.id, raw, evidenceStatus),
    requiresReviewerInput: raw?.requiresReviewerInput === true || evidenceStatus === "reviewer_confirmation_required",
    summary,
    rationale,
    confirmedFacts: asString(raw?.confirmedFacts, asString(raw?.confirmed_facts)),
    evidence,
    confidence: asConfidence(raw?.confidence),
    missingInformation: missing,
    nextActions,
    isBlocking: raw?.isBlocking === true,
    reviewerMemo: asString(raw?.reviewerMemo),
    reviewerReview: normalizedReviewerReview,
    rateData: normalizeRateData(raw?.rateData, definition.id),
    inputData: normalizeInputData(raw?.inputData, definition.id, missing, nextActions),
    inputChangedAt: typeof raw?.inputChangedAt === "string" ? raw.inputChangedAt : null,
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
  const unresolved = criteria.filter((item) => ["needs_review", "additional_check"].includes(item.status)).map((item) => item.title);
  const actions = criteria.flatMap((item) => item.nextActions.filter((action) => !action.completed).map((action) => action.text));
  if (externalBlocking.length) return { overallStatus: "redesign", reason: `확정된 외부 제약: ${externalBlocking.join(", ")}`, blockingCriteria: externalBlocking, unresolvedCriteria: unresolved, priorityActions: unique(actions).slice(0, 5) };
  if (blockingCriteria.length) return { overallStatus: "redesign", reason: `핵심 불충족: ${blockingCriteria.join(", ")}`, blockingCriteria, unresolvedCriteria: unresolved, priorityActions: unique(actions).slice(0, 5) };
  const coreIds = new Set(COMMERCIALIZATION_GATE_GROUPS.productization_gate);
  const coreUnresolved = criteria.filter((item) => coreIds.has(item.id) && ["needs_review", "additional_check"].includes(item.status));
  if (unresolved.length >= 4 || coreUnresolved.length) return { overallStatus: "needs_more_data", reason: "핵심 판단에 필요한 자료와 검토가 아직 충분하지 않습니다.", blockingCriteria: [], unresolvedCriteria: unresolved, priorityActions: unique(actions).slice(0, 5) };
  const hasUnresolved = criteria.some((item) => ["additional_check", "needs_review"].includes(item.status));
  return { overallStatus: hasUnresolved ? "needs_more_data" : "reviewable", reason: hasUnresolved ? "보완·추가 확인사항을 정리한 뒤 다음 상품화 검토로 진행할 수 있습니다." : "핵심 평가항목이 충족되어 상품화 검토를 진행할 수 있습니다.", blockingCriteria: [], unresolvedCriteria: unresolved, priorityActions: unique(actions).slice(0, 5) };
}

// Public name used by product-development integrations and tests.
export const deriveCommercializationOverallStatus = deriveCommercializationGate;

const criterionGroupOf = (criterion: CommercializationCriterion) => criterion.gateGroup ?? COMMERCIALIZATION_GATE_GROUP_BY_ID[criterion.id];

const isResolvableByAdditionalReview = (criterion: CommercializationCriterion) => {
  const context = [criterion.summary, criterion.rationale, ...criterion.missingInformation, ...criterion.nextActions.map((action) => action.text)].join(" ");
  const hasEvidenceGap = criterion.evidenceStatus !== "sufficient" || criterion.evidence.length === 0;
  const hasResolvableContext = /자료|데이터|확인|검토|보완|정의|기준|입력|담당/i.test(context);
  const hasExplicitFailure = /불가능|무관|사행|유사수신|보험이익 없음|경제적 손해 없음|투자|확정적 수익/i.test(context);
  // A critical result without sufficient evidence is still an additional
  // verification case; only an explicit, evidenced failure is an initial
  // rejection signal.
  return !hasExplicitFailure && (hasEvidenceGap || hasResolvableContext);
};

export function deriveCommercializationAiJudgment(criteria: CommercializationCriterion[]): {
  status: CommercializationAiProductJudgment;
  reason: string;
  insuranceGatePassCount: number;
} {
  const insuranceGate = criteria.filter((criterion) => criterionGroupOf(criterion) === "insurance_gate");
  const productizationGate = criteria.filter((criterion) => criterionGroupOf(criterion) === "productization_gate");
  if (criteria.length !== COMMERCIALIZATION_CRITERION_DEFINITIONS.length || insuranceGate.length !== 3 || productizationGate.length !== 5) {
    return {
      status: "additional_check_required",
      insuranceGatePassCount: insuranceGate.filter((criterion) => criterion.status === "pass").length,
      reason: "12개 평가 기준과 보험성 필수 기준 구성이 모두 준비된 뒤 상품성 판단을 확정할 수 있습니다.",
    };
  }
  const insuranceGatePassCount = insuranceGate.filter((criterion) => criterion.status === "pass").length;
  const hardInsuranceFailures = insuranceGate.filter((criterion) => criterion.status === "critical" && !isResolvableByAdditionalReview(criterion));
  if (hardInsuranceFailures.length) {
    return {
      status: "likely_initial_rejection",
      insuranceGatePassCount,
      reason: `보험성 필수 기준 중 ${hardInsuranceFailures.map((criterion) => criterion.title).join(", ")}에서 현재 근거상 충족하기 어려운 문제가 확인되었습니다.`,
    };
  }

  const unresolvedInsurance = insuranceGate.filter((criterion) => criterion.status !== "pass");
  const unclearProductization = productizationGate.filter((criterion) => (
    criterion.status === "additional_check"
    || criterion.status === "critical"
  ));
  if (unresolvedInsurance.length || unclearProductization.length) {
    const names = [...unresolvedInsurance, ...unclearProductization].map((criterion) => criterion.title).slice(0, 3);
    return {
      status: "additional_check_required",
      insuranceGatePassCount,
      reason: `보험성 필수 기준과 상품화 핵심 기준 중 ${names.join(", ")}의 판단을 위해 자료 보완 또는 담당 부서 확인이 필요합니다.`,
    };
  }

  const followUpCriteria = criteria.filter((criterion) => criterion.status !== "pass");
  const structureReady = ["wording_clarity", "loss_verifiability", "coverage_gap"]
    .every((id) => criteria.find((criterion) => criterion.id === id)?.status === "pass");
  const structuralReason = structureReady
    ? "보장사고·보상하는 손해·보상하지 않는 손해와 지급조건을 약관으로 구체화할 수 있습니다."
    : "보장사고와 손해 산정 구조를 추가로 구체화해야 합니다.";
  const followUpNames = followUpCriteria
    .map((criterion) => criterion.title)
    .slice(0, 4);
  return {
    status: "review_worthy",
    insuranceGatePassCount,
    reason: `보험성 필수 기준 ${insuranceGate.length}개를 모두 충족했고, ${structuralReason}${followUpCriteria.length ? ` 다만 ${followUpNames.join(", ")} 등 ${followUpCriteria.length}개 기준은 자료·운영 보완이 필요합니다.` : ""}`,
  };
}

/**
 * The reviewer product judgment is a separate, human-owned decision. It is
 * only effective after every fixed criterion has a confirmed reviewer result;
 * otherwise consumers must show the explicit undetermined state.
 */
export function deriveCommercializationReviewerProductJudgment(
  assessment: Pick<CommercializationAssessment, "criteria" | "reviewerProductJudgment"> | undefined,
): CommercializationReviewerProductJudgment {
  const criteria = assessment?.criteria ?? [];
  const allReviewed = criteria.length === COMMERCIALIZATION_CRITERION_DEFINITIONS.length
    && criteria.every((criterion) => {
      const review = criterion.reviewerReview;
      return review?.confirmed === true && (review.status === "completed" || review.status === "deferred");
    });
  if (!allReviewed) return "undetermined";
  return assessment?.reviewerProductJudgment ?? "undetermined";
}

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
  const aiJudgment = deriveCommercializationAiJudgment(criteria);
  const oldAssessment: Record<string, unknown> = isRecord(source.overallAssessment) ? source.overallAssessment : {};
  const assessment: CommercializationAssessment = {
    overallStatus: gate.overallStatus,
    overallSummary: asString(existing.overallSummary, asString(oldAssessment.conclusion, asString(source.interpretation, "상품화 검토를 위한 종합 판단입니다."))),
    overallReason: gate.reason,
    topStrengths: asStringArray(existing.topStrengths).length ? asStringArray(existing.topStrengths) : asStringArray(oldAssessment.strengths),
    topRisks: unique([...gate.blockingCriteria, ...gate.unresolvedCriteria, ...asStringArray(existing.topRisks), ...asStringArray(oldAssessment.improvements)]).slice(0, 5),
    priorityActions: unique([...gate.priorityActions, ...asStringArray(existing.priorityActions), ...asStringArray(oldAssessment.entryConditions)]).slice(0, 5),
    aiProductJudgment: aiJudgment.status,
    aiProductJudgmentReason: aiJudgment.reason,
    reviewerProductJudgment: ["has_product_potential", "no_product_potential", "deferred", "undetermined"].includes(asString(existing.reviewerProductJudgment))
      ? asString(existing.reviewerProductJudgment) as CommercializationAssessment["reviewerProductJudgment"]
      : "undetermined",
    criteria,
    discoveryContext,
    externalConstraints,
    reviewedAt: typeof existing.reviewedAt === "string" ? existing.reviewedAt : null,
    inputChangedAt: typeof existing.inputChangedAt === "string" ? existing.inputChangedAt : null,
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
  if (!assessment) return { errors: ["상품화 종합평가 데이터가 없습니다."], warnings: [] };
  const ids = assessment.criteria.map((item) => item.id);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (new Set(ids).size !== ids.length) errors.push("평가항목 ID가 중복되었습니다.");
  const required = COMMERCIALIZATION_CRITERION_DEFINITIONS.map((item) => item.id).filter((id) => !ids.includes(id));
  if (required.length) errors.push(`필수 평가항목이 누락되었습니다: ${required.join(", ")}`);
  assessment.criteria.forEach((item) => {
    if (!item.aiDecision || !["fulfilled", "unfulfilled"].includes(item.aiDecision)) errors.push(`${item.title}: AI 판단을 충족 또는 불충족으로 입력해 주세요.`);
    if (!item.reviewStatus || !["pending", "completed"].includes(item.reviewStatus)) errors.push(`${item.title}: 실무자 판단 상태를 판단 전 또는 완료로 입력해 주세요.`);
    if (!STATUS_LABELS[item.status]) errors.push(`${item.title}: 상태값을 확인해 주세요.`);
    if (!EVIDENCE_STATUS_LABELS[item.evidenceStatus]) errors.push(`${item.title}: 근거 상태를 확인해 주세요.`);
    if (!Array.isArray(item.sourceSections)) errors.push(`${item.title}: 연동 출처를 확인해 주세요.`);
    if (item.status === "critical" && !item.rationale.trim()) errors.push(`${item.title}: 불충족의 판단 근거가 필요합니다.`);
    if (item.isBlocking && !item.rationale.trim()) errors.push(`${item.title}: 차단 항목에는 판단 이유가 필요합니다.`);
    if (item.isBlocking && item.nextActions.length === 0) errors.push(`${item.title}: 차단 항목에는 다음 조치가 필요합니다.`);
    if (item.summary.length > 500 || item.rationale.length > 2000) warnings.push(`${item.title}: 판단 문장이 길어 핵심만 다듬어 주세요.`);
    if (item.status === "pass" && item.evidence.length === 0) warnings.push(`${item.title}: 충족 판단의 근거자료가 없습니다.`);
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
  // Legacy aggregate values remain readable for older persisted reports, but
  // new criterion results use additional_check/needs_review instead.
  conditional: "추가 확인 필요",
  needs_more_data: "추가 자료 필요",
  redesign: "상품 구조 재검토",
  not_viable: "현재 상품화 곤란",
}[status] ?? "보완 필요");

export const commercializationEvidenceStatusLabel = (status: CommercializationEvidenceStatus) => EVIDENCE_STATUS_LABELS[status];
