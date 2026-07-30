export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

// Compatibility types for the earlier optional reviewer storage adapter. The
// current jh report keeps reviewer decisions inside the briefing/evaluation
// contracts, but these exports keep the legacy adapter type-safe while it
// remains in the repository.
export interface ReviewerChecklistItem extends JsonObject {
  id: string;
  label: string;
  checked: boolean;
}

export interface ReviewerState extends JsonObject {
  status: string;
  statusOptions: string[];
  checklist: ReviewerChecklistItem[];
  memo: string;
  savedAt: string | null;
  localStorageKey: string;
}

export interface RiskMeta extends JsonObject {
  riskId: string;
  analysisMode: string;
  analysisBaseDate: string;
  preparedAt?: string;
  language?: string;
  dataStatus?: string;
  isMockData?: boolean;
  inputEvidenceCount?: number;
  badges?: string[];
}

export interface RiskDefinition extends JsonObject {
  title: string;
  shortTitle: string;
  formalDefinition: string;
  categories: string[];
}

export interface EvidenceItem extends JsonObject {
  id: string;
  type: string;
  title: string;
  source: string;
  referenceDate: string | null;
  usedFor: string[];
  reliability: string;
  isMockData: boolean;
  originalAvailable?: boolean;
}

export interface MissingResearchItem extends JsonObject {
  id: string;
  priority: string;
  topic: string;
  reason: string;
  responsibleTeam?: string;
  status?: string;
  acquisitionType?: "AI·공공 API로 확보 가능" | "사내자료 필요" | "전문가 판단 필요";
  requiredMaterials?: string[];
}

export interface RiskSourceData extends JsonObject {
  schemaVersion: string;
  meta: RiskMeta;
  risk: RiskDefinition;
  demoContext: JsonObject;
  selectionPreview: JsonObject;
  riskSignals: JsonObject[];
  accidentScenario: JsonObject;
  stakeholders: JsonObject[];
  existingCoverage: JsonObject[];
  coverageGapHypotheses: JsonObject[];
  insurabilityInputs: JsonObject;
  referenceDocuments: {
    includedInAiInput: JsonObject[];
    validationOnly?: JsonObject[];
    [key: string]: JsonValue | undefined;
  };
  evidenceItems: EvidenceItem[];
  missingResearch: MissingResearchItem[];
  analysisQuestions: string[];
  expectedReportSections: string[];
  aiGuardrails: JsonObject;
  uiConfig?: {
    loadingSteps?: string[];
    mockLoadingDurationMs?: number;
    [key: string]: JsonValue | undefined;
  };
  disclaimer: string;
}

export interface AiRiskInput extends JsonObject {
  meta: RiskMeta;
  risk: RiskDefinition;
  demoContext: JsonObject;
  selectionPreview: JsonObject;
  riskSignals: JsonObject[];
  accidentScenario: JsonObject;
  stakeholders: JsonObject[];
  existingCoverage: JsonObject[];
  coverageGapHypotheses: JsonObject[];
  insurabilityInputs: JsonObject;
  referenceDocuments: {
    includedInAiInput: JsonObject[];
    [key: string]: JsonValue | undefined;
  };
  evidenceItems: EvidenceItem[];
  missingResearch: MissingResearchItem[];
  analysisQuestions: string[];
  expectedReportSections: string[];
  aiGuardrails: JsonObject;
  disclaimer: string;
}

export type SummaryCardStatus = "긍정" | "조건부 검토" | "보완 필요";

export interface SummaryCard extends JsonObject {
  id: string;
  label: string;
  result: string;
  status: SummaryCardStatus;
  shortReason: string;
  detail: string;
  evidenceIds: string[];
  caveat: string;
}

export interface AiNextAction extends JsonObject {
  id: string;
  action: string;
  reason: string;
  evaluationIds: string[];
  evidenceIds: string[];
  responsibleTeams: string[];
}

export interface AdditionalConfirmation extends JsonObject {
  id: string;
  title: string;
  whatToConfirm: string;
  whyNeeded: string;
  requiredMaterials: string[];
  responsibleTeams: string[];
  evidenceIds: string[];
}

export interface AiSummary extends JsonObject {
  decisionLabel: string;
  primaryConclusionReason: string;
  cards: SummaryCard[];
  overallOpinion: string;
  recommendedNextAction: string;
  nextActions: AiNextAction[];
  additionalConfirmations: AdditionalConfirmation[];
}

