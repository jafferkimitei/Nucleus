/**
 * The form/workflow schema contract.
 *
 * Everything else in this app is downstream of this file: the renderer
 * (features/form-renderer) turns a FormSchema into DOM, the validation
 * engine (features/validation, Phase 3) interprets each field's
 * `validation`/`visibleWhen`, the workflow store (features/workflow,
 * Phase 2) walks `steps`, and the builder (features/builder, Phase 4)
 * produces/edits a FormSchema as data rather than having any renderer- or
 * validation-specific code of its own.
 *
 * A field's `validation` and `visibleWhen` are typed here but not
 * interpreted by the renderer — the renderer only reads layout-relevant
 * properties (type, label, options, ...). Phase 3 is what actually
 * evaluates these; defining their shape now means the builder (Phase 4)
 * can author them before Phase 3 exists to run them.
 */

/** The value a single field can hold. `null` means "cleared"/unset. */
export type FieldValue = string | number | boolean | null

/**
 * The field-type registry key. Adding a type means: add it here, add a
 * case in `features/form-renderer/fieldRegistry.tsx`, and (once Phase 4
 * exists) add it to the builder's field palette. Nowhere else changes.
 */
export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'

export interface SelectOption {
  value: string
  label: string
}

/**
 * Sync validation rules, evaluated by Phase 3 in declaration order.
 * `async` is the hook for "Field B's validity depends on an API check
 * triggered by Field A" — Phase 3 debounces and races these, the schema
 * just declares that one exists and where it calls out to.
 */
export type ValidationRule =
  | { type: 'required'; message?: string }
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string }
  | { type: 'pattern'; value: string; message?: string }
  | { type: 'async'; endpoint: string; message?: string }

/** The lifecycle of a field's `async` validation rule, if it has one. */
export type AsyncValidationStatus = 'idle' | 'pending' | 'valid' | 'invalid'

/**
 * A single condition gating a field's visibility, e.g. "show this field
 * only when `country` equals `US`" — or, via the `asyncStatus` operator,
 * "show this field once `promoCode`'s async check comes back valid",
 * the project brief's "async API check on Field A hiding Field B"
 * example. Phase 3 evaluates this against the current form values (and,
 * for `asyncStatus`, against each field's async validation status)
 * whenever the referenced field changes.
 */
export interface ConditionExpression {
  fieldName: string
  operator: 'equals' | 'notEquals' | 'in' | 'notEmpty' | 'asyncStatus'
  /**
   * `equals`/`notEquals` compare against a single FieldValue; `in`
   * against an array of them; `notEmpty` ignores `value` entirely;
   * `asyncStatus` compares against an AsyncValidationStatus — a plain
   * string, so it's already covered by FieldValue's `string` branch
   * rather than adding a redundant type here.
   */
  value?: FieldValue | FieldValue[]
}

export interface FieldSchema {
  id: string
  name: string
  type: FieldType
  label: string
  placeholder?: string
  helpText?: string
  defaultValue?: FieldValue
  /** Required for `select` and `radio`; ignored by every other type. */
  options?: SelectOption[]
  validation?: ValidationRule[]
  visibleWhen?: ConditionExpression
}

export interface StepSchema {
  id: string
  title: string
  description?: string
  fields: FieldSchema[]
}

export interface FormSchema {
  id: string
  title: string
  description?: string
  steps: StepSchema[]
}
