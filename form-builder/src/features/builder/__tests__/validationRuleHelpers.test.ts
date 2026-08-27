import { describe, expect, it } from 'vitest'

import { getRule, removeRuleType, upsertRule } from '../validationRuleHelpers'

describe('validationRuleHelpers', () => {
  it('getRule finds a rule of the given type', () => {
    const rules = [
      { type: 'required' as const },
      { type: 'minLength' as const, value: 3 },
    ]
    expect(getRule(rules, 'minLength')).toEqual({ type: 'minLength', value: 3 })
    expect(getRule(rules, 'pattern')).toBeUndefined()
    expect(getRule(undefined, 'required')).toBeUndefined()
  })

  it('upsertRule adds a rule when none of that type exists', () => {
    const result = upsertRule(undefined, { type: 'required' })
    expect(result).toEqual([{ type: 'required' }])
  })

  it('upsertRule replaces an existing rule of the same type rather than duplicating', () => {
    const result = upsertRule(
      [{ type: 'minLength', value: 3 }, { type: 'required' }],
      { type: 'minLength', value: 5 },
    )
    expect(result).toEqual([
      { type: 'required' },
      { type: 'minLength', value: 5 },
    ])
  })

  it('removeRuleType drops only the matching type', () => {
    const result = removeRuleType(
      [{ type: 'minLength', value: 3 }, { type: 'required' }],
      'minLength',
    )
    expect(result).toEqual([{ type: 'required' }])
  })

  it('removeRuleType on an empty/undefined list is a no-op', () => {
    expect(removeRuleType(undefined, 'required')).toEqual([])
  })
})
