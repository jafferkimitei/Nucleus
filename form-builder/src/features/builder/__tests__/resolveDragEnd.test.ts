import { describe, expect, it } from 'vitest'

import { resolveDragEnd } from '../resolveDragEnd'

import type { DropResult } from '@hello-pangea/dnd'

function makeResult(overrides: Partial<DropResult>): DropResult {
  return {
    draggableId: 'palette-text',
    type: 'FIELD',
    source: { droppableId: 'palette', index: 0 },
    destination: { droppableId: 'step-1', index: 0 },
    reason: 'DROP',
    mode: 'FLUID',
    combine: null,
    ...overrides,
  }
}

describe('resolveDragEnd', () => {
  it('returns null when dropped outside any droppable', () => {
    const result = makeResult({ destination: null })
    expect(resolveDragEnd(result, 'step-1')).toBeNull()
  })

  it('returns an addField action for a palette item dropped on the active canvas', () => {
    const result = makeResult({
      draggableId: 'palette-select',
      source: { droppableId: 'palette', index: 4 },
      destination: { droppableId: 'step-1', index: 2 },
    })
    expect(resolveDragEnd(result, 'step-1')).toEqual({
      kind: 'addField',
      type: 'select',
      index: 2,
    })
  })

  it('returns null for a palette item dropped anywhere other than the active canvas', () => {
    const result = makeResult({
      source: { droppableId: 'palette', index: 0 },
      destination: { droppableId: 'some-other-step', index: 0 },
    })
    expect(resolveDragEnd(result, 'step-1')).toBeNull()
  })

  it('returns a moveField action for a same-step reorder', () => {
    const result = makeResult({
      draggableId: 'field-uuid',
      source: { droppableId: 'step-1', index: 0 },
      destination: { droppableId: 'step-1', index: 2 },
    })
    expect(resolveDragEnd(result, 'step-1')).toEqual({
      kind: 'moveField',
      fromIndex: 0,
      toIndex: 2,
    })
  })

  it('returns null when a field is dropped back at its own index (no-op)', () => {
    const result = makeResult({
      draggableId: 'field-uuid',
      source: { droppableId: 'step-1', index: 1 },
      destination: { droppableId: 'step-1', index: 1 },
    })
    expect(resolveDragEnd(result, 'step-1')).toBeNull()
  })

  it('returns null for a drag whose source is a different step than the active one', () => {
    const result = makeResult({
      draggableId: 'field-uuid',
      source: { droppableId: 'step-2', index: 0 },
      destination: { droppableId: 'step-1', index: 0 },
    })
    expect(resolveDragEnd(result, 'step-1')).toBeNull()
  })
})
