import type {
  FieldSchema,
  FieldType,
  FormSchema,
  StepSchema,
} from '@/types/schema'

/**
 * The builder's own state — distinct from `workflow`'s `FormControllerState`.
 * That store runs a form (values/touched/errors for one fill-in session);
 * this one edits the form's *definition*. They share nothing but the
 * `FormSchema` type: this store's whole job is to produce a valid one,
 * which `LivePreview` then hands straight to `useWorkflowFormController`
 * to prove it renders — the same contract, exercised from both ends.
 */
export interface BuilderState {
  schema: FormSchema
  selectedStepId: string | null
  selectedFieldId: string | null
  /**
   * Bumped on every mutation. `LivePreview` keys its subtree on this
   * (not on the schema itself, which would mean a full deep-equality or
   * a potentially large `JSON.stringify` on every keystroke) so it
   * always remounts a fresh workflow controller after an edit rather
   * than trying to reconcile one form-fill session across schema
   * changes that can rename or delete the very field the controller
   * was tracking.
   */
  version: number
}

export interface BuilderActions {
  setFormMeta: (
    patch: Partial<Pick<FormSchema, 'title' | 'description'>>,
  ) => void

  addStep: () => string
  removeStep: (stepId: string) => void
  renameStep: (
    stepId: string,
    patch: Partial<Pick<StepSchema, 'title' | 'description'>>,
  ) => void
  moveStep: (fromIndex: number, toIndex: number) => void
  selectStep: (stepId: string) => void

  addField: (stepId: string, type: FieldType, atIndex?: number) => string
  removeField: (stepId: string, fieldId: string) => void
  moveField: (stepId: string, fromIndex: number, toIndex: number) => void
  moveFieldToStep: (
    fromStepId: string,
    fieldId: string,
    toStepId: string,
    toIndex: number,
  ) => void
  /** Everything about a field except its identity (`id`/`name`) and
   * `type`, both of which have their own actions below because they
   * need extra rules a plain patch doesn't. */
  updateField: (
    stepId: string,
    fieldId: string,
    patch: Partial<Omit<FieldSchema, 'id' | 'name' | 'type'>>,
  ) => void
  /** Replaces a field's validation rules wholesale. Its own action for
   * the same `exactOptionalPropertyTypes` reason as
   * `clearFieldVisibility`: an empty rule set means deleting the
   * `validation` key, which a plain patch can't express. */
  setFieldValidation: (
    stepId: string,
    fieldId: string,
    rules: FieldSchema['validation'],
  ) => void
  /** Removes a field's `visibleWhen` condition entirely (always shown).
   * A separate action from `updateField` because `exactOptionalPropertyTypes`
   * won't let a patch carry `visibleWhen: undefined` — clearing an
   * optional key means omitting it, not assigning undefined to it. */
  clearFieldVisibility: (stepId: string, fieldId: string) => void
  /** Renames a field's data key. Returns `false` (and leaves the schema
   * unchanged) if `name` is blank or already used by another field
   * anywhere in the form — field names are the values object's keys, so
   * they must be unique across the whole schema, not just one step. */
  renameField: (stepId: string, fieldId: string, name: string) => boolean
  /** Switching type resets `options` (regenerated if the new type needs
   * them) and clears `validation`/`defaultValue`, since a rule or
   * default that made sense for the old type (e.g. `pattern` on text)
   * may not even parse for the new one (e.g. checkbox). */
  changeFieldType: (stepId: string, fieldId: string, type: FieldType) => void
  selectField: (stepId: string, fieldId: string) => void
  clearSelection: () => void

  loadSchema: (schema: FormSchema) => void
  reset: () => void
}

export type BuilderStoreState = BuilderState & BuilderActions
