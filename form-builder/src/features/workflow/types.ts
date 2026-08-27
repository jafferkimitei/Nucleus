import type { AsyncValidationStatus, FieldValue } from '@/types/schema'

/**
 * The state a form instance needs, independent of how it's stored. This
 * is exactly what `createFormStore` persists in its Zustand store.
 */
export interface FormControllerState {
  currentStepIndex: number
  values: Record<string, FieldValue>
  /** A passing field's entry is `undefined` (never an empty string).
   * Kept current for every field at all times — including ones the user
   * hasn't touched yet — since it's what `goToStep` checks before
   * advancing. See `maskUntouchedErrors` in `@/features/validation` for
   * *displaying* only touched fields' errors, a separate,
   * presentation-only concern. */
  errors: Record<string, string | undefined>
  /** Which fields have been blurred at least once, or force-touched by
   * an attempted (and blocked) step advance. */
  touched: Record<string, boolean>
  /** Which fields currently differ from their schema `defaultValue`. */
  dirty: Record<string, boolean>
  /** One entry per field that carries an `async` validation rule and has
   * a non-empty value; absent otherwise. See createFormStore's
   * `runValidation`/`scheduleAsyncValidation` for the debounce + race
   * handling that keeps this current. */
  asyncStatus: Record<string, AsyncValidationStatus>
  /** Every step index the user has visited, ascending. Always includes
   * `currentStepIndex`. Drives the "no skipping ahead" branching rule in
   * `goToStep` and lets the UI offer back-navigation to a past step. */
  visitedStepIndices: number[]
}

export interface FormControllerActions {
  setFieldValue: (name: string, value: FieldValue) => void
  setFieldTouched: (name: string) => void
  /** Advances one step, clamped to the last step. */
  goToNextStep: () => void
  /** Retreats one step, clamped to the first step. */
  goToPreviousStep: () => void
  /**
   * Jumps to an arbitrary step. This is the one rule that makes it a
   * *workflow* engine rather than a linear stepper: any previously
   * visited step is always reachable, but a step more than one past the
   * furthest one visited is refused (a silent no-op) — the workflow
   * can't be skipped ahead of, only revisited. Moving *forward* also
   * validates every visible field on the current step first (Phase 3);
   * a violation force-touches the offending fields (so their errors
   * become visible) and refuses the jump, same as `goToNextStep`. Moving
   * backward is never blocked by validation.
   */
  goToStep: (index: number) => void
  /** Returns the form to its initial state (step 0, schema defaults,
   * cleared touched/dirty/errors/asyncStatus, any in-flight async checks
   * cancelled). Exposed for the demo's "Start over" affordance and for
   * Phase 4's builder preview panel. */
  reset: () => void
}

/** The raw shape a form's Zustand store holds: state plus its actions. */
export type FormStoreState = FormControllerState & FormControllerActions

/**
 * The contract FormRenderer/StepRenderer/Field actually consume. Every
 * field Phase 1's `useLocalFormController` returned (`currentStepIndex`,
 * `values`, `errors`, `setFieldValue`, `goToNextStep`, `goToPreviousStep`)
 * is still here, so those components needed no changes for the fields
 * they already read. `isDirty` is the one member that isn't part of the
 * store itself — it's derived from `dirty` in `useWorkflowFormController`
 * rather than stored, since derived data kept in state can drift out of
 * sync with what it's derived from.
 */
export type FormController = FormStoreState & { isDirty: boolean }
