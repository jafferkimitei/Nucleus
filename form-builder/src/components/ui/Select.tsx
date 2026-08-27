import { memo } from 'react'

import type { SelectOption } from '@/types/schema'

export interface SelectProps {
  id: string
  name: string
  value: string
  options: SelectOption[]
  placeholder: string | undefined
  required: boolean
  invalid: boolean
  describedBy: string | undefined
  onChange: (value: string) => void
  onBlur: (() => void) | undefined
}

function SelectImpl({
  id,
  name,
  value,
  options,
  placeholder,
  required,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: SelectProps) {
  return (
    <select
      id={id}
      name={name}
      className="field__control"
      value={value}
      required={required}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      onBlur={onBlur}
    >
      <option value="" disabled={required}>
        {placeholder ?? 'Select…'}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export const Select = memo(SelectImpl)
