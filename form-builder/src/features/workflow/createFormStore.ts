import { createStore } from 'zustand/vanilla'

import type { FieldValue, FormSchema } from '@/types/schema'

import type { FormStoreState } from './types'

function initialValuesFor(schema: FormSchema): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {}
  for (const step of schema.steps) {
    for (const field of step.fields) {
      values[field.name] = field.defaultValue ?? null
    }
  }
  return values
}

function withVisited(index: number, visited: number[]): number[] {
  return visited.includes(index)
    ? visited
    : [...visited, index].sort((a, b) => a - b)
}

export type FormStore = ReturnType<typeof createFormStore>

/**
 * Builds one form's Zustand store. Deliberately a factory, not a
 * module-level `create(...)` singleton: a singleton would leak state
 * between two forms mounted at once, or between successive schemas
 * loaded into one long-lived component — exactly the bug a *reusable*
 * form renderer can't afford. `useWorkflowFormController` calls this once
 * per component instance via `useState`'s lazy initializer.
 */
export function createFormStore(schema: FormSchema) {
  const lastStepIndex = Math.max(schema.steps.length - 1, 0)
  const initialValues = initialValuesFor(schema)

  return createStore<FormStoreState>()((set, get) => ({
    currentStepIndex: 0,
    values: initialValues,
    errors: {},
    touched: {},
    dirty: {},
    visitedStepIndices: [0],

    setFieldValue: (name, value) => {
      set((state) => ({
        values: { ...state.values, [name]: value },
        dirty: {
          ...state.dirty,
          [name]: value !== (initialValues[name] ?? null),
        },
      }))
    },

    setFieldTouched: (name) => {
      if (get().touched[name]) {
        return
      }
      set((state) => ({ touched: { ...state.touched, [name]: true } }))
    },

    goToStep: (index) => {
      const state = get()
      const clamped = Math.min(Math.max(index, 0), lastStepIndex)
      const furthestVisited = Math.max(...state.visitedStepIndices)
      // The branching rule: any visited step is always reachable, but you
      // can't jump past the one step immediately beyond it.
      if (clamped > furthestVisited + 1) {
        return
      }
      set({
        currentStepIndex: clamped,
        visitedStepIndices: withVisited(clamped, state.visitedStepIndices),
      })
    },

    goToNextStep: () => {
      get().goToStep(get().currentStepIndex + 1)
    },

    goToPreviousStep: () => {
      get().goToStep(get().currentStepIndex - 1)
    },

    reset: () => {
      set({
        currentStepIndex: 0,
        values: initialValues,
        errors: {},
        touched: {},
        dirty: {},
        visitedStepIndices: [0],
      })
    },
  }))
}
