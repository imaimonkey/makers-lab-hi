import type { CustomerSignal } from './types'

export const CUSTOMER_SIGNAL_STORAGE_KEY = 'hi-risk-studio.customer-signals.v1'

export function readCustomerSignals(): CustomerSignal[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(CUSTOMER_SIGNAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) as CustomerSignal[] : []
  } catch {
    return []
  }
}

export function appendCustomerSignal(signal: CustomerSignal): CustomerSignal[] {
  const nextSignals = [signal, ...readCustomerSignals()].slice(0, 20)
  window.localStorage.setItem(CUSTOMER_SIGNAL_STORAGE_KEY, JSON.stringify(nextSignals))
  window.dispatchEvent(new Event('hi-risk-studio:customer-signal'))
  return nextSignals
}

export function clearCustomerSignals(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CUSTOMER_SIGNAL_STORAGE_KEY)
  window.dispatchEvent(new Event('hi-risk-studio:customer-signal'))
}
