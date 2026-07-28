import type { RiskReviewRecord } from './types'

export const RISK_REVIEW_STORAGE_KEY = 'hi-risk-studio.risk-reviews.v1'
export const RISK_REVIEW_STORAGE_EVENT = 'hi-risk-studio:risk-review'

const MAX_RECORDS = 30
const MAX_MEMO_LENGTH = 2000
const MAX_REASON_LENGTH = 1200

type RiskReviewStoragePayload = {
  schemaVersion: 1
  records: RiskReviewRecord[]
}

export type RiskReviewStorageErrorCode = 'pii-detected' | 'storage-unavailable'

export class RiskReviewStorageError extends Error {
  code: RiskReviewStorageErrorCode

  constructor(code: RiskReviewStorageErrorCode, message: string) {
    super(message)
    this.name = 'RiskReviewStorageError'
    this.code = code
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isRiskReviewRecord(value: unknown): value is RiskReviewRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<RiskReviewRecord>
  return record.schemaVersion === 1
    && typeof record.riskId === 'string'
    && ['인수심사', '손해사정', '리스크관리'].includes(record.persona ?? '')
    && ['pending', 'completed'].includes(record.status ?? '')
    && typeof record.memo === 'string'
    && typeof record.uncertainty === 'string'
    && typeof record.counterpoint === 'string'
    && isStringArray(record.checkedItemIds)
    && isStringArray(record.evidenceIds)
    && typeof record.createdAt === 'string'
    && typeof record.updatedAt === 'string'
    && record.storageMode === 'local-sample'
}

function readPayload(): RiskReviewStoragePayload {
  if (typeof window === 'undefined') return { schemaVersion: 1, records: [] }
  try {
    const raw = window.localStorage.getItem(RISK_REVIEW_STORAGE_KEY)
    if (!raw) return { schemaVersion: 1, records: [] }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { schemaVersion: 1, records: [] }
    const records = (parsed as { records?: unknown }).records
    return {
      schemaVersion: 1,
      records: Array.isArray(records) ? records.filter(isRiskReviewRecord) : [],
    }
  } catch {
    return { schemaVersion: 1, records: [] }
  }
}

function findPotentialPii(text: string): string | null {
  const patterns: Array<[string, RegExp]> = [
    ['이메일 주소', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ['전화번호', /(?:\+?82[-.\s]?)?0(?:1[016789]|2|[3-6][1-5])[-.\s]?\d{3,4}[-.\s]?\d{4}/],
    ['주민등록번호 형태', /\b\d{6}[-\s]?[1-4]\d{6}\b/],
    ['장문 식별번호', /\b\d{9,16}\b/],
    ['상세 주소 형태', /(?:로|길|동|가)\s*\d{1,4}(?:-\d{1,4})?/],
  ]
  return patterns.find(([, pattern]) => pattern.test(text))?.[0] ?? null
}

function validateNoPii(record: RiskReviewRecord): void {
  const detected = findPotentialPii([record.memo, record.uncertainty, record.counterpoint].join('\n'))
  if (detected) {
    throw new RiskReviewStorageError(
      'pii-detected',
      `${detected}로 보이는 값이 있어 저장하지 않았습니다. 개인 식별정보를 제거해 주세요.`,
    )
  }
}

function normalizeRecord(record: RiskReviewRecord): RiskReviewRecord {
  return {
    ...record,
    memo: record.memo.trim().slice(0, MAX_MEMO_LENGTH),
    uncertainty: record.uncertainty.trim().slice(0, MAX_REASON_LENGTH),
    counterpoint: record.counterpoint.trim().slice(0, MAX_REASON_LENGTH),
    checkedItemIds: [...new Set(record.checkedItemIds)].slice(0, 30),
    evidenceIds: [...new Set(record.evidenceIds)].slice(0, 100),
    updatedAt: new Date().toISOString(),
    storageMode: 'local-sample',
  }
}

/**
 * 발표용 브라우저 로컬 저장소입니다. 위험 ID와 검토 초안만 저장하며 고객 원문,
 * 이름, 연락처, 계약번호, 상세 주소를 저장하거나 서버로 전송하지 않습니다.
 */
export function createRiskReviewRecord(riskId: string, evidenceIds: string[]): RiskReviewRecord {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    riskId,
    persona: '인수심사',
    status: 'pending',
    memo: '',
    uncertainty: '',
    counterpoint: '',
    checkedItemIds: [],
    evidenceIds,
    createdAt: now,
    updatedAt: now,
    storageMode: 'local-sample',
  }
}

export function readRiskReview(riskId: string): RiskReviewRecord | null {
  return readPayload().records.find((record) => record.riskId === riskId) ?? null
}

export function saveRiskReview(record: RiskReviewRecord): RiskReviewRecord {
  if (typeof window === 'undefined') {
    throw new RiskReviewStorageError('storage-unavailable', '브라우저 로컬 저장소를 사용할 수 없습니다.')
  }
  validateNoPii(record)
  const normalized = normalizeRecord(record)
  const payload = readPayload()
  const records = [
    normalized,
    ...payload.records.filter((item) => item.riskId !== normalized.riskId),
  ].slice(0, MAX_RECORDS)
  try {
    window.localStorage.setItem(
      RISK_REVIEW_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, records } satisfies RiskReviewStoragePayload),
    )
    window.dispatchEvent(new CustomEvent(RISK_REVIEW_STORAGE_EVENT, { detail: { riskId: normalized.riskId } }))
    return normalized
  } catch {
    throw new RiskReviewStorageError('storage-unavailable', '브라우저 로컬 저장소에 SAMPLE 초안을 저장하지 못했습니다.')
  }
}
