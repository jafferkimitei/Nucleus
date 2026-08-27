import type { FieldValue } from '@/types/schema'

export interface AsyncCheckResult {
  valid: boolean
  message?: string
}

/**
 * Resolves one field's `async` validation rule against its current
 * value. A real deployment would `fetch(endpoint, ...)`; this project has
 * no backend to call, so `mockAsyncValidator` simulates the round trip
 * (latency + a small server-side "blocklist") instead. The orchestration
 * around this — debounce, in-flight cancellation, race-safety — is the
 * actual thing Phase 3 needs to prove out (see createFormStore.ts), and
 * that logic is identical whether this function is a mock or a real
 * `fetch`. Swapping in a real backend later is a one-function change.
 */
export type AsyncValidator = (
  value: FieldValue,
  endpoint: string,
) => Promise<AsyncCheckResult>

/** Artificial network latency, kept short enough that a test with real
 * timers doesn't feel slow, long enough to make the "pending" state and
 * debounce/race behavior easy to observe and to test against. */
export const MOCK_ASYNC_LATENCY_MS = 400

/** Per-endpoint "already taken"/"invalid" values, checked
 * case-insensitively. Demo data only — see the module doc comment. */
const BLOCKLISTS: Record<string, string[]> = {
  '/api/check-promo-code': ['USED', 'EXPIRED'],
}

export const mockAsyncValidator: AsyncValidator = (value, endpoint) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const normalized =
        typeof value === 'string' ? value.trim().toUpperCase() : ''
      const blocked = BLOCKLISTS[endpoint]?.includes(normalized) ?? false
      resolve(
        blocked
          ? { valid: false, message: 'This code has already been used.' }
          : { valid: true },
      )
    }, MOCK_ASYNC_LATENCY_MS)
  })
