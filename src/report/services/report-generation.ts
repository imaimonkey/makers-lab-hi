import { normalizePotensResponse, ResponseNormalizationError } from "../api/normalize-response";
import type { ReportProxy } from "../api/report-proxy";
import { ReportProxyError } from "../api/report-proxy";
import type {
  AiRiskInput,
  ReportGenerationError,
  ReportGenerationOutcome,
  ReportResult,
  ReportValidationWarning,
  ReviewerState,
  RiskSourceData,
} from "../types";
import { normalizeReport } from "../validation/normalize-report";
import { ReportValidationError, validateReport } from "../validation/validate-report";
import { COMMON_REQUIRED_CHECKLIST } from "./reviewer-storage";

export const DEFAULT_MIN_LOADING_MS = 2_200;
export const REPORT_REQUEST_TIMEOUT_MS = 90_000;

export const DEFAULT_LOADING_STEPS = [
  "위험 및 보장 공백을 확인하고 있습니다.",
  "보험 대상과 상품 방향을 검토하고 있습니다.",
  "기존 약관과 유사 보장을 비교하고 있습니다.",
  "검토용 리포트를 생성하고 있습니다.",
];

const clone = <T>(value: T): T => {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? value : (JSON.parse(serialized) as T);
};

const wait = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, durationMs);
  });

export const getLoadingSteps = (riskData: RiskSourceData): string[] => {
  const configured = riskData.uiConfig?.loadingSteps;
  const normalized = Array.isArray(configured)
    ? configured.filter(
        (step): step is string => typeof step === "string" && step.trim().length > 0,
      )
    : [];
  return normalized.length > 0 ? normalized : [...DEFAULT_LOADING_STEPS];
};

const getMinimumLoadingDuration = (riskData: RiskSourceData): number => {
  const configured = riskData.uiConfig?.mockLoadingDurationMs;
  return typeof configured === "number" && Number.isFinite(configured) && configured >= 0
    ? Math.min(configured, 10_000)
    : DEFAULT_MIN_LOADING_MS;
};

export const createAiRiskInput = (riskData: RiskSourceData): AiRiskInput => ({
  meta: clone(riskData.meta),
  risk: clone(riskData.risk),
  demoContext: {
    purpose: clone(riskData.demoContext.purpose),
    assumption: clone(riskData.demoContext.assumption),
    importantRule: clone(riskData.demoContext.importantRule),
  },
  selectionPreview: clone(riskData.selectionPreview),
  riskSignals: clone(riskData.riskSignals),
  accidentScenario: clone(riskData.accidentScenario),
  stakeholders: clone(riskData.stakeholders),
  existingCoverage: clone(riskData.existingCoverage),
  coverageGapHypotheses: clone(riskData.coverageGapHypotheses),
  insurabilityInputs: clone(riskData.insurabilityInputs),
  referenceDocuments: {
    includedInAiInput: clone(riskData.referenceDocuments.includedInAiInput),
  },
  evidenceItems: clone(riskData.evidenceItems),
  missingResearch: clone(riskData.missingResearch),
  analysisQuestions: clone(riskData.analysisQuestions),
  expectedReportSections: clone(riskData.expectedReportSections),
  aiGuardrails: clone(riskData.aiGuardrails),
  disclaimer: riskData.disclaimer,
});

const defaultReviewer = (report: ReportResult): ReviewerState => ({
  status: "미검토",
  statusOptions: ["미검토", "검토 중", "추가 조사 필요", "1차 검토 완료", "보류", "제외"],
  checklist: clone(COMMON_REQUIRED_CHECKLIST),
  memo: "",
  savedAt: null,
  localStorageKey: `riskonReportReviewer_${report.meta.reportId ?? report.meta.sourceRiskId}`,
});

const resetReviewer = (report: ReportResult, fallbackReport: ReportResult): ReviewerState => {
  void fallbackReport;
  return defaultReviewer(report);
};

const mergePostValidationDocuments = (
  report: ReportResult,
  fallbackReport: ReportResult,
): ReportResult["wordingFeasibility"]["referenceDocuments"] => {
  const aiDocuments = report.wordingFeasibility.referenceDocuments;
  const validationOnlyDocuments = fallbackReport.wordingFeasibility.referenceDocuments.filter(
    (document) => document.includedInAiInput === false,
  );
  const merged = new Map<string, (typeof aiDocuments)[number]>();

  [...aiDocuments, ...validationOnlyDocuments].forEach((document) => {
    const id = typeof document.id === "string" ? document.id : "";
    if (id) {
      merged.set(id, clone(document));
    }
  });

  return [...merged.values()];
};

