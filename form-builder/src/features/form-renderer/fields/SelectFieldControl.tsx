import { memo } from 'react'

import { Select } from '@/components/ui/Select'

import { isRequired, toDisplayString, type FieldControlProps } from './types'

function SelectFieldControlImpl({
  field,
  value,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: FieldControlProps) {
  return (
    <Select
      id={field.id}
      name={field.name}
      value={toDisplayString(value)}
      options={field.options ?? []}
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

export const SelectFieldControl = memo(SelectFieldControlImpl)
