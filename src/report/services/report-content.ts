import type { ReportResult } from "../types";
import { ensureCommercializationAssessment } from "./commercialization-assessment";

export interface StoredReportContent {
  reportId: string;
  content: unknown;
  updatedAt?: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type EditorPath = Array<string | number>;

export const updateReportContent = (
  report: ReportResult,
  path: EditorPath,
  value: unknown,
): ReportResult => {
  const serialized = JSON.stringify(report);
  const cloned = (serialized ? JSON.parse(serialized) : report) as ReportResult;
  let cursor: Record<string | number, unknown> = cloned as unknown as Record<string | number, unknown>;

  path.forEach((key, index) => {
    if (index === path.length - 1) {
      cursor[key] = value;
      return;
    }
    const nextKey = path[index + 1];
    const existing = cursor[key];
    if (isRecord(existing) || Array.isArray(existing)) {
      cursor = existing as Record<string | number, unknown>;
    } else {
      cursor[key] = typeof nextKey === "number" ? [] : {};
      cursor = cursor[key] as Record<string | number, unknown>;
    }
  });

  return cloned;
};

export const cloneReport = (report: ReportResult): ReportResult => {
  const serialized = JSON.stringify(report);
  return serialized ? (JSON.parse(serialized) as ReportResult) : report;
};

export const parseStoredReportContent = (
  value: unknown,
  sourceRiskId: string,
): ReportResult | null => {
  if (!isRecord(value) || value.reportId !== sourceRiskId || !isRecord(value.content)) {
    return null;
  }

  const content = value.content;
  const meta = content.meta;
  if (!isRecord(meta) || meta.sourceRiskId !== sourceRiskId) {
    return null;
  }

  return ensureCommercializationAssessment(cloneReport(content as unknown as ReportResult));
};
