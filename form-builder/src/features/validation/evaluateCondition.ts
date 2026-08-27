import type {
  AsyncValidationStatus,
  ConditionExpression,
  FieldSchema,
  FieldValue,
} from '@/types/schema'

/**
 * Evaluates one `visibleWhen` condition against the current form state.
 * Pure and framework-agnostic: no store, no React, so it's usable by the
 * renderer, the store's own visibility-cascade logic, and (in Phase 4)
 * the builder's live preview, all from the same implementation.
 */
export function evaluateCondition(
  condition: ConditionExpression,
  values: Record<string, FieldValue>,
  asyncStatus: Record<string, AsyncValidationStatus>,
): boolean {
  const fieldValue = values[condition.fieldName] ?? null

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value
    case 'notEquals':
      return fieldValue !== condition.value
    case 'in':
      return (
        Array.isArray(condition.value) && condition.value.includes(fieldValue)
      )
    case 'notEmpty':
      return fieldValue !== null && fieldValue !== ''
    case 'asyncStatus':
      return (asyncStatus[condition.fieldName] ?? 'idle') === condition.value
  }
}

/** Whether `field` should be rendered given the current form state - the
 * project brief's "async API check on Field A hiding Field B" runs
 * through here via the `asyncStatus` operator. */
export function isFieldVisible(
  field: FieldSchema,
  values: Record<string, FieldValue>,
  asyncStatus: Record<string, AsyncValidationStatus>,
): boolean {
  return (
    !field.visibleWhen ||
    evaluateCondition(field.visibleWhen, values, asyncStatus)
  )
}
