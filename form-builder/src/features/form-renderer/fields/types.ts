import type { FieldSchema, FieldValue } from '@/types/schema'

/**
 * The common contract every field-type control implements. `field` is
 * passed whole (not destructured into individual props) so a control can
 * read whatever schema properties it needs (e.g. `options` for
 * select/radio) without the registry having to know each type's shape.
 */
export interface FieldControlProps {
  field: FieldSchema
  value: FieldValue
  invalid: boolean
  describedBy: string | undefined
  onChange: (value: FieldValue) => void
  onBlur: (() => void) | undefined
}

/** Coerce a FieldValue into the string a native text-like control needs. */
export function toDisplayString(value: FieldValue): string {
  if (value === null) return ''
  return String(value)
}

/**
 * Whether a field carries a `required` validation rule. Phase 1 reads
 * this purely for rendering — the HTML `required` attribute and the
 * label's asterisk are a layout/accessibility affordance, not validation
 * enforcement. Actually blocking submission, producing an error message,
 * and every other rule type are the validation engine's job (Phase 3);
 * this helper deliberately looks at nothing but `type === 'required'`.
 */
export function isRequired(field: FieldSchema): boolean {
  return field.validation?.some((rule) => rule.type === 'required') ?? false
}
