import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AsyncCheckResult, AsyncValidator } from '@/features/validation'
import type { FormSchema } from '@/types/schema'

import { ASYNC_DEBOUNCE_MS, createFormStore } from '../createFormStore'

const schema: FormSchema = {
  id: 'test-form',
  title: 'Test form',
  steps: [
    {
      id: 'step-1',
      title: 'Step 1',
      fields: [
        {
          id: 'f-a',
          name: 'a',
          type: 'text',
          label: 'A',
          validation: [{ type: 'required' }],
        },
        { id: 'f-b', name: 'b', type: 'text', label: 'B' },
      ],
    },
    {
      id: 'step-2',
      title: 'Step 2',
      fields: [
        {
          id: 'f-c',
          name: 'c',
          type: 'text',
          label: 'C',
          validation: [{ type: 'async', endpoint: '/api/check-c' }],
        },
        {
          id: 'f-d',
          name: 'd',
          type: 'checkbox',
          label: 'D',
          visibleWhen: {
            fieldName: 'c',
            operator: 'asyncStatus',
            value: 'valid',
          },
        },
      ],
    },
    {
      id: 'step-3',
      title: 'Step 3',
      fields: [{ id: 'f-e', name: 'e', type: 'text', label: 'E' }],
    },
  ],
}

/** A controllable stand-in for the network: resolves only when the test
 * tells it to, so async-pipeline tests don't depend on real timers for
 * the "latency" part (fake timers still drive the debounce delay). */
function makeControllableAsyncValidator() {
  const pending: { resolve: (result: AsyncCheckResult) => void }[] = []
  const validator: AsyncValidator = () =>
    new Promise((resolve) => {
      pending.push({ resolve })
    })
  return {
    validator,
    pendingCount: () => pending.length,
    resolveOldest: (result: AsyncCheckResult) => {
      const next = pending.shift()
      if (!next) {
        throw new Error('no pending async validation call to resolve')
      }
      next.resolve(result)
    },
  }
}

