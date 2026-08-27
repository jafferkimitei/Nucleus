import { memo, useState } from 'react'

import { TextInput } from '@/components/ui/TextInput'

import { isRequired, toDisplayString, type FieldControlProps } from './types'

/** Parse a number input's raw text the same way on every path, so the
 * "does the displayed text still match the authoritative value" check
 * below and the actual onChange parse never disagree. */
function parseRawNumber(rawText: string): number | null {
  if (rawText === '' || rawText === '-') return null
  const parsed = Number(rawText)
  return Number.isNaN(parsed) ? null : parsed
}

function NumberFieldControlImpl({
  field,
  value,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: FieldControlProps) {
  const [rawText, setRawText] = useState(() => toDisplayString(value))

  // A plain number input can't hold "1." or a trailing "-" as a distinct
  // display state if we always echo `value` straight back in — typing
  // the "." in "1.5" would parse to 1, round-trip through `value`, and
  // render as "1", stripping the character the user just typed. So the
  // input's displayed text is local state, and we only overwrite it (during
  // render, React's documented pattern for "adjust state when a prop
  // changes") when it stops agreeing with the authoritative `value` — e.g.
  // an external reset - not on every keystroke's own round trip.
  if (parseRawNumber(rawText) !== value) {
    setRawText(toDisplayString(value))
  }

  return (
    <TextInput
      id={field.id}
      name={field.name}
      type="number"
      value={rawText}
      placeholder={field.placeholder}
      required={isRequired(field)}
      invalid={invalid}
      describedBy={describedBy}
      onChange={(next) => {
        setRawText(next)
        onChange(parseRawNumber(next))
      }}
      onBlur={onBlur}
    />
  )
}

export const NumberFieldControl = memo(NumberFieldControlImpl)
