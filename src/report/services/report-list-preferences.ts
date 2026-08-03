export type ReportListPreference = {
  pinned: boolean
  reviewed: boolean
}

export type ReportListPreferences = Record<string, ReportListPreference>

const STORAGE_KEY = 'riskonReportListPreferences:v1'

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const normalizePreference = (value: unknown): ReportListPreference => {
  const record = isRecord(value) ? value : {}
  return {
    pinned: record.pinned === true,
    reviewed: record.reviewed === true,
  }
}

const normalizePreferences = (value: unknown): ReportListPreferences => {
  if (!isRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).map(([reportId, preference]) => [reportId, normalizePreference(preference)]))
}

export const browserReportListPreferences = {
  load(): ReportListPreferences {
    if (typeof window === 'undefined') return {}
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? normalizePreferences(JSON.parse(raw) as unknown) : {}
    } catch {
      return {}
    }
  },
  save(preferences: ReportListPreferences): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Local storage can be unavailable in private browsing or restricted contexts.
    }
  },
}
