import type {
  AiRiskInput,
  PolicyDraftRequest,
  ReportQuestionRequest,
} from "../types";

export interface ReportProxyRequestOptions {
  signal?: AbortSignal;
}

export interface ReportProxy {
  generateReport(
    riskInput: AiRiskInput,
    options?: ReportProxyRequestOptions,
  ): Promise<unknown>;
  generatePolicyDraft(
    request: PolicyDraftRequest,
    options?: ReportProxyRequestOptions,
  ): Promise<unknown>;
  askReportQuestion(
    request: ReportQuestionRequest,
    options?: ReportProxyRequestOptions,
  ): Promise<unknown>;
}

export class ReportProxyError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ReportProxyError";
    this.code = code;
  }
}

