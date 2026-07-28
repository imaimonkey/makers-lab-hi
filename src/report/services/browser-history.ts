type HistoryStatePatch = Record<string, unknown>

export type ReportNavigation = (to: string) => void

/**
 * Keep React Router's browser-history bookkeeping when the report view adds
 * its own query/hash state. Directly replacing history.state drops fields
 * such as idx and key, which can make later router navigation stop working.
 */
export function pushPreservingHistoryState(
  url: URL | string,
  patch: HistoryStatePatch = {},
) {
  if (typeof window === 'undefined') return

  const currentState = window.history.state
  const baseState = currentState && typeof currentState === 'object'
    ? currentState as Record<string, unknown>
    : {}

  window.history.pushState({ ...baseState, ...patch }, '', url)
}
