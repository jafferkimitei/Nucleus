import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MOCK_ASYNC_LATENCY_MS, mockAsyncValidator } from '../asyncValidator'

describe('mockAsyncValidator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("resolves valid for a value not on the endpoint's blocklist", async () => {
    const promise = mockAsyncValidator('FRESH50', '/api/check-promo-code')
    await vi.advanceTimersByTimeAsync(MOCK_ASYNC_LATENCY_MS)
    await expect(promise).resolves.toEqual({ valid: true })
  })

  it('resolves invalid, with a message, for a blocklisted value', async () => {
    const promise = mockAsyncValidator('USED', '/api/check-promo-code')
    await vi.advanceTimersByTimeAsync(MOCK_ASYNC_LATENCY_MS)
    const result = await promise
    expect(result.valid).toBe(false)
    expect(result.message).toBeTruthy()
  })

  it('checks case-insensitively', async () => {
    const promise = mockAsyncValidator('used', '/api/check-promo-code')
    await vi.advanceTimersByTimeAsync(MOCK_ASYNC_LATENCY_MS)
    await expect(promise).resolves.toMatchObject({ valid: false })
  })

  it('treats a non-string value as never blocklisted (async rules only ever apply to text-like fields)', async () => {
    const promise = mockAsyncValidator(42, '/api/check-promo-code')
    await vi.advanceTimersByTimeAsync(MOCK_ASYNC_LATENCY_MS)
    await expect(promise).resolves.toEqual({ valid: true })
  })

  it('treats an endpoint with no configured blocklist as always valid', async () => {
    const promise = mockAsyncValidator('anything', '/api/unknown-endpoint')
    await vi.advanceTimersByTimeAsync(MOCK_ASYNC_LATENCY_MS)
    await expect(promise).resolves.toEqual({ valid: true })
  })

  it('does not resolve before the simulated latency elapses', async () => {
    const onResolve = vi.fn()
    void mockAsyncValidator('FRESH50', '/api/check-promo-code').then(onResolve)

    await vi.advanceTimersByTimeAsync(MOCK_ASYNC_LATENCY_MS - 50)
    expect(onResolve).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(50)
    expect(onResolve).toHaveBeenCalled()
  })
})
