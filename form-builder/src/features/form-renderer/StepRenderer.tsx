import { memo } from 'react'

import { isFieldVisible } from '@/features/validation'
import type {
  AsyncValidationStatus,
  FieldValue,
  StepSchema,
} from '@/types/schema'

import { Field } from './Field'

export interface StepRendererProps {
  step: StepSchema
  values: Record<string, FieldValue>
  errors: Record<string, string | undefined>
  asyncStatus: Record<string, AsyncValidationStatus>
  onFieldChange: (name: string, value: FieldValue) => void
  onFieldBlur: ((name: string) => void) | undefined
}

/**
 * Renders every *visible* field in one step — `visibleWhen` (evaluated
 * via `isFieldVisible` against the current values/asyncStatus) filters
 * out the rest before they ever reach `Field`. A hidden field's value is
 * cleared by the store itself (see createFormStore's
 * `recomputeVisibilityCascade`), so this is purely "don't render it",
 * not "render it with stale data."
 */
function StepRendererImpl({
  step,
  values,
  errors,
  asyncStatus,
  onFieldChange,
  onFieldBlur,
}: StepRendererProps) {
  const visibleFields = step.fields.filter((field) =>
    isFieldVisible(field, values, asyncStatus),
  )

  return (
    <fieldset className="step">
      <legend className="step__title">{step.title}</legend>
      {step.description && (
        <p className="step__description">{step.description}</p>
      )}
      {visibleFields.map((field) => (
        <Field
          key={field.id}
          field={field}
          value={values[field.name] ?? null}
          error={errors[field.name]}
          checking={asyncStatus[field.name] === 'pending'}
          onFieldChange={onFieldChange}
          onFieldBlur={onFieldBlur}
        />
      ))}
    </fieldset>
  )
}

export const StepRenderer = memo(StepRendererImpl)
