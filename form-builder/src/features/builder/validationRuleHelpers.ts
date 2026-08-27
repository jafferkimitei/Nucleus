import type { ValidationRule } from '@/types/schema'

/** Finds the one rule of a given `type` in a field's rule list — the
 * schema allows at most one rule per type in practice (the inspector
 * enforces this; Phase 3's validator would just evaluate duplicates
 * redundantly if there were more than one, but nothing constructs
 * them). */
export function getRule<T extends ValidationRule['type']>(
  rules: ValidationRule[] | undefined,
  type: T,
): Extract<ValidationRule, { type: T }> | undefined {
  return rules?.find(
    (rule): rule is Extract<ValidationRule, { type: T }> => rule.type === type,
  )
}

/** Adds `rule`, replacing any existing rule of the same type — the
 * inspector's checkboxes/inputs each own exactly one rule type, so
 * "set this rule" always means "there is now exactly one of these." */
export function upsertRule(
  rules: ValidationRule[] | undefined,
  rule: ValidationRule,
): ValidationRule[] {
  const filtered = (rules ?? []).filter((r) => r.type !== rule.type)
  return [...filtered, rule]
}

export function removeRuleType(
  rules: ValidationRule[] | undefined,
  type: ValidationRule['type'],
): ValidationRule[] {
  return (rules ?? []).filter((r) => r.type !== type)
}
