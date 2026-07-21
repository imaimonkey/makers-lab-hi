import type {
  AiRiskInput,
  JsonObject,
  ReportValidationWarning,
} from "../types";

export const REQUIRED_REPORT_SECTIONS = [
  "meta",
  "aiSummary",
  "riskGapSummary",
  "targetSuitability",
  "productFeasibility",
  "productProposal",
  "wordingFeasibility",
  "evidence",
  "missingResearch",
] as const;

export interface ReportValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ReportValidationResult {
  warnings: ReportValidationWarning[];
}

export class ReportValidationError extends Error {
  readonly code = "REPORT_VALIDATION_FAILED";

  readonly issues: ReportValidationIssue[];

  constructor(issues: ReportValidationIssue[]) {
    super(issues[0]?.message ?? "AI 리포트 검증에 실패했습니다.");
    this.name = "ReportValidationError";
    this.issues = issues;
  }
}

const SUMMARY_CARD_ORDER = [
  "target",
  "productDirection",
  "wording",
  "dataReadiness",
];

const FEASIBILITY_ITEM_ORDER = [
  "marketability",
  "fortuity",
  "measurability",
  "responsibility",
  "moralHazard",
  "dataAvailability",
  "differentiation",
  "regulation",
];

const TARGET_OPTION_ORDER = ["corporate", "individual", "hybrid"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const valueAt = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const idsFromArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => (isRecord(item) && typeof item.id === "string" ? item.id : null))
        .filter((id): id is string => id !== null)
    : [];

const isSameOrder = (actual: string[], expected: string[]): boolean =>
  actual.length === expected.length && actual.every((id, index) => id === expected[index]);

const collectReferencedEvidenceIds = (value: unknown): string[] => {
  const ids: string[] = [];
  const seen = new WeakSet<object>();

  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }

    if (!isRecord(current) || seen.has(current)) {
      return;
    }
    seen.add(current);

    for (const [key, nested] of Object.entries(current)) {
      if (key === "evidenceId" && typeof nested === "string") {
        ids.push(nested);
      } else if (key === "evidenceIds" && Array.isArray(nested)) {
        nested.forEach((id) => {
          if (typeof id === "string") {
            ids.push(id);
          }
        });
      } else {
        visit(nested);
      }
    }
  };

  visit(value);
  return ids;
};

const MONEY_OR_PERCENT =
  /(?:[₩$€£¥]\s*\d[\d,.]*(?:\s*[KMB])?|(?:USD|KRW|EUR|JPY|GBP)\s*\d[\d,.]*(?:\s*[KMB])?|\d[\d,.]*\s*(?:(?:천|만|백만|억|조)\s*)?원|\d[\d,.]*\s*(?:천|만|백만|억|조)(?!\s*(?:건|명|대))|\d[\d,.]*\s*(?:%|퍼센트|프로|‰|배))/i;
const FINANCIAL_TERM =
  /(?:보험료|요율|보상\s*한도|보상한도|가입\s*금액|가입금액|자기\s*부담금|자기부담금|공제\s*금액|공제금액)/i;
const FINANCIAL_FIELD =
  /(?:premium|rate|coverage.?limit|sum.?insured|deductible|보험료|요율|보상한도|가입금액|자기부담금|공제금액)/i;
const ASSERTIVE_RECOMMENDATION =
  /(?:확정|책정|설정|적용|권고|추천|제안|제시|산출|결정)(?:하였습니다|했습니다|합니다|한다|함|했다|됩니다|되었습니다|됨|\s*$)/;
const NEGATED_RECOMMENDATION =
  /(?:확정|책정|설정|적용|권고|추천|제안|제시|산출|결정|정)(?:을|를)?\s*하지|(?:확정|책정|설정|적용|권고|추천|제안|제시|산출|결정)하지/;
const NON_FINAL_CONTEXT =
  /(?:가능|수 있음|수 있습니다|후보|잠정|가안|참고|예상|범위|예시|수준|가정|검토|미정|확인 필요|추가 확인|자료 필요|근거 부족|별도 산정|산정 필요|산출 필요|수치 없이|추정)/;
const QUESTION_CONTEXT = /(?:인가|인지|여부|얼마|어느 수준|어떻게|산정할지)|[?？]/;
const SOURCE_FACT_CONTEXT =
  /(?:통계|사고\s*피해액|피해액|손해액\s*자료|원본\s*근거|근거자료|과거\s*사례|기존\s*(?:보험|계약|상품)|현재\s*(?:보험|계약)|지급\s*실적)/;
