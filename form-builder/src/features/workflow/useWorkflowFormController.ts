import { useMemo, useState } from 'react'

import { useStore } from 'zustand'

import type { FormSchema } from '@/types/schema'

import { createFormStore } from './createFormStore'

import type { FormController } from './types'

/**
 * Phase 2's real form controller. Returns the same `FormController` shape
 * FormRenderer/StepRenderer/Field already consume, now backed by a
 * per-instance Zustand store (see createFormStore's doc comment) instead
 * of Phase 1's plain-`useState` stand-in, adding step branching
 * (`goToStep`/`visitedStepIndices`) and touched/dirty tracking.
 *
 * Store actions (`setFieldValue`, `goToNextStep`, ...) are referentially
 * stable for the store's lifetime — Zustand's `set` shallow-merges into a
 * new state object, but action functions not touched by a given `set`
 * call carry over unchanged. That's what keeps `Field`'s memoization
 * effective (see Field.tsx): the callbacks it receives don't change
 * identity just because some other field's value changed.
 *
 * Like Phase 1's stand-in, this does not react to `schema` changing
 * identity after mount — the store is created once, lazily. Mounting a
 * different schema into a long-lived component should use a `key` (e.g.
 * `key={schema.id}`) on the consumer to force a fresh instance.
 */
export function useWorkflowFormController(schema: FormSchema): FormController {
  const [store] = useState(() => createFormStore(schema))
  const state = useStore(store)
  const isDirty = useMemo(
    () => Object.values(state.dirty).some(Boolean),
    [state.dirty],
  )

  return { ...state, isDirty }
}
