import { memo } from 'react'

export interface CheckboxInputProps {
  id: string
  name: string
  checked: boolean
  label: string
  invalid: boolean
  describedBy: string | undefined
  onChange: (checked: boolean) => void
  onBlur: (() => void) | undefined
}

/**
 * Checkboxes render their own label inline (next to the box, not above
 * it), so this intentionally does NOT go through FieldWrapper the way
 * the other controls do — the field registry renders it standalone.
 */
function CheckboxInputImpl({
  id,
  name,
  checked,
  label,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: CheckboxInputProps) {
  return (
    <div className="field field--checkbox">
      <label htmlFor={id} className="field__checkbox-label">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.checked)
          }}
          onBlur={onBlur}
        />
        {label}
      </label>
    </div>
  )
}

export const CheckboxInput = memo(CheckboxInputImpl)