describe('createFormStore — validation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('blocks goToNextStep on a required-but-empty field and reveals its error', () => {
    const store = createFormStore(schema)

    store.getState().goToNextStep()

    expect(store.getState().currentStepIndex).toBe(0)
    expect(store.getState().errors['a']).toBe('This field is required.')
    expect(store.getState().touched['a']).toBe(true)
  })

  it('advances once the required field is filled', () => {
    const store = createFormStore(schema)

    store.getState().setFieldValue('a', 'Ada')
    store.getState().goToNextStep()

    expect(store.getState().currentStepIndex).toBe(1)
  })

  it('never blocks going backward, even with a required field left empty', () => {
    const store = createFormStore(schema)
    store.getState().setFieldValue('a', 'Ada')
    store.getState().goToNextStep()
    expect(store.getState().currentStepIndex).toBe(1)

    store.getState().goToPreviousStep()
    expect(store.getState().currentStepIndex).toBe(0)
  })

  it('debounces an async rule, only calling the validator once the delay elapses', async () => {
    const { validator, pendingCount } = makeControllableAsyncValidator()
    const store = createFormStore(schema, validator)
    store.getState().setFieldValue('a', 'Ada')
    store.getState().goToNextStep()

    store.getState().setFieldValue('c', 'PROMO1')
    expect(pendingCount()).toBe(0) // debounce hasn't elapsed yet
    expect(store.getState().asyncStatus['c']).toBe('pending')

    await vi.advanceTimersByTimeAsync(ASYNC_DEBOUNCE_MS)
    expect(pendingCount()).toBe(1)
  })

  it('resolves asyncStatus to valid/invalid and reveals a hidden dependent field once valid', async () => {
    const { validator, resolveOldest } = makeControllableAsyncValidator()
    const store = createFormStore(schema, validator)
    store.getState().setFieldValue('a', 'Ada')
    store.getState().goToNextStep()

    store.getState().setFieldValue('c', 'PROMO1')
    await vi.advanceTimersByTimeAsync(ASYNC_DEBOUNCE_MS)
    resolveOldest({ valid: true })
    await Promise.resolve() // let the .then() microtask run

    expect(store.getState().asyncStatus['c']).toBe('valid')
    expect(store.getState().errors['c']).toBeUndefined()
  })

  it('sets an error (and asyncStatus invalid) when the async check fails', async () => {
    const { validator, resolveOldest } = makeControllableAsyncValidator()
    const store = createFormStore(schema, validator)
    store.getState().setFieldValue('a', 'Ada')
    store.getState().goToNextStep()

    store.getState().setFieldValue('c', 'TAKEN')
    await vi.advanceTimersByTimeAsync(ASYNC_DEBOUNCE_MS)
    resolveOldest({ valid: false, message: 'Already taken.' })
    await Promise.resolve()

    expect(store.getState().asyncStatus['c']).toBe('invalid')
    expect(store.getState().errors['c']).toBe('Already taken.')
  })

  it('marks the field touched once its async check resolves, so the error is visible without a blur', async () => {
    const { validator, resolveOldest } = makeControllableAsyncValidator()
    const store = createFormStore(schema, validator)
    store.getState().setFieldValue('a', 'Ada')
    store.getState().goToNextStep()

    // No setFieldTouched('c') here — only the field's async result should
    // be enough. A UI that masks errors until `touched` would otherwise
    // hide a check the user explicitly triggered by typing a value, just
    // because they hadn't yet clicked or tabbed away.
    store.getState().setFieldValue('c', 'TAKEN')
    expect(store.getState().touched['c']).toBeFalsy()

    await vi.advanceTimersByTimeAsync(ASYNC_DEBOUNCE_MS)
    resolveOldest({ valid: false, message: 'Already taken.' })
    await Promise.resolve()

    expect(store.getState().touched['c']).toBe(true)
    expect(store.getState().errors['c']).toBe('Already taken.')
  })

  it('blocks goToNextStep while an async check on the current step is still pending', async () => {
    const { validator } = makeControllableAsyncValidator()
    const store = createFormStore(schema, validator)
    store.getState().setFieldValue('a', 'Ada')
    store.getState().goToNextStep()

    store.getState().setFieldValue('c', 'PROMO1')
    await vi.advanceTimersByTimeAsync(ASYNC_DEBOUNCE_MS)
    expect(store.getState().asyncStatus['c']).toBe('pending')

    store.getState().goToNextStep()
    expect(store.getState().currentStepIndex).toBe(1) // still on step 2, never left unresolved
  })

  it('only the latest async request for a field can resolve its status (race safety)', async () => {
    const { validator, resolveOldest } = makeControllableAsyncValidator()
    const store = createFormStore(schema, validator)
    store.getState().setFieldValue('a', 'Ada')
    store.getState().goToNextStep()

    store.getState().setFieldValue('c', 'FIRST')
    await vi.advanceTimersByTimeAsync(ASYNC_DEBOUNCE_MS)
    store.getState().setFieldValue('c', 'SECOND')
    await vi.advanceTimersByTimeAsync(ASYNC_DEBOUNCE_MS)

    // Two requests are now in flight; resolve the stale first one as
    // invalid — it must be ignored since a newer request superseded it.
    resolveOldest({ valid: false, message: 'stale result' })
    await Promise.resolve()
    expect(store.getState().asyncStatus['c']).not.toBe('invalid')

    resolveOldest({ valid: true })
    await Promise.resolve()
    expect(store.getState().asyncStatus['c']).toBe('valid')
  })

  it('clears a dependent field when its condition field changes and it becomes hidden again', async () => {
    const { validator, resolveOldest } = makeControllableAsyncValidator()
    const store = createFormStore(schema, validator)
    store.getState().setFieldValue('a', 'Ada')
    store.getState().goToNextStep()

    store.getState().setFieldValue('c', 'PROMO1')
    await vi.advanceTimersByTimeAsync(ASYNC_DEBOUNCE_MS)
    resolveOldest({ valid: true })
    await Promise.resolve()
    expect(store.getState().asyncStatus['c']).toBe('valid')

    store.getState().setFieldValue('d', true)
    store.getState().setFieldTouched('d')
    expect(store.getState().values['d']).toBe(true)

    // Editing c again invalidates its async status, hiding d — d's data
    // should be cleared, not left dangling for a field the user can no
    // longer see or edit.
    store.getState().setFieldValue('c', 'DIFFERENT')

    expect(store.getState().values['d']).toBeNull()
    expect(store.getState().touched['d']).toBe(false)
  })

  it('reset cancels an in-flight async check so a late resolution cannot resurrect stale state', async () => {
    const { validator, resolveOldest, pendingCount } =
      makeControllableAsyncValidator()
    const store = createFormStore(schema, validator)
    store.getState().setFieldValue('a', 'Ada')
    store.getState().goToNextStep()

    store.getState().setFieldValue('c', 'PROMO1')
    await vi.advanceTimersByTimeAsync(ASYNC_DEBOUNCE_MS)
    expect(pendingCount()).toBe(1)
    expect(store.getState().asyncStatus['c']).toBe('pending')

    store.getState().reset()
    expect(store.getState().asyncStatus['c']).toBeUndefined()
    expect(store.getState().currentStepIndex).toBe(0)

    // The request that was in flight at reset time still resolves (its
    // timer/promise isn't literally destroyed), but the store must
    // ignore it — otherwise a reset form could flash back to validated
    // state a moment later.
    resolveOldest({ valid: true })
    await Promise.resolve()
    expect(store.getState().asyncStatus['c']).toBeUndefined()
  })
})
