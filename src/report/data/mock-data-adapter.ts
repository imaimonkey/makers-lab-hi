import "../../../report-reference/mock-risk-data.js";
import "../../../report-reference/mock-report-result.js";

import type { ReportResult, RiskSourceData } from "../types";
import { NOVELTY_ANALYSIS_MOCK } from "./novelty-analysis-mock";

const clone = <T>(value: T): T => {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? value : (JSON.parse(serialized) as T);
};

const getBrowserWindow = (): Window => {
  if (typeof window === "undefined") {
    throw new Error("Mock 리포트 데이터는 브라우저 환경에서만 읽을 수 있습니다.");
  }

  return window;
};

const assertRiskData = (value: RiskSourceData | undefined): RiskSourceData => {
  if (!value || typeof value !== "object" || typeof value.meta?.riskId !== "string") {
    throw new Error("mock-risk-data.js의 전역 데이터를 불러오지 못했습니다.");
  }

  return value;
};

const assertReportResult = (value: ReportResult | undefined): ReportResult => {
  if (!value || typeof value !== "object" || typeof value.meta?.sourceRiskId !== "string") {
    throw new Error("mock-report-result.js의 전역 데이터를 불러오지 못했습니다.");
  }

  return value;
};

// The legacy mock still contains the removed standalone reviewer payload so
// older reference files remain readable. It is intentionally not part of the
// report view model consumed by the current page.
const removeLegacyReviewer = (report: ReportResult): ReportResult => {
  const withoutReviewer = { ...report } as ReportResult & { reviewer?: unknown };
  delete withoutReviewer.reviewer;
  return withoutReviewer;
};

export const getMockRiskData = (): RiskSourceData =>
  clone(assertRiskData(getBrowserWindow().mockRiskData));

export const getMockReportResult = (): ReportResult => {
  const report = clone(assertReportResult(getBrowserWindow().mockReportResult));
  return removeLegacyReviewer({
    ...report,
    productProposal: {
      ...report.productProposal,
      noveltyAnalysis: clone(NOVELTY_ANALYSIS_MOCK),
    },
  });
};

export const getMockReportData = (): {
  riskData: RiskSourceData;
  fallbackReport: ReportResult;
} => ({
  riskData: getMockRiskData(),
  fallbackReport: getMockReportResult(),
});
