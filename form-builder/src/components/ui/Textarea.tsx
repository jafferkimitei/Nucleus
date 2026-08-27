import { memo } from 'react'

export interface TextareaProps {
  id: string
  name: string
  value: string
  placeholder: string | undefined
  required: boolean
  invalid: boolean
  describedBy: string | undefined
  onChange: (value: string) => void
  onBlur: (() => void) | undefined
}

function TextareaImpl({
  id,
  name,
  value,
  placeholder,
  required,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: TextareaProps) {
  return (
    <textarea
      id={id}
      name={name}
      className="field__control"
      value={value}
      placeholder={placeholder}
      required={required}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      rows={4}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      onBlur={onBlur}
    />
  )
}

export const Textarea = memo(TextareaImpl)
