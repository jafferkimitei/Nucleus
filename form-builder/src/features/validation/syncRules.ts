import type { FieldValue, ValidationRule } from '@/types/schema'

/**
 * Validates one field's value against its sync rules, in declaration
 * order, stopping at the first violation — matching the "evaluated in
 * declaration order" contract documented on `ValidationRule` in
 * types/schema.ts. `async` rules are skipped here entirely; they're the
 * async validation pipeline's job (see `mockAsyncValidator.ts` and
 * `createFormStore`'s `runValidation`), which only runs once every sync
 * rule has already passed.
 */
export function validateSyncRules(
  value: FieldValue,
  rules: ValidationRule[] | undefined,
): string | undefined {
  if (!rules) {
    return undefined
  }

  for (const rule of rules) {
    const message = checkRule(value, rule)
    if (message) {
      return message
    }
  }

  return undefined
}

function checkRule(
  value: FieldValue,
  rule: ValidationRule,
): string | undefined {
  switch (rule.type) {
    case 'required': {
      const empty = value === null || value === '' || value === false
      return empty ? (rule.message ?? 'This field is required.') : undefined
    }
    case 'minLength': {
      if (typeof value === 'string' && value.length < rule.value) {
        return (
          rule.message ?? `Must be at least ${String(rule.value)} characters.`
        )
      }
      return undefined
    }
    case 'maxLength': {
      if (typeof value === 'string' && value.length > rule.value) {
        return (
          rule.message ?? `Must be at most ${String(rule.value)} characters.`
        )
      }
      return undefined
    }
    case 'min': {
      if (typeof value === 'number' && value < rule.value) {
        return rule.message ?? `Must be at least ${String(rule.value)}.`
      }
      return undefined
    }
    case 'max': {
      if (typeof value === 'number' && value > rule.value) {
        return rule.message ?? `Must be at most ${String(rule.value)}.`
      }
      return undefined
    }
    case 'pattern': {
      if (
        typeof value === 'string' &&
        value !== '' &&
        !new RegExp(rule.value).test(value)
      ) {
        return rule.message ?? 'This value is not in the expected format.'
      }
      return undefined
    }
    case 'async':
      return undefined
  }
}
