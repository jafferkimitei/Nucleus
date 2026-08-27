import { memo } from 'react'

import { RadioGroup } from '@/components/ui/RadioGroup'

import { toDisplayString, type FieldControlProps } from './types'

function RadioFieldControlImpl({
  field,
  value,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: FieldControlProps) {
  return (
    <RadioGroup
      id={field.id}
      name={field.name}
      value={toDisplayString(value)}
      options={field.options ?? []}
      invalid={invalid}
      describedBy={describedBy}
      onChange={(next) => {
        onChange(next)
      }}
      onBlur={onBlur}
    />
  )
}

export const RadioFieldControl = memo(RadioFieldControlImpl)
