export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
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

export interface ReportUiConfig extends JsonObject {
  initialState?: string;
  printable?: boolean;
  copyableField?: string;
  expandableSummaryCardIds?: string[];
  expandableFeasibilityItemIds?: string[];
  sectionOrder?: string[];
  labels?: JsonObject;
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
  reviewer?: ReviewerState;
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

