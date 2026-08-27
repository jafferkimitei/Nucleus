import { describe, expect, it } from 'vitest'

import type { FormSchema } from '@/types/schema'

import { createFormStore } from '../createFormStore'

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
          defaultValue: 'seeded',
        },
        { id: 'f-b', name: 'b', type: 'text', label: 'B' },
      ],
    },
    {
      id: 'step-2',
      title: 'Step 2',
      fields: [{ id: 'f-c', name: 'c', type: 'text', label: 'C' }],
    },
    {
      id: 'step-3',
      title: 'Step 3',
      fields: [{ id: 'f-d', name: 'd', type: 'text', label: 'D' }],
    },
  ],
}

describe('createFormStore', () => {
  it('seeds initial values from each field defaultValue, defaulting to null', () => {
    const store = createFormStore(schema)
    expect(store.getState().values).toEqual({
      a: 'seeded',
      b: null,
      c: null,
      d: null,
    })
  })

  it('updates only the named field on setFieldValue, and tracks dirty against its default', () => {
    const store = createFormStore(schema)

    store.getState().setFieldValue('b', 'typed')
    expect(store.getState().values).toEqual({
      a: 'seeded',
      b: 'typed',
      c: null,
      d: null,
    })
    expect(store.getState().dirty['b']).toBe(true)

    store.getState().setFieldValue('a', 'seeded')
    expect(store.getState().dirty['a']).toBe(false)
  })

  it('marks a field touched on first setFieldTouched and stays idempotent', () => {
    const store = createFormStore(schema)

    store.getState().setFieldTouched('a')
    store.getState().setFieldTouched('a')

    expect(store.getState().touched).toEqual({ a: true })
  })

  it('clamps goToNextStep/goToPreviousStep to schema bounds and records visited steps', () => {
    const store = createFormStore(schema)

    store.getState().goToPreviousStep()
    expect(store.getState().currentStepIndex).toBe(0)

    store.getState().goToNextStep()
    store.getState().goToNextStep()
    store.getState().goToNextStep() // past the last step
    expect(store.getState().currentStepIndex).toBe(2)
    expect(store.getState().visitedStepIndices).toEqual([0, 1, 2])
  })

  it('goToStep allows revisiting any visited step but refuses to skip past the frontier', () => {
    const store = createFormStore(schema)

    store.getState().goToStep(2) // frontier is 0: skipping to step 3 is refused
    expect(store.getState().currentStepIndex).toBe(0)

    store.getState().goToStep(1) // one past the frontier: allowed, same as Next
    expect(store.getState().currentStepIndex).toBe(1)

    store.getState().goToStep(0) // back to an already-visited step: allowed
    expect(store.getState().currentStepIndex).toBe(0)
    expect(store.getState().visitedStepIndices).toEqual([0, 1])

    // The frontier is the furthest index ever visited (1, from the
    // earlier goToStep(1)), not the current index (back to 0) — so index
    // 2 is still exactly one past the frontier and stays reachable.
    store.getState().goToStep(2)
    expect(store.getState().currentStepIndex).toBe(2)
    expect(store.getState().visitedStepIndices).toEqual([0, 1, 2])
  })

  it('setFieldValue on a name absent from the schema does not throw (runValidation guard)', () => {
    const store = createFormStore(schema)

    expect(() => {
      store.getState().setFieldValue('not-a-real-field', 'x')
    }).not.toThrow()
    expect(store.getState().values['not-a-real-field']).toBe('x')
    expect(store.getState().errors['not-a-real-field']).toBeUndefined()
  })

  it('reset restores initial state after values, touched, dirty, and step have all changed', () => {
    const store = createFormStore(schema)

    store.getState().setFieldValue('b', 'typed')
    store.getState().setFieldTouched('b')
    store.getState().goToNextStep()

    store.getState().reset()

    expect(store.getState()).toMatchObject({
      currentStepIndex: 0,
      values: { a: 'seeded', b: null, c: null, d: null },
      touched: {},
      dirty: {},
      visitedStepIndices: [0],
    })
  })
})
