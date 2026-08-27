import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FormSchema } from '@/types/schema'

import { useWorkflowFormController } from '../useWorkflowFormController'

const schema: FormSchema = {
  id: 'test-form',
  title: 'Test form',
  steps: [
    {
      id: 'step-1',
      title: 'Step 1',
      fields: [{ id: 'f-a', name: 'a', type: 'text', label: 'A' }],
    },
  ],
}

describe('useWorkflowFormController', () => {
  it('derives isDirty from whether any field currently differs from its default', () => {
    const { result } = renderHook(() => useWorkflowFormController(schema))
    expect(result.current.isDirty).toBe(false)

    act(() => {
      result.current.setFieldValue('a', 'typed')
    })
    expect(result.current.isDirty).toBe(true)

    act(() => {
      result.current.setFieldValue('a', null)
    })
    expect(result.current.isDirty).toBe(false)
  })

  it('gives each hook instance its own independent store', () => {
    const first = renderHook(() => useWorkflowFormController(schema))
    const second = renderHook(() => useWorkflowFormController(schema))

    act(() => {
      first.result.current.setFieldValue('a', 'only in the first form')
    })

    expect(first.result.current.values['a']).toBe('only in the first form')
    expect(second.result.current.values['a']).toBeNull()
  })
})
