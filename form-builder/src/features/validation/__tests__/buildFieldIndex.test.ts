import { describe, expect, it } from 'vitest'

import type { FormSchema } from '@/types/schema'

import { buildFieldIndex } from '../buildFieldIndex'

const schema: FormSchema = {
  id: 'test-form',
  title: 'Test form',
  steps: [
    {
      id: 'step-1',
      title: 'Step 1',
      fields: [
        { id: 'f-a', name: 'a', type: 'text', label: 'A' },
        {
          id: 'f-b',
          name: 'b',
          type: 'text',
          label: 'B',
          visibleWhen: { fieldName: 'a', operator: 'notEmpty' },
        },
      ],
    },
    {
      id: 'step-2',
      title: 'Step 2',
      fields: [
        {
          id: 'f-c',
          name: 'c',
          type: 'text',
          label: 'C',
          visibleWhen: { fieldName: 'a', operator: 'notEmpty' },
        },
      ],
    },
  ],
}

describe('buildFieldIndex', () => {
  it('indexes every field by name, regardless of which step it lives in', () => {
    const { fieldsByName } = buildFieldIndex(schema)
    expect(fieldsByName.get('a')?.label).toBe('A')
    expect(fieldsByName.get('c')?.label).toBe('C')
    expect(fieldsByName.get('missing')).toBeUndefined()
  })

  it('collects every field that depends on a given field, across steps', () => {
    const { dependentsByFieldName } = buildFieldIndex(schema)
    const dependents = dependentsByFieldName.get('a') ?? []
    expect(dependents.map((f) => f.name).sort()).toEqual(['b', 'c'])
    expect(dependentsByFieldName.get('b')).toBeUndefined()
  })
})
