export type SalesIntakeType = 'field-report' | 'product-proposal'

export type SalesChannel = 'branch' | 'corporate' | 'partner' | 'customer-touchpoint' | 'other'

export type SalesFollowUp = 'candidate-review' | 'product-team' | 'source-request' | 'none'

export type SalesIntakeDraft = {
  type: SalesIntakeType
  channel: SalesChannel
  subject: string
  observedRisk: string
  proposal: string
  followUp: SalesFollowUp
}

export type SalesIntakeSubmission = SalesIntakeDraft & {
  id: string
  submittedAt: string
  status: 'received'
}

export type SalesIntakeAppendResult = {
  submission: SalesIntakeSubmission
  persisted: boolean
}

const storageKey = 'hi-risk-studio.sales-intake.v1'

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `sales-${Date.now()}`
}

export function readSalesSubmissions(): SalesIntakeSubmission[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is SalesIntakeSubmission => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<SalesIntakeSubmission>
      return (
        typeof candidate.id === 'string'
        && typeof candidate.subject === 'string'
        && typeof candidate.observedRisk === 'string'
        && typeof candidate.proposal === 'string'
        && typeof candidate.submittedAt === 'string'
        && candidate.status === 'received'
      )
    })
  } catch {
    return []
  }
}

export function appendSalesSubmission(draft: SalesIntakeDraft): SalesIntakeAppendResult {
  const submission: SalesIntakeSubmission = {
    ...draft,
    id: createId(),
    submittedAt: new Date().toISOString(),
    status: 'received',
  }

  if (typeof window === 'undefined') {
    return { submission, persisted: false }
  }

  try {
    const next = [submission, ...readSalesSubmissions()].slice(0, 30)
    window.localStorage.setItem(storageKey, JSON.stringify(next))
    window.dispatchEvent(new Event('hi-risk-studio:sales-intake'))
    return { submission, persisted: true }
  } catch {
    return { submission, persisted: false }
  }
}
