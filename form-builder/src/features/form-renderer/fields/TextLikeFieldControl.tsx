import { memo } from 'react'

import { TextInput } from '@/components/ui/TextInput'

import { isRequired, toDisplayString, type FieldControlProps } from './types'

/** Backs the `text`, `email`, and `date` field types — same control,
 * different HTML `type` attribute, same FieldValue<->string mapping. */
function makeTextLikeControl(inputType: 'text' | 'email' | 'date') {
  function TextLikeFieldControl({
    field,
    value,
    invalid,
    describedBy,
    onChange,
    onBlur,
  }: FieldControlProps) {
    return (
      <TextInput
        id={field.id}
        name={field.name}
        type={inputType}
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
  return memo(TextLikeFieldControl)
}

export const TextFieldControl = makeTextLikeControl('text')
export const EmailFieldControl = makeTextLikeControl('email')
export const DateFieldControl = makeTextLikeControl('date')