const SOURCE_REFERENCE_PATH =
  /(?:^|\.)(?:referenceDocuments|evidence|source|statistics?|validationComparison)(?:\.|\[|$)|(?:^|\.)(?:existingPremium|existingRate|existingCoverageLimit)(?:\.|\[|$)/i;

interface TextAtPath {
  path: string;
  value: string | number;
}

const collectRecommendationValues = (value: unknown, rootPath: string): TextAtPath[] => {
  const values: TextAtPath[] = [];
  const seen = new WeakSet<object>();

  const visit = (current: unknown, path: string): void => {
    if (typeof current === "string" || typeof current === "number") {
      values.push({ path, value: current });
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!isRecord(current) || seen.has(current)) {
      return;
    }
    seen.add(current);
    Object.entries(current).forEach(([key, nested]) => visit(nested, `${path}.${key}`));
  };

  visit(value, rootPath);
  return values;
};

const hasDefinitiveFinancialRecommendation = ({ path, value }: TextAtPath): boolean => {
  const text = String(value);
  const finalField = path.split(".").at(-1) ?? "";
  const isFinancialField = FINANCIAL_FIELD.test(finalField);

  if (SOURCE_REFERENCE_PATH.test(path)) {
    return false;
  }

  if (typeof value === "number") {
    return isFinancialField;
  }

  const concernsFinancialTerm = FINANCIAL_TERM.test(text) || isFinancialField;
  if (!concernsFinancialTerm) {
    return false;
  }

  const hasFinancialNumber =
    MONEY_OR_PERCENT.test(text) ||
    (FINANCIAL_TERM.test(text) && /\d(?:[\d,.]*\d)?/.test(text)) ||
    (isFinancialField && /^\s*[+-]?\d[\d,.]*(?:\s*(?:%|퍼센트|프로|‰|배))?\s*$/.test(text));
  if (!hasFinancialNumber) {
    return false;
  }

  if (NEGATED_RECOMMENDATION.test(text)) {
    return false;
  }

  const isAssertive = ASSERTIVE_RECOMMENDATION.test(text);
  const explicitProductContext = /(?:추천|제안|본|신규|개발)\s*상품/.test(text);
  if (SOURCE_FACT_CONTEXT.test(text) && !(isAssertive && explicitProductContext)) {
    return false;
  }

  if (isAssertive) {
    return true;
  }

  if (QUESTION_CONTEXT.test(text) || NON_FINAL_CONTEXT.test(text)) {
    return false;
  }

  // 추천 영역에서 근거·질문·검토 문맥 없이 수치를 단정하면 확정 제시로 본다.
  return true;
};

const findFinancialRecommendationIssues = (
  report: JsonObject,
): ReportValidationIssue[] => {
  const recommendationAreas: Array<[string, unknown]> = [
    ["aiSummary", report.aiSummary],
    ["targetSuitability", report.targetSuitability],
    ["productProposal", report.productProposal],
    ["wordingFeasibility", report.wordingFeasibility],
  ];

  return recommendationAreas
    .flatMap(([path, value]) => collectRecommendationValues(value, path))
    .filter(hasDefinitiveFinancialRecommendation)
    .map(({ path }) => ({
      code: "FINAL_FINANCIAL_VALUE",
      path,
      message:
        "추천 상품의 보험료·요율·보상한도·자기부담금에 확정적인 금액 또는 비율이 포함되었습니다.",
    }));
};

const warning = (code: string, path: string, message: string): ReportValidationWarning => ({
  code,
  path,
  message,
});

export const validateReport = (
  report: JsonObject,
  riskInput: AiRiskInput,
): ReportValidationResult => {
  const fatalIssues: ReportValidationIssue[] = [];
  const warnings: ReportValidationWarning[] = [];

  REQUIRED_REPORT_SECTIONS.forEach((section) => {
    const value = report[section];
    const isArraySection = section === "evidence" || section === "missingResearch";
    const valid = isArraySection ? Array.isArray(value) : isRecord(value);
    if (!valid) {
      fatalIssues.push({
        code: "MISSING_CORE_SECTION",
        path: section,
        message: `AI 응답에 핵심 리포트 영역이 없습니다: ${section}`,
      });
    }
  });

  const sourceRiskId = valueAt(report.meta, "sourceRiskId");
  if (sourceRiskId !== riskInput.meta.riskId) {
    fatalIssues.push({
      code: "SOURCE_RISK_ID_MISMATCH",
      path: "meta.sourceRiskId",
      message: "AI 응답의 위험 ID가 입력데이터와 일치하지 않습니다.",
    });
  }

  const allowedEvidenceIds = new Set(riskInput.evidenceItems.map((item) => item.id));
  const referencedEvidenceIds = collectReferencedEvidenceIds(report);
  const returnedEvidenceIds = idsFromArray(report.evidence);
  const inventedEvidenceIds = [...new Set([...referencedEvidenceIds, ...returnedEvidenceIds])]
    .filter((id) => !allowedEvidenceIds.has(id));

  inventedEvidenceIds.forEach((id) => {
    fatalIssues.push({
      code: "UNKNOWN_EVIDENCE_ID",
      path: "evidence",
      message: `입력에 없는 근거 ID가 포함되었습니다: ${id}`,
    });
  });

  fatalIssues.push(...findFinancialRecommendationIssues(report));

  const cards = valueAt(report.aiSummary, "cards");
  const cardIds = idsFromArray(cards);
  if (!isSameOrder(cardIds, SUMMARY_CARD_ORDER)) {
    warnings.push(
      warning(
        "SUMMARY_CARD_SHAPE_NORMALIZED",
        "aiSummary.cards",
        "핵심 결론 카드의 개수 또는 순서를 기준 구조에 맞게 정규화했습니다.",
      ),
    );
  }

  const nextActions = valueAt(report.aiSummary, "nextActions");
  if (!Array.isArray(nextActions) || nextActions.length === 0) {
    warnings.push(
      warning(
        "NEXT_ACTIONS_NORMALIZED",
        "aiSummary.nextActions",
        "AI 제안 다음 검토 단계를 기존 다음 행동 값으로 보완했습니다.",
      ),
    );
  }

  const overallAssessment = valueAt(report.productFeasibility, "overallAssessment");
  if (!isRecord(overallAssessment)) {
    warnings.push(
      warning(
        "OVERALL_ASSESSMENT_NORMALIZED",
        "productFeasibility.overallAssessment",
        "상품화 가능성 AI 종합평가를 기존 평가항목으로 보완했습니다.",
      ),
    );
  }

  const feasibilityItems = valueAt(report.productFeasibility, "items");
  const feasibilityIds = idsFromArray(feasibilityItems);
  if (!isSameOrder(feasibilityIds, FEASIBILITY_ITEM_ORDER)) {
    warnings.push(
      warning(
        "FEASIBILITY_SHAPE_NORMALIZED",
        "productFeasibility.items",
        "상품화 평가의 개수 또는 순서를 기준 구조에 맞게 정규화했습니다.",
      ),
    );
  }

  const targetOptions = valueAt(report.targetSuitability, "options");
  const targetIds = idsFromArray(targetOptions);
  if (!isSameOrder(targetIds, TARGET_OPTION_ORDER)) {
    warnings.push(
      warning(
        "TARGET_OPTIONS_NORMALIZED",
        "targetSuitability.options",
        "보험 대상 선택 항목의 개수 또는 순서를 기준 구조에 맞게 정규화했습니다.",
      ),
    );
  }

  const evidenceCount = valueAt(report.meta, "evidenceCount");
  if (evidenceCount !== riskInput.evidenceItems.length) {
    warnings.push(
      warning(
        "EVIDENCE_COUNT_NORMALIZED",
        "meta.evidenceCount",
        "근거 개수를 실제 입력 근거 개수로 정규화했습니다.",
      ),
    );
  }

  const missingEvidenceIds = riskInput.evidenceItems
    .map((item) => item.id)
    .filter((id) => !returnedEvidenceIds.includes(id));
  if (missingEvidenceIds.length > 0 || returnedEvidenceIds.length !== riskInput.evidenceItems.length) {
    warnings.push(
      warning(
        "EVIDENCE_LIST_NORMALIZED",
        "evidence",
        "근거 목록의 누락 또는 단순 개수 차이를 입력 근거로 보완했습니다.",
      ),
    );
  }

  if (fatalIssues.length > 0) {
    throw new ReportValidationError(fatalIssues);
  }

  return { warnings };
};

