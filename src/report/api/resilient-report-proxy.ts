import type {
  AiRiskInput,
  PolicyDraftRequest,
  ReportContentSaveRequest,
  ReportQuestionRequest,
} from "../types";
import type { ReportProxy, ReportProxyRequestOptions } from "./report-proxy";
import { createGasReportProxy } from "./gas-report-proxy";
import { createLocalReportProxy } from "./local-report-proxy";

const SERVER_STORAGE_MODE = "server" as const;

class ResilientReportProxy implements ReportProxy {
  constructor(
    private readonly primary: ReportProxy | null,
    private readonly local: ReportProxy,
  ) {}

  generateReport(riskInput: AiRiskInput, options?: ReportProxyRequestOptions): Promise<unknown> {
    return (this.primary ?? this.local).generateReport(riskInput, options);
  }

  generatePolicyDraft(request: PolicyDraftRequest, options?: ReportProxyRequestOptions): Promise<unknown> {
    return (this.primary ?? this.local).generatePolicyDraft(request, options);
  }

  askReportQuestion(request: ReportQuestionRequest, options?: ReportProxyRequestOptions): Promise<unknown> {
    return (this.primary ?? this.local).askReportQuestion(request, options);
  }

  async getReportContent(reportId: string): Promise<unknown> {
    if (this.primary?.getReportContent) {
      try {
        const response = await this.primary.getReportContent(reportId);
        if (response) return response;
      } catch {
        // A server read failure falls through to the explicitly marked local copy.
      }
    }
    return this.local.getReportContent?.(reportId) ?? null;
  }

  async saveReportContent(
    request: ReportContentSaveRequest,
    options?: ReportProxyRequestOptions,
  ): Promise<unknown> {
    if (this.primary?.saveReportContent) {
      try {
        const payload = await this.primary.saveReportContent(request, options);
        return { storageMode: SERVER_STORAGE_MODE, payload };
      } catch {
        // Saving remains available as a LOCAL SAMPLE snapshot.
      }
    }
    return this.local.saveReportContent?.(request, options);
  }
}

export const createResilientReportProxy = (
  endpoint: string,
  fetchImpl?: typeof fetch,
): ReportProxy => {
  const primary = (() => {
    try {
      return createGasReportProxy(endpoint, fetchImpl);
    } catch {
      return null;
    }
  })();
  return new ResilientReportProxy(primary, createLocalReportProxy());
};
