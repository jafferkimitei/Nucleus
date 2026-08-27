import { memo } from 'react'

import { FieldWrapper } from '@/components/ui/FieldWrapper'
import type { FieldSchema, FieldValue } from '@/types/schema'

import { fieldRegistry } from './fieldRegistry'
import { isRequired } from './fields/types'
import { trackFieldRender } from './renderTracker'

export interface FieldProps {
  field: FieldSchema
  value: FieldValue
  error: string | undefined
  /** True while this field's `async` validation rule has an in-flight
   * check (see createFormStore's `scheduleAsyncValidation`). Always
   * `false` — a stable primitive — for a field with no async rule, so it
   * never costs those fields a render. */
  checking: boolean
  onFieldChange: (name: string, value: FieldValue) => void
  onFieldBlur: ((name: string) => void) | undefined
}

/**
 * Renders one field from `field.type` via the registry, wrapped in the
 * shared label/help/error chrome (checkboxes opt out — see
 * CheckboxFieldControl).
 *
 * Performance note (see the Phase 5 case study for the measured version
 * of this claim): this component is memoized, and every prop it receives
 * is either a primitive (`value`, `error`, `checking`) or referentially
 * stable across renders (`field` comes straight from the static
 * FormSchema; `onFieldChange`/`onFieldBlur` are expected to be stable
 * callbacks from the caller — see `@/features/workflow`'s
 * useWorkflowFormController). That combination is what makes typing in
 * one field not re-render its siblings: each Field's props only change
 * when that field's own value, error, or checking status changes.
 */
function FieldImpl({
  field,
  value,
  error,
  checking,
  onFieldChange,
  onFieldBlur,
}: FieldProps) {
  trackFieldRender(field.name)
  const Control = fieldRegistry[field.type]
  const invalid = error !== undefined
  const handleChange = (next: FieldValue) => {
    onFieldChange(field.name, next)
  }
  const handleBlur = onFieldBlur
    ? () => {
        onFieldBlur(field.name)
      }
    : undefined

  if (field.type === 'checkbox') {
    return (
      <Control
        field={field}
        value={value}
        invalid={invalid}
        describedBy={error ? `${field.id}-error` : undefined}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    )
  }

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={isRequired(field)}
      helpText={field.helpText}
      error={error}
      statusText={checking ? 'Checking…' : undefined}
    >
      {(describedBy) => (
        <Control
          field={field}
          value={value}
          invalid={invalid}
          describedBy={describedBy}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      )}
    </FieldWrapper>
  )
}

export const Field = memo(FieldImpl)