const completeReportForUi = (
  report: ReportResult,
  fallbackReport: ReportResult,
  generatedAt: string,
): ReportResult => {
  const fallbackUi = fallbackReport.ui ? clone(fallbackReport.ui) : undefined;
  const reportUi = report.ui ? clone(report.ui) : undefined;
  return {
    ...report,
    meta: {
      ...report.meta,
      generatedAt,
      updatedAt: generatedAt,
      revision: Math.max(1, report.meta.revision ?? 1),
      sourceAsOf: report.meta.sourceAsOf ?? fallbackReport.meta.analysisBaseDate,
      evidenceSnapshotVersion: report.meta.evidenceSnapshotVersion ?? `evidence:${report.meta.evidenceCount}`,
    },
    validationComparison: fallbackReport.validationComparison
      ? clone(fallbackReport.validationComparison)
      : undefined,
    wordingFeasibility: {
      ...report.wordingFeasibility,
      referenceDocuments: mergePostValidationDocuments(report, fallbackReport),
    },
    reviewer: resetReviewer(report, fallbackReport),
    ui: fallbackUi || reportUi
      ? {
        ...fallbackUi,
        ...reportUi,
        labels: {
          ...(fallbackUi?.labels ?? {}),
          ...(reportUi?.labels ?? {}),
        },
        briefing: reportUi?.briefing ?? fallbackUi?.briefing,
      }
      : undefined,
  };
};

const createFallbackReport = (
  fallbackReport: ReportResult,
  generatedAt: string,
): ReportResult => {
  const report = clone(fallbackReport);
  const badges = Array.isArray(report.meta.badges) ? report.meta.badges : [];

  return {
    ...report,
    meta: {
      ...report.meta,
      generatedAt,
      updatedAt: generatedAt,
      revision: Math.max(1, report.meta.revision ?? 1),
      sourceAsOf: report.meta.sourceAsOf ?? fallbackReport.meta.analysisBaseDate,
      evidenceSnapshotVersion: report.meta.evidenceSnapshotVersion ?? `evidence:${report.meta.evidenceCount}`,
      badges: badges.includes("시연용 fallback 데이터")
        ? badges
        : [...badges, "시연용 fallback 데이터"],
    },
    reviewer: defaultReviewer(report),
  };
};

/** Main report is intentionally mock-only in this integration stage. */
export const generateMockReport = async ({
  riskData,
  fallbackReport,
  now = () => new Date(),
}: Pick<GenerateReportOptions, "riskData" | "fallbackReport" | "now">): Promise<ReportGenerationOutcome> => {
  await wait(getMinimumLoadingDuration(riskData));
  const report = clone(fallbackReport);
  return {
    mode: "success",
    report: {
      ...report,
      meta: {
        ...report.meta,
        generatedAt: now().toISOString(),
        updatedAt: now().toISOString(),
        revision: Math.max(1, report.meta.revision ?? 1),
        sourceAsOf: report.meta.sourceAsOf ?? riskData.meta.analysisBaseDate,
        evidenceSnapshotVersion: report.meta.evidenceSnapshotVersion ?? `evidence:${report.meta.evidenceCount}`,
      },
      reviewer: defaultReviewer(report),
    },
    warnings: [],
  };
};

class ReportTimeoutError extends Error {
  readonly code = "REQUEST_TIMEOUT";

  constructor() {
    super("AI 분석 요청 시간이 초과되었습니다.");
    this.name = "ReportTimeoutError";
  }
}

const toGenerationError = (error: unknown): ReportGenerationError => {
  if (error instanceof ReportProxyError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof ReportTimeoutError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof ResponseNormalizationError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof ReportValidationError) {
    return {
      code: error.issues[0]?.code ?? error.code,
      message: error.issues[0]?.message ?? error.message,
    };
  }

  return {
    code: "REPORT_GENERATION_FAILED",
    message: "AI 리포트를 생성하지 못했습니다.",
  };
};

const mergeWarnings = (
  ...groups: ReportValidationWarning[][]
): ReportValidationWarning[] => {
  const unique = new Map<string, ReportValidationWarning>();
  groups.flat().forEach((item) => {
    unique.set(`${item.code}:${item.path}`, item);
  });
  return [...unique.values()];
};

export interface GenerateReportOptions {
  riskData: RiskSourceData;
  fallbackReport: ReportResult;
  reportProxy: ReportProxy;
  signal?: AbortSignal;
  now?: () => Date;
}

export const generateReport = async ({
  riskData,
  fallbackReport,
  reportProxy,
  signal,
  now = () => new Date(),
}: GenerateReportOptions): Promise<ReportGenerationOutcome> => {
  const minimumDelay = wait(getMinimumLoadingDuration(riskData));
  const controller = new AbortController();
  const abortFromCaller = (): void => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (signal?.aborted) {
    controller.abort();
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      controller.abort();
      reject(new ReportTimeoutError());
    }, REPORT_REQUEST_TIMEOUT_MS);
  });

  let outcome: ReportGenerationOutcome;
  try {
    const riskInput = createAiRiskInput(riskData);
    const rawResponse = await Promise.race([
      reportProxy.generateReport(riskInput, { signal: controller.signal }),
      timeout,
    ]);
    const parsedReport = normalizePotensResponse(rawResponse);
    const validation = validateReport(parsedReport, riskInput);
    const normalized = normalizeReport(parsedReport, riskInput);
    const generatedAt = now().toISOString();

    outcome = {
      mode: "success",
      report: completeReportForUi(normalized.report, fallbackReport, generatedAt),
      warnings: mergeWarnings(validation.warnings, normalized.warnings),
    };
  } catch (error) {
    outcome = {
      mode: "fallback",
      report: createFallbackReport(fallbackReport, now().toISOString()),
      warnings: [],
      error: toGenerationError(error),
    };
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
    signal?.removeEventListener("abort", abortFromCaller);
  }

  await minimumDelay;
  return outcome;
};