export interface TargetSuitabilityOption extends JsonObject {
  id: string;
  target: string;
  suitability: string;
  rank: number;
  reason: string;
  limitation: string;
}

export interface TargetSuitability extends JsonObject {
  recommendation: string;
  recommendationLabel: string;
  options: TargetSuitabilityOption[];
  roleStructure: JsonObject[];
  caution: string;
}

export interface FeasibilityItem extends JsonObject {
  id: string;
  criterion: string;
  status: string;
  displayStatus?: string;
  judgment: string;
  evidenceIds: string[];
  additionalChecks: string[];
}

/** AI 기준 평가 결과. 기존 conditional 값은 정규화 단계에서 needs_review 또는 additional_check로 이관합니다. */
export type CommercializationCriterionStatus = "pass" | "needs_review" | "additional_check" | "critical";
export type CommercializationAiDecision = "fulfilled" | "unfulfilled";
export type CommercializationCriterionReviewStatus = "pending" | "completed";
export type CommercializationReviewAction = "accepted" | "modified";
export interface CommercializationCriterionDetail extends JsonObject {
  aiSummary: string;
  rationale: string[];
  materials: string[];
  assumptions: string[];
  limitations: string[];
  reviewerChecks: string[];
}
export type CommercializationEvidenceStatus = "sufficient" | "external_data_required" | "internal_data_required" | "reviewer_confirmation_required";
export type CommercializationCriterionCategory = "market" | "insurability" | "coverage" | "wording" | "data";
export type CommercializationGateGroup = "insurance_gate" | "productization_gate" | "supplementary_execution";
export type CommercializationConfidence = "high" | "medium" | "low" | "unknown";
export type CommercializationActionPriority = "high" | "medium" | "low";
export type CommercializationOverallStatus = "reviewable" | "conditional" | "needs_more_data" | "redesign" | "not_viable";
export type CommercializationReviewerDecision = "keep_ai" | "pass" | "conditional" | "needs_review" | "additional_check" | "critical" | "deferred";
export type CommercializationReviewStatus = "not_started" | "in_progress" | "additional_data_required" | "completed" | "deferred";
export type CommercializationAiProductJudgment = "review_worthy" | "additional_check_required" | "likely_initial_rejection";
export type CommercializationReviewerProductJudgment = "has_product_potential" | "no_product_potential" | "deferred" | "undetermined";
export type CommercializationRateDataStatus = "available" | "partial" | "missing" | "not_applicable";

/** A reviewer-supplied value used to fill an evidence gap. It is kept
 * separate from the AI result fields so an input can be reviewed before it
 * is used for a future re-analysis. */
export interface CommercializationInputDataPoint extends JsonObject {
  id: string;
  label: string;
  status: CommercializationRateDataStatus;
  value?: string;
  asOf?: string;
  source?: string;
  owner?: string;
  memo?: string;
  confirmed?: boolean;
}

export interface CommercializationEvidence extends JsonObject {
  id: string;
  title: string;
  sourceType: string;
  sourceName: string;
  publishedAt?: string | null;
  collectedAt?: string | null;
  url?: string;
  excerpt?: string;
  isMockData?: boolean;
}

export interface CommercializationNextAction extends JsonObject {
  id: string;
  text: string;
  owner: string;
  dueDate?: string;
  priority: CommercializationActionPriority;
  completed: boolean;
}

export interface CommercializationReviewerReview extends JsonObject {
  decision: CommercializationReviewerDecision;
  status?: CommercializationReviewStatus;
  action?: CommercializationReviewAction;
  resultAiDecision?: CommercializationAiDecision;
  acceptedAi?: boolean;
  resultStatus?: CommercializationCriterionStatus;
  changeReason?: string;
  followUpMaterials?: string[];
  deferReason?: string;
  owner?: string;
  memo?: string;
  confirmed: boolean;
  updatedAt?: string | null;
}

export interface CommercializationRateDataPoint extends JsonObject {
  id: string;
  label: string;
  status: CommercializationRateDataStatus;
  value?: string;
  asOf?: string;
  source?: string;
  reviewerMemo?: string;
  owner?: string;
  confirmed?: boolean;
}

