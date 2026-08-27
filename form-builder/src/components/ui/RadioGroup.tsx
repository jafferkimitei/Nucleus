import { memo } from 'react'

import type { SelectOption } from '@/types/schema'

export interface RadioGroupProps {
  id: string
  name: string
  value: string
  options: SelectOption[]
  invalid: boolean
  describedBy: string | undefined
  onChange: (value: string) => void
  onBlur: (() => void) | undefined
}

function RadioGroupImpl({
  id,
  name,
  value,
  options,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: RadioGroupProps) {
  return (
    <div
      id={id}
      className="field__radio-group"
      role="radiogroup"
      aria-invalid={invalid}
      aria-describedby={describedBy}
    >
      {options.map((option) => {
        const optionId = `${id}-${option.value}`
        return (
          <label
            key={option.value}
            htmlFor={optionId}
            className="field__radio-option"
          >
            <input
              id={optionId}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value)
              }}
              onBlur={onBlur}
            />
            {option.label}
          </label>
        )
      })}
    </div>
  )
}

export const RadioGroup = memo(RadioGroupImpl)
