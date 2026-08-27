import { createStore } from 'zustand/vanilla'

import {
  buildFieldIndex,
  isFieldVisible,
  mockAsyncValidator,
  validateSyncRules,
  type AsyncValidator,
} from '@/features/validation'
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

/** How long to wait after the last keystroke before firing a field's
 * `async` rule — avoids hitting the endpoint on every character typed.
 * Exported so tests can advance fake timers by exactly this much instead
 * of guessing. */
export const ASYNC_DEBOUNCE_MS = 300

export type FormStore = ReturnType<typeof createFormStore>

/**
 * Builds one form's Zustand store. Deliberately a factory, not a
 * module-level `create(...)` singleton: a singleton would leak state
 * between two forms mounted at once, or between successive schemas
 * loaded into one long-lived component — exactly the bug a *reusable*
 * form renderer can't afford. `useWorkflowFormController` calls this once
 * per component instance via `useState`'s lazy initializer.
 *
 * `asyncValidator` is injectable (defaults to the demo mock in
 * `@/features/validation`) purely so tests can swap in a fast,
 * deterministic fake instead of waiting out real debounce/latency
 * timers.
 */
export function createFormStore(
  schema: FormSchema,
  asyncValidator: AsyncValidator = mockAsyncValidator,
) {
  const lastStepIndex = Math.max(schema.steps.length - 1, 0)
  const initialValues = initialValuesFor(schema)
  const { fieldsByName, dependentsByFieldName } = buildFieldIndex(schema)

  // Side-effect bookkeeping for the async validation pipeline. This is
  // deliberately *not* store state: timer handles and request counters
  // aren't serializable data the UI reads, they're implementation detail
  // the store's actions close over. One entry per field name.
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const asyncRequestIds = new Map<string, number>()
  // The value each field's async rule was last scheduled/resolved
  // against — lets scheduleAsyncValidation no-op when nothing actually
  // changed. Without this, re-validating on every blur *and* on every
  // (possibly repeated, possibly blocked) advance attempt would refire
  // the same in-flight check each time — see the "attempted advance
  // while pending" tests for the scenario this guards against.
  const lastAsyncCheckedValue = new Map<string, FieldValue>()

  function cancelAsyncValidation(name: string): void {
    const timer = debounceTimers.get(name)
    if (timer) {
      clearTimeout(timer)
      debounceTimers.delete(name)
    }
    // Bump the request id even with no in-flight timer: an already-fired
    // request awaiting its (mocked) network latency is still in flight
    // and must be told, on resolution, that it's been superseded.
    asyncRequestIds.set(name, (asyncRequestIds.get(name) ?? 0) + 1)
    lastAsyncCheckedValue.delete(name)
  }

  return createStore<FormStoreState>()((set, get) => {
    /** Clears value/error/touched/dirty/asyncStatus for every field that
     * `changedFieldNames` just made invisible, cascading through any
     * fields whose own visibility depends on *those* — so hiding a field
     * never leaves stale data behind for a form the builder later shows
     * again. One atomic `set` for the whole cascade. */
    function recomputeVisibilityCascade(changedFieldNames: string[]): void {
      set((state) => {
        let { values, errors, touched, dirty, asyncStatus } = state
        let changed = false
        const queue = [...changedFieldNames]
        const processed = new Set<string>()

        while (queue.length > 0) {
          const current = queue.shift()
          if (current === undefined || processed.has(current)) {
            continue
          }
          processed.add(current)

          const dependents = dependentsByFieldName.get(current)
          if (!dependents) {
            continue
          }

          for (const dependent of dependents) {
            const n = dependent.name
            if (isFieldVisible(dependent, values, asyncStatus)) {
              continue
            }
            const alreadyClear =
              (values[n] ?? null) === null &&
              errors[n] === undefined &&
              !touched[n] &&
              !dirty[n] &&
              asyncStatus[n] === undefined
            if (alreadyClear) {
              continue
            }
            changed = true
            values = { ...values, [n]: null }
            errors = { ...errors, [n]: undefined }
            touched = { ...touched, [n]: false }
            dirty = { ...dirty, [n]: false }
            asyncStatus = { ...asyncStatus }
            Reflect.deleteProperty(asyncStatus, n)
            cancelAsyncValidation(n)
            queue.push(n)
          }
        }

        return changed ? { values, errors, touched, dirty, asyncStatus } : {}
      })
    }

    function scheduleAsyncValidation(
      name: string,
      value: FieldValue,
      endpoint: string,
    ): void {
      if (value === null || value === '') {
        cancelAsyncValidation(name)
        set((state) => {
          const asyncStatus = { ...state.asyncStatus }
          Reflect.deleteProperty(asyncStatus, name)
          return { asyncStatus }
        })
        recomputeVisibilityCascade([name])
        return
      }

      if (lastAsyncCheckedValue.get(name) === value) {
        // Already scheduled/checking/resolved for this exact value —
        // nothing changed, so there's nothing new to check.
        return
      }
      lastAsyncCheckedValue.set(name, value)

      const existing = debounceTimers.get(name)
      if (existing) {
        clearTimeout(existing)
      }

      const requestId = (asyncRequestIds.get(name) ?? 0) + 1
      asyncRequestIds.set(name, requestId)
      set((state) => ({
        asyncStatus: { ...state.asyncStatus, [name]: 'pending' },
      }))

      const timer = setTimeout(() => {
        void asyncValidator(value, endpoint).then((result) => {
          // Superseded by a newer keystroke/attempt while this was in
          // flight — its result is stale, drop it.
          if (asyncRequestIds.get(name) !== requestId) {
            return
          }
          set((state) => ({
            asyncStatus: {
              ...state.asyncStatus,
              [name]: result.valid ? 'valid' : 'invalid',
            },
            errors: {
              ...state.errors,
              [name]: result.valid
                ? undefined
                : (result.message ?? 'This value is invalid.'),
            },
            // An async result only ever arrives for a field the user has
            // actually typed a real (non-empty) value into — there's no
            // "idle, empty, untouched" case to protect here the way there
            // is for sync errors. Mark it touched now so the result (a
            // "Checking…" resolving to a pass/fail) surfaces the instant
            // it lands, without requiring the user to first blur away.
            touched: state.touched[name]
              ? state.touched
              : { ...state.touched, [name]: true },
          }))
          recomputeVisibilityCascade([name])
        })
      }, ASYNC_DEBOUNCE_MS)
      debounceTimers.set(name, timer)
    }

    /** The single entry point for (re)validating one field: runs its
     * sync rules first (declaration order, first violation wins); only
     * once those pass does an `async` rule, if any, get scheduled. A
     * sync failure cancels any async check in flight — there's no point
     * asking "is this available?" about a value that's already invalid. */
    function runValidation(name: string, value: FieldValue): void {
      const field = fieldsByName.get(name)
      if (!field) {
        return
      }

      const syncError = validateSyncRules(value, field.validation)
      if (syncError) {
        cancelAsyncValidation(name)
        set((state) => {
          const asyncStatus = { ...state.asyncStatus }
          Reflect.deleteProperty(asyncStatus, name)
          return {
            errors: { ...state.errors, [name]: syncError },
            asyncStatus,
          }
        })
        return
      }

      set((state) => ({ errors: { ...state.errors, [name]: undefined } }))

      const asyncRule = field.validation?.find((rule) => rule.type === 'async')
      if (asyncRule) {
        scheduleAsyncValidation(name, value, asyncRule.endpoint)
      }
    }

    return {
      currentStepIndex: 0,
      values: initialValues,
      errors: {},
      touched: {},
      dirty: {},
      asyncStatus: {},
      visitedStepIndices: [0],

      setFieldValue: (name, value) => {
        set((state) => ({
          values: { ...state.values, [name]: value },
          dirty: {
            ...state.dirty,
            [name]: value !== (initialValues[name] ?? null),
          },
        }))
        runValidation(name, value)
        recomputeVisibilityCascade([name])
      },

      setFieldTouched: (name) => {
        set((state) =>
          state.touched[name]
            ? state
            : { touched: { ...state.touched, [name]: true } },
        )
        runValidation(name, get().values[name] ?? null)
      },

      goToStep: (index) => {
        const state = get()
        const clamped = Math.min(Math.max(index, 0), lastStepIndex)

        if (clamped > state.currentStepIndex) {
          const currentStep = schema.steps[state.currentStepIndex]
          const visibleFields = (currentStep?.fields ?? []).filter((field) =>
            isFieldVisible(field, state.values, state.asyncStatus),
          )

          for (const field of visibleFields) {
            runValidation(field.name, state.values[field.name] ?? null)
          }
          if (visibleFields.length > 0) {
            set((s) => ({
              touched: visibleFields.reduce(
                (acc, field) => ({ ...acc, [field.name]: true }),
                s.touched,
              ),
            }))
          }

          const afterValidation = get()
          const blocked = visibleFields.some(
            (field) =>
              afterValidation.errors[field.name] !== undefined ||
              afterValidation.asyncStatus[field.name] === 'pending',
          )
          if (blocked) {
            return
          }
        }

        const latest = get()
        const furthestVisited = Math.max(...latest.visitedStepIndices)
        // The branching rule: any visited step is always reachable, but
        // you can't jump past the one step immediately beyond it.
        if (clamped > furthestVisited + 1) {
          return
        }
        set({
          currentStepIndex: clamped,
          visitedStepIndices: withVisited(clamped, latest.visitedStepIndices),
        })
      },

      goToNextStep: () => {
        get().goToStep(get().currentStepIndex + 1)
      },

      goToPreviousStep: () => {
        get().goToStep(get().currentStepIndex - 1)
      },

      reset: () => {
        for (const timer of debounceTimers.values()) {
          clearTimeout(timer)
        }
        debounceTimers.clear()
        asyncRequestIds.clear()
        lastAsyncCheckedValue.clear()
        set({
          currentStepIndex: 0,
          values: initialValues,
          errors: {},
          touched: {},
          dirty: {},
          asyncStatus: {},
          visitedStepIndices: [0],
        })
      },
    }
  })
}