export interface CommercializationCriterion extends JsonObject {
  id: string;
  category: CommercializationCriterionCategory;
  order: number;
  title: string;
  gateGroup: CommercializationGateGroup;
  question: string;
  description: string;
  /** AI 화면 표시용 이진 판단. 기존 status는 저장/API 하위 호환용으로 유지합니다. */
  aiDecision?: CommercializationAiDecision;
  /** AI 판단과 분리된 실무자 검토 상태입니다. */
  reviewStatus?: CommercializationCriterionReviewStatus;
  reviewAction?: CommercializationReviewAction;
  analysisDetail?: CommercializationCriterionDetail;
  status: CommercializationCriterionStatus;
  evidenceStatus: CommercializationEvidenceStatus;
  sourceSections: string[];
  requiresReviewerInput: boolean;
  summary: string;
  rationale: string;
  confirmedFacts?: string;
  evidence: CommercializationEvidence[];
  confidence: CommercializationConfidence;
  missingInformation: string[];
  nextActions: CommercializationNextAction[];
  isBlocking: boolean;
  reviewerMemo?: string;
  reviewerReview?: CommercializationReviewerReview;
  rateData?: CommercializationRateDataPoint[];
  inputData?: CommercializationInputDataPoint[];
  inputChangedAt?: string | null;
  updatedAt?: string | null;
}

export interface CommercializationDiscoveryContext extends JsonObject {
  sourceRiskId?: string;
  discoveryType: "news" | "customer_request" | "sales_request" | "regulation" | "industry" | "reinsurance" | "research" | "other";
  sourceName: string;
  sourceSummary: string;
  marketImpactSummary?: string;
  detailUrl?: string;
}

export interface CommercializationExternalConstraint extends JsonObject {
  id: string;
  title: string;
  summary: string;
  severity: "info" | "warning" | "blocking";
  confirmed: boolean;
  requiresLegalReview: boolean;
  nextAction: string;
}

export interface CommercializationAssessment extends JsonObject {
  overallStatus: CommercializationOverallStatus;
  overallSummary: string;
  overallReason: string;
  topStrengths: string[];

  topRisks: string[];
  priorityActions: string[];
  /** AI의 1차 상품성 스크리닝 결과. 실무자 최종 판단과 분리됩니다. */
  aiProductJudgment?: CommercializationAiProductJudgment;
  aiProductJudgmentReason?: string;
  /** 실무자가 별도로 확정하는 최종 상품성 판단입니다. AI 정규화로 덮어쓰지 않습니다. */
  reviewerProductJudgment?: CommercializationReviewerProductJudgment;
  criteria: CommercializationCriterion[];
  discoveryContext?: CommercializationDiscoveryContext;
  externalConstraints?: CommercializationExternalConstraint[];
  reviewedAt?: string | null;
  /** Timestamp of the latest reviewer input change. This does not alter the
   * AI review timestamp until a re-analysis result is explicitly applied. */
  inputChangedAt?: string | null;
  reviewerMemo?: string;
}

export interface ProductFeasibility extends JsonObject {
  overallStatus: string;
  overallAssessment: {
    conclusion: string;
    strengths: string[];
    improvements: string[];
    entryConditions: string[];
  };
  items: FeasibilityItem[];
  interpretation: string;
  assessment?: CommercializationAssessment;
  discoveryContext?: CommercializationDiscoveryContext;
  externalConstraints?: CommercializationExternalConstraint[];
  commercializationAssessmentVersion?: number;
}

export interface ProductProposal extends JsonObject {
  status: string;
  workingName: string;
  recommendedForm: string;
  alternativeForms: string[];
  expectedPolicyholder: string[];
  expectedInsured: string;
  coveredObject: string;
  coveredEvent: string;
  coveredLoss: string;
  existingInsuranceRelationship: string;
  settlementDirection: string;
  policyPeriodDirection: string;
  coverageLimitDirection: string;
  deductibleDirection: string;
  underwritingCandidates: string[];
  outOfScopeCandidates: string[];
  recommendationReason: string;
  unresolvedItems: string[];
}

export interface BriefingSectionTitles extends JsonObject {
  summary: string;
  core: string;
  proposal: string;
  discussion: string;
  risks: string;
  followUp: string;
  evidence: string;
  reviewer: string;
}

export interface BriefingSectionBadges extends JsonObject {
  proposal: string;
  discussion: string;
  risks: string;
}

export interface BriefingCountItem extends JsonObject {
  label: string;
  value: string;
}

