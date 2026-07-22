import type { JsonObject } from "../types";

const WRAPPER_KEYS = ["response", "result", "message", "content", "data"] as const;
const MAX_WRAPPER_DEPTH = 3;

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const looksLikeReport = (value: JsonObject): boolean =>
  Object.hasOwn(value, "meta") &&
  (Object.hasOwn(value, "aiSummary") ||
    Object.hasOwn(value, "riskGapSummary") ||
    Object.hasOwn(value, "productProposal"));

const stripJsonFence = (value: string): string => {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? trimmed;
};

export class ResponseNormalizationError extends Error {
  readonly code = "INVALID_AI_RESPONSE";

  constructor(message = "AI 응답을 지원되는 JSON 형식으로 읽지 못했습니다.") {
    super(message);
    this.name = "ResponseNormalizationError";
  }
}

const normalizeValue = (
  value: unknown,
  wrapperDepth: number,
  parsedString: boolean,
  allowIncompleteDirect: boolean,
): JsonObject => {
  if (typeof value === "string") {
    if (parsedString) {
      throw new ResponseNormalizationError();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFence(value)) as unknown;
    } catch {
      throw new ResponseNormalizationError();
    }

    return normalizeValue(parsed, wrapperDepth, true, allowIncompleteDirect);
  }

  if (!isRecord(value)) {
    throw new ResponseNormalizationError();
  }

  if (looksLikeReport(value)) {
    return value;
  }

  if (wrapperDepth < MAX_WRAPPER_DEPTH) {
    for (const key of WRAPPER_KEYS) {
      if (!Object.hasOwn(value, key)) {
        continue;
      }

      const nested = value[key];
      if (typeof nested !== "string" && !isRecord(nested)) {
        continue;
      }

      try {
        return normalizeValue(nested, wrapperDepth + 1, parsedString, false);
      } catch (error) {
        if (!(error instanceof ResponseNormalizationError)) {
          throw error;
        }
      }
    }
  }

  if (allowIncompleteDirect) {
    return value;
  }

  throw new ResponseNormalizationError();
};

/**
 * Potens 응답에서 문서화된 최소 형태만 정규화한다.
 * 임의의 provider 호환 envelope나 3단계를 넘는 중첩은 추측하지 않는다.
 */
export const normalizePotensResponse = (rawResponse: unknown): JsonObject =>
  normalizeValue(rawResponse, 0, false, true);

export const normalizeReportResponse = normalizePotensResponse;
