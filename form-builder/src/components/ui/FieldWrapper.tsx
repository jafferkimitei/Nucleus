import { memo, type ReactNode } from 'react'

export interface FieldWrapperProps {
  fieldId: string
  label: string
  required: boolean
  helpText: string | undefined
  error: string | undefined
  /**
   * A transient, non-error status line (e.g. "Checking…" while a field's
   * async validation rule is in flight). Rendered with `role="status"`
   * (implicitly polite) rather than the error's `role="alert"` — it's
   * informational, not something that should interrupt a screen reader
   * mid-sentence.
   */
  statusText: string | undefined
  /**
   * Render-prop so the control can wire `aria-describedby` to exactly the
   * help/error ids that ended up rendered, without recomputing them.
   */
  children: (describedBy: string | undefined) => ReactNode
}

/**
 * Label + help text + error slot shared by every field control. Kept
 * schema-agnostic (it knows nothing about FieldSchema) so the builder's
 * property inspector can reuse it too.
 */
function FieldWrapperImpl({
  fieldId,
  label,
  required,
  helpText,
  error,
  statusText,
  children,
}: FieldWrapperProps) {
  const helpId = helpText ? `${fieldId}-help` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label htmlFor={fieldId} className="field__label">
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children(describedBy)}
      {helpText && (
        <p id={helpId} className="field__help">
          {helpText}
        </p>
      )}
      {statusText && (
        <p role="status" className="field__status">
          {statusText}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="field__error">
          {error}
        </p>
      )}
    </div>
  )
}

export const FieldWrapper = memo(FieldWrapperImpl)