export interface BriefingCoreCard extends JsonObject {
  id: string;
  title: string;
  status: string;
  lines: string[];
}

export interface BriefingRiskItem extends JsonObject {
  title: string;
  risk: string;
  check: string;
  badge?: string;
}

export type BriefingReviewStatus = '미검토' | '검토 중' | '검토 완료';

/** User-editable content for the meeting briefing. It lives with report.ui so
 * existing report persistence can save it without a separate repository. */
export interface BriefingContent extends JsonObject {
  eyebrow: string;
  sectionTitles: BriefingSectionTitles;
  sectionBadges: BriefingSectionBadges;
  conclusion: string;
  decisionStatus: string;
  counts: BriefingCountItem[];
  checks: string[];
  coreCards: BriefingCoreCard[];
  proposalChecks: string[];
  coverageDraft: string;
  proposalDisclaimer: string;
  discussionItems: string[];
  risks: BriefingRiskItem[];
  followUpTasks: string[];
  evidenceMeta: BriefingCountItem[];
  disclaimer: string;
  reviewerStatus: BriefingReviewStatus;
  reviewerOpinion: string;
}

export interface WordingFeasibility extends JsonObject {
  status: string;
  label: string;
  disclaimer: string;
  possibleReasons: string[];
  improvementReasons: string[];
  assessmentCriteria: JsonObject[];
  structureOptions: JsonObject[];
  selectedDraftType: string;
  coverageDraft: string;
  alternativeLiabilityDraft?: string;
  definitions: JsonObject[];
  paymentConditions: JsonObject[];
  exclusionCandidates: JsonObject[];
  ambiguities: JsonObject[];
  referenceDocuments: JsonObject[];
}

export interface ReportMeta extends JsonObject {
  reportId?: string;
  sourceRiskId: string;
  /** 기준 위험 데이터의 시점과 snapshot 계약. 없으면 이전 저장본 호환 상태입니다. */
  sourceAsOf?: string | null;
  sourceAssessmentVersion?: string | null;
  evidenceSnapshotVersion?: string | null;
  revision?: number;
  updatedAt?: string | null;
  title: string;
  riskTitle: string;
  riskCategories: string[];
  analysisMode: string;
  analysisBaseDate: string;
  generatedAt: string | null;
  evidenceCount: number;
  aiStatus: string;
  dataStatus: string;
  isMockData: boolean;
  badges?: string[];
  disclaimer: string;
}

export interface ReportUiConfig extends JsonObject {
  initialState?: string;
  printable?: boolean;
  copyableField?: string;
  expandableSummaryCardIds?: string[];
  expandableFeasibilityItemIds?: string[];
  sectionOrder?: string[];
  labels?: JsonObject;
  briefing?: BriefingContent;
}

export interface ReportResult extends JsonObject {
  schemaVersion?: string;
  meta: ReportMeta;
  aiSummary: AiSummary;
  riskGapSummary: JsonObject;
  targetSuitability: TargetSuitability;
  productFeasibility: ProductFeasibility;
  productProposal: ProductProposal;
  wordingFeasibility: WordingFeasibility;
  evidence: EvidenceItem[];
  missingResearch: MissingResearchItem[];
  validationComparison?: JsonObject;
  ui?: ReportUiConfig;
}

export type ReportGenerationState = "idle" | "loading" | "success" | "fallback";

export type ReportGenerationMode = "success" | "fallback";

export interface ReportValidationWarning {
  code: string;
  path: string;
  message: string;
}

export interface ReportGenerationError {
  code: string;
  message: string;
}

export interface ReportGenerationOutcome {
  mode: ReportGenerationMode;
  report: ReportResult;
  warnings: ReportValidationWarning[];
  error?: ReportGenerationError;
}

export interface PolicyDraftSection {
  id: string;
  title: string;
  content: string;
}

export interface PolicyDraftResult {
  title: string;
  disclaimer: string;
  sections: PolicyDraftSection[];
  isMock: boolean;
}

export interface ReportQuestionAnswer {
  answer: string;
  relatedSections: string[];
  evidenceIds: string[];
  isMock: boolean;
}

export interface PolicyDraftRequest {
  reportContext: JsonObject;
}

export interface ReportQuestionRequest {
  reportContext: JsonObject;
  question: string;
  recentConversation: JsonObject[];
}

export interface ReportContentSaveRequest {
  reportId: string;
  content: ReportResult;
}
