import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FormSchema } from '@/types/schema'

import { useLocalFormController } from '../useLocalFormController'

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
  ],
}

describe('useLocalFormController', () => {
  it('seeds initial values from each field defaultValue, defaulting to null', () => {
    const { result } = renderHook(() => useLocalFormController(schema))
    expect(result.current.values).toEqual({ a: 'seeded', b: null, c: null })
  })

  it('updates only the named field on setFieldValue', () => {
    const { result } = renderHook(() => useLocalFormController(schema))
    act(() => {
      result.current.setFieldValue('b', 'typed')
    })
    expect(result.current.values).toEqual({ a: 'seeded', b: 'typed', c: null })
  })

  it('clamps step navigation to the schema bounds', () => {
    const { result } = renderHook(() => useLocalFormController(schema))

    act(() => {
      result.current.goToPreviousStep()
    })
    expect(result.current.currentStepIndex).toBe(0)

    act(() => {
      result.current.goToNextStep()
    })
    expect(result.current.currentStepIndex).toBe(1)

    act(() => {
      result.current.goToNextStep()
    })
    expect(result.current.currentStepIndex).toBe(1) // only 2 steps, clamped
  })
})
