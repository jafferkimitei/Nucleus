import { memo } from 'react'

import { CheckboxInput } from '@/components/ui/CheckboxInput'

import type { FieldControlProps } from './types'

/**
 * Checkboxes render their own inline label and skip FieldWrapper
 * entirely (see CheckboxInput) — Field.tsx special-cases this type for
 * that reason rather than trying to force every control through one
 * layout.
 */
function CheckboxFieldControlImpl({
  field,
  value,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: FieldControlProps) {
  return (
    <CheckboxInput
      id={field.id}
      name={field.name}
      checked={Boolean(value)}
      label={field.label}
      invalid={invalid}
      describedBy={describedBy}
      onChange={(checked) => {
        onChange(checked)
      }}
      onBlur={onBlur}
    />
  )
}

export const CheckboxFieldControl = memo(CheckboxFieldControlImpl)
