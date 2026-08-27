import { memo } from 'react'

import type { FieldValue, StepSchema } from '@/types/schema'

import { Field } from './Field'

export interface StepRendererProps {
  step: StepSchema
  values: Record<string, FieldValue>
  errors: Record<string, string | undefined>
  onFieldChange: (name: string, value: FieldValue) => void
  onFieldBlur: ((name: string) => void) | undefined
}

/**
 * Renders every field in one step. No visibility filtering yet — that's
 * `visibleWhen` evaluation, which lands with the validation engine
 * (Phase 3) since it needs the same "watch another field's value" wiring.
 */
function StepRendererImpl({
  step,
  values,
  errors,
  onFieldChange,
  onFieldBlur,
}: StepRendererProps) {
  return (
    <fieldset className="step">
      <legend className="step__title">{step.title}</legend>
      {step.description && (
        <p className="step__description">{step.description}</p>
      )}
      {step.fields.map((field) => (
        <Field
          key={field.id}
          field={field}
          value={values[field.name] ?? null}
          error={errors[field.name]}
          onFieldChange={onFieldChange}
          onFieldBlur={onFieldBlur}
        />
      ))}
    </fieldset>
  )
}

export const StepRenderer = memo(StepRendererImpl)
