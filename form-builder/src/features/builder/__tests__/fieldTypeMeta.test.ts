import { describe, expect, it } from 'vitest'

import type { FieldType } from '@/types/schema'

import { labelForFieldType } from '../fieldTypeMeta'

describe('labelForFieldType', () => {
  it('returns the human label for every known field type', () => {
    expect(labelForFieldType('text')).toBe('Text')
    expect(labelForFieldType('select')).toBe('Dropdown')
    expect(labelForFieldType('checkbox')).toBe('Checkbox')
  })

  it('falls back to the raw type string for a type with no registered meta', () => {
    // Unreachable through the FieldType union at the type-checker level —
    // but a schema imported from disk or another version of this app
    // isn't type-checked at runtime, so a future/unknown type string
    // could still reach here. Falling back to the raw string (rather
    // than throwing or rendering "undefined") is what makes that a
    // harmless label instead of a crash.
    expect(labelForFieldType('future-type' as FieldType)).toBe('future-type')
  })
})
