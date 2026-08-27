import { describe, expect, it } from 'vitest'

import type { ValidationRule } from '@/types/schema'

import { validateSyncRules } from '../syncRules'

describe('validateSyncRules', () => {
  it('passes a value with no rules', () => {
    expect(validateSyncRules('anything', undefined)).toBeUndefined()
  })

  it('treats null, empty string, and false as empty for required', () => {
    const rules: ValidationRule[] = [{ type: 'required' }]
    expect(validateSyncRules(null, rules)).toBe('This field is required.')
    expect(validateSyncRules('', rules)).toBe('This field is required.')
    expect(validateSyncRules(false, rules)).toBe('This field is required.')
  })

  it('does not treat 0 as empty for required (a real answer, not "unanswered")', () => {
    expect(validateSyncRules(0, [{ type: 'required' }])).toBeUndefined()
  })

  it('uses a rule-supplied message over the default', () => {
    const message = 'Tell us your name.'
    expect(validateSyncRules(null, [{ type: 'required', message }])).toBe(
      message,
    )
  })

  it('enforces minLength/maxLength on strings only', () => {
    const rules: ValidationRule[] = [{ type: 'minLength', value: 3 }]
    expect(validateSyncRules('ab', rules)).toBe(
      'Must be at least 3 characters.',
    )
    expect(validateSyncRules('abc', rules)).toBeUndefined()
    expect(validateSyncRules(5, rules)).toBeUndefined() // wrong type: not this rule's problem

    const maxRules: ValidationRule[] = [{ type: 'maxLength', value: 3 }]
    expect(validateSyncRules('abcd', maxRules)).toBe(
      'Must be at most 3 characters.',
    )
  })

  it('enforces min/max on numbers only', () => {
    expect(validateSyncRules(1, [{ type: 'min', value: 5 }])).toBe(
      'Must be at least 5.',
    )
    expect(validateSyncRules(10, [{ type: 'max', value: 5 }])).toBe(
      'Must be at most 5.',
    )
    expect(validateSyncRules(5, [{ type: 'min', value: 5 }])).toBeUndefined()
  })

  it('enforces pattern on non-empty strings only', () => {
    const rules: ValidationRule[] = [
      { type: 'pattern', value: '^[0-9]+$', message: 'Digits only.' },
    ]
    expect(validateSyncRules('12a', rules)).toBe('Digits only.')
    expect(validateSyncRules('123', rules)).toBeUndefined()
    expect(validateSyncRules('', rules)).toBeUndefined() // empty is required's job, not pattern's
  })

  it('skips async rules entirely — that pipeline runs separately', () => {
    expect(
      validateSyncRules('anything', [{ type: 'async', endpoint: '/x' }]),
    ).toBeUndefined()
  })

  it('evaluates rules in declaration order and stops at the first violation', () => {
    const rules: ValidationRule[] = [
      { type: 'required', message: 'Required first.' },
      { type: 'minLength', value: 10, message: 'Too short.' },
    ]
    // Empty value: required fires, minLength never gets a chance to.
    expect(validateSyncRules(null, rules)).toBe('Required first.')
    // Non-empty but short: required passes, minLength fires.
    expect(validateSyncRules('hi', rules)).toBe('Too short.')
  })
})
