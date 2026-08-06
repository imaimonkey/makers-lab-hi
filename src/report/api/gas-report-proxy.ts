import type {
  AiRiskInput,
  PolicyDraftRequest,
  ReportContentSaveRequest,
  ReportQuestionRequest,
} from "../types";
import type { ReportProxy, ReportProxyRequestOptions } from "./report-proxy";
import { ReportProxyError } from "./report-proxy";

interface GasErrorEnvelope {
  ok: false;
  error?: {
    code?: unknown;
    message?: unknown;
  };
}

interface GasSuccessEnvelope {
  ok: true;
  payload: unknown;
}

export interface GasReportProxyOptions {
  endpoint: string;
  fetchImpl?: typeof fetch;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isGasErrorEnvelope = (value: unknown): value is GasErrorEnvelope =>
  isRecord(value) && value.ok === false;

const isGasSuccessEnvelope = (value: unknown): value is GasSuccessEnvelope =>
  isRecord(value) && value.ok === true && Object.hasOwn(value, "payload");

const safeErrorCode = (value: unknown): string =>
  typeof value === "string" && /^[A-Z0-9_]{2,64}$/.test(value)
    ? value
    : "PROXY_ERROR";

export class GasReportProxy implements ReportProxy {
  private readonly endpoint: string;

  private readonly fetchImpl: typeof fetch;

  constructor({ endpoint, fetchImpl = fetch }: GasReportProxyOptions) {
    const normalizedEndpoint = endpoint.trim();
    if (!normalizedEndpoint) {
      throw new ReportProxyError(
        "PROXY_URL_MISSING",
        "GAS 프록시 URL이 설정되지 않았습니다.",
      );
    }

    this.endpoint = normalizedEndpoint;
    this.fetchImpl = fetchImpl;
  }

  private async request(
    body: Record<string, unknown>,
    options: ReportProxyRequestOptions = {},
  ): Promise<unknown> {
    let response: Response;

    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body: JSON.stringify(body),
        redirect: "follow",
        signal: options.signal,
      });
    } catch {
      if (options.signal?.aborted) {
        throw new ReportProxyError("REQUEST_ABORTED", "리포트 생성 요청이 중단되었습니다.");
      }

      throw new ReportProxyError("NETWORK_ERROR", "GAS 프록시에 연결하지 못했습니다.");
    }

    if (!response.ok) {
      throw new ReportProxyError(
        "PROXY_HTTP_ERROR",
        `GAS 프록시 요청이 실패했습니다. (HTTP ${response.status})`,
      );
    }

    let envelope: unknown;
    try {
      envelope = JSON.parse(await response.text()) as unknown;
    } catch {
      throw new ReportProxyError(
        "PROXY_RESPONSE_INVALID",
        "GAS 프록시 응답을 JSON으로 읽지 못했습니다.",
      );
    }

    if (isGasErrorEnvelope(envelope)) {
      throw new ReportProxyError(
        safeErrorCode(envelope.error?.code),
        typeof envelope.error?.message === "string"
          ? envelope.error.message
          : "리포트 생성 요청을 처리하지 못했습니다.",
      );
    }

    if (isGasSuccessEnvelope(envelope)) {
      return envelope.payload;
    }

    throw new ReportProxyError(
      "PROXY_RESPONSE_INVALID",
      "GAS 프록시 응답 형식이 올바르지 않습니다.",
    );
  }

  generateReport(
    riskInput: AiRiskInput,
    options: ReportProxyRequestOptions = {},
  ): Promise<unknown> {
    return this.request({ action: "generateReport", riskInput }, options);
  }

  generatePolicyDraft(
    request: PolicyDraftRequest,
    options: ReportProxyRequestOptions = {},
  ): Promise<unknown> {
    return this.request(
      { action: "generatePolicyDraft", reportContext: request.reportContext },
      options,
    );
  }

  askReportQuestion(
    request: ReportQuestionRequest,
    options: ReportProxyRequestOptions = {},
  ): Promise<unknown> {
    return this.request(
      {
        action: "askReportQuestion",
        reportContext: request.reportContext,
        question: request.question,
        recentConversation: request.recentConversation,
        policyContext: request.policyContext,
      },
      options,
    );
  }

  getReportContent(reportId: string): Promise<unknown> {
    return this.request({ action: "getReportContent", reportId });
  }

  saveReportContent(
    request: ReportContentSaveRequest,
    options: ReportProxyRequestOptions = {},
  ): Promise<unknown> {
    return this.request(
      {
        action: "saveReportContent",
        reportId: request.reportId,
        content: request.content,
      },
      options,
    );
  }
}

export const createGasReportProxy = (
  endpoint: string,
  fetchImpl?: typeof fetch,
): ReportProxy => new GasReportProxy({ endpoint, fetchImpl });
