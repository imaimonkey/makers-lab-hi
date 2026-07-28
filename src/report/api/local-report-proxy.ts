import type {
  AiRiskInput,
  PolicyDraftRequest,
  ReportContentSaveRequest,
  ReportQuestionRequest,
} from "../types";
import type { ReportProxy, ReportProxyRequestOptions } from "./report-proxy";
import { ReportProxyError } from "./report-proxy";

export const LOCAL_REPORT_STORAGE_MODE = "local-sample" as const;

/**
 * 서버 저장을 사용할 수 없을 때만 쓰는 브라우저 단위 SAMPLE 저장소입니다.
 * 응답에 storageMode를 명시해 화면이 서버 저장으로 오해하지 않게 합니다.
 */
export class LocalReportProxy implements ReportProxy {
  private storageKey(reportId: string): string {
    return `report-content:${encodeURIComponent(reportId)}`;
  }

  private disabledError(): ReportProxyError {
    return new ReportProxyError(
      "API_DISABLED",
      "외부 리포트 API가 연결되지 않아 SAMPLE 생성 결과만 사용할 수 있습니다.",
    );
  }

  generateReport(riskInput: AiRiskInput, options?: ReportProxyRequestOptions): Promise<unknown> {
    void riskInput;
    void options;
    return Promise.reject(this.disabledError());
  }

  generatePolicyDraft(request: PolicyDraftRequest, options?: ReportProxyRequestOptions): Promise<unknown> {
    void request;
    void options;
    return Promise.reject(this.disabledError());
  }

  askReportQuestion(request: ReportQuestionRequest, options?: ReportProxyRequestOptions): Promise<unknown> {
    void request;
    void options;
    return Promise.reject(this.disabledError());
  }

  async getReportContent(reportId: string): Promise<unknown> {
    if (typeof window === "undefined") return null;
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(this.storageKey(reportId));
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const stored = JSON.parse(raw) as Record<string, unknown>;
      return { ...stored, storageMode: LOCAL_REPORT_STORAGE_MODE };
    } catch {
      try {
        window.localStorage.removeItem(this.storageKey(reportId));
      } catch {
        // An unavailable storage implementation cannot be repaired here.
      }
      return null;
    }
  }

  async saveReportContent(
    request: ReportContentSaveRequest,
    options?: ReportProxyRequestOptions,
  ): Promise<unknown> {
    void options;
    if (typeof window === "undefined") {
      throw new ReportProxyError("LOCAL_STORAGE_UNAVAILABLE", "브라우저 저장소를 사용할 수 없습니다.");
    }
    const value = {
      reportId: request.reportId,
      content: request.content,
      updatedAt: new Date().toISOString(),
      storageMode: LOCAL_REPORT_STORAGE_MODE,
    };
    try {
      window.localStorage.setItem(this.storageKey(request.reportId), JSON.stringify(value));
    } catch {
      throw new ReportProxyError("LOCAL_STORAGE_ERROR", "브라우저 저장 공간에 LOCAL SAMPLE 리포트를 저장하지 못했습니다.");
    }
    return value;
  }
}

export const createLocalReportProxy = (): ReportProxy => new LocalReportProxy();
