import { describe, expect, it } from 'vitest'

import type {
  AsyncValidationStatus,
  FieldSchema,
  FieldValue,
} from '@/types/schema'

import { evaluateCondition, isFieldVisible } from '../evaluateCondition'

describe('evaluateCondition', () => {
  const values: Record<string, FieldValue> = { country: 'US', tags: null }
  const asyncStatus: Record<string, AsyncValidationStatus> = {
    promoCode: 'valid',
  }

  it('equals / notEquals compare against the referenced field value', () => {
    expect(
      evaluateCondition(
        { fieldName: 'country', operator: 'equals', value: 'US' },
        values,
        asyncStatus,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        { fieldName: 'country', operator: 'notEquals', value: 'US' },
        values,
        asyncStatus,
      ),
    ).toBe(false)
  })

  it('in checks membership in a value array', () => {
    expect(
      evaluateCondition(
        { fieldName: 'country', operator: 'in', value: ['US', 'CA'] },
        values,
        asyncStatus,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        { fieldName: 'country', operator: 'in', value: ['FR'] },
        values,
        asyncStatus,
      ),
    ).toBe(false)
  })

  it('notEmpty treats null and empty string as empty', () => {
    expect(
      evaluateCondition(
        { fieldName: 'tags', operator: 'notEmpty' },
        values,
        asyncStatus,
      ),
    ).toBe(false)
    expect(
      evaluateCondition(
        { fieldName: 'country', operator: 'notEmpty' },
        values,
        asyncStatus,
      ),
    ).toBe(true)
  })

  it('a field never set in values is treated as null', () => {
    expect(
      evaluateCondition(
        { fieldName: 'missing', operator: 'notEmpty' },
        values,
        asyncStatus,
      ),
    ).toBe(false)
  })

  it('asyncStatus compares against another field\'s async validation status — the "hide Field B until Field A\'s async check passes" case', () => {
    expect(
      evaluateCondition(
        { fieldName: 'promoCode', operator: 'asyncStatus', value: 'valid' },
        values,
        asyncStatus,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        { fieldName: 'promoCode', operator: 'asyncStatus', value: 'pending' },
        values,
        asyncStatus,
      ),
    ).toBe(false)
  })

  it('asyncStatus defaults to "idle" for a field with no recorded status', () => {
    expect(
      evaluateCondition(
        { fieldName: 'neverChecked', operator: 'asyncStatus', value: 'idle' },
        values,
        asyncStatus,
      ),
    ).toBe(true)
  })
})

describe('isFieldVisible', () => {
  const values: Record<string, FieldValue> = { plan: 'pro' }
  const asyncStatus: Record<string, AsyncValidationStatus> = {}

  it('is always visible with no visibleWhen', () => {
    const field: FieldSchema = { id: 'f', name: 'f', type: 'text', label: 'F' }
    expect(isFieldVisible(field, values, asyncStatus)).toBe(true)
  })

  it('defers to evaluateCondition when visibleWhen is set', () => {
    const field: FieldSchema = {
      id: 'f',
      name: 'f',
      type: 'text',
      label: 'F',
      visibleWhen: { fieldName: 'plan', operator: 'equals', value: 'pro' },
    }
    expect(isFieldVisible(field, values, asyncStatus)).toBe(true)
    expect(
      isFieldVisible(
        {
          ...field,
          visibleWhen: { fieldName: 'plan', operator: 'equals', value: 'free' },
        },
        values,
        asyncStatus,
      ),
    ).toBe(false)
  })
})
