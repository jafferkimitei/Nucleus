import { memo } from 'react'

import { Textarea } from '@/components/ui/Textarea'

import { isRequired, toDisplayString, type FieldControlProps } from './types'

function TextareaFieldControlImpl({
  field,
  value,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: FieldControlProps) {
  return (
    <Textarea
      id={field.id}
      name={field.name}
      value={toDisplayString(value)}
      placeholder={field.placeholder}
      required={isRequired(field)}
      invalid={invalid}
      describedBy={describedBy}
      onChange={(next) => {
        onChange(next === '' ? null : next)
      }}
      onBlur={onBlur}
    />
  )
}

export const TextareaFieldControl = memo(TextareaFieldControlImpl)
