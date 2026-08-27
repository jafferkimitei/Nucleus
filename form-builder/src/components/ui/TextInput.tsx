import { memo } from 'react'

export interface TextInputProps {
  id: string
  name: string
  type: 'text' | 'email' | 'number' | 'date'
  value: string
  placeholder: string | undefined
  required: boolean
  invalid: boolean
  describedBy: string | undefined
  onChange: (value: string) => void
  onBlur: (() => void) | undefined
}

function TextInputImpl({
  id,
  name,
  type,
  value,
  placeholder,
  required,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: TextInputProps) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      className="field__control"
      value={value}
      placeholder={placeholder}
      required={required}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      onBlur={onBlur}
    />
  )
}

export const TextInput = memo(TextInputImpl)
