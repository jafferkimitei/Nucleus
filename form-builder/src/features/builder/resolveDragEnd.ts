import type { FieldType } from '@/types/schema'

import type { DropResult } from '@hello-pangea/dnd'

const PALETTE_PREFIX = 'palette-'

export type DragEndAction =
  | { kind: 'addField'; type: FieldType; index: number }
  | { kind: 'moveField'; fromIndex: number; toIndex: number }

/**
 * Pure interpretation of a `@hello-pangea/dnd` drop result into "what
 * should the builder store do", given which step's canvas is currently
 * the only one on screen. Kept separate from BuilderPage so every
 * branch (no destination, drop outside the canvas, drop back on the
 * palette, a same-index no-op drop, an actual reorder) can be unit
 * tested directly — driving these through a real simulated pointer drag
 * isn't practical in jsdom (see BuilderPage.test.tsx's header comment),
 * but the decision logic itself has nothing DnD-specific about it once
 * you have a `DropResult`.
 */
export function resolveDragEnd(
  result: DropResult,
  activeStepId: string,
): DragEndAction | null {
  const { source, destination, draggableId } = result
  if (!destination) {
    return null
  }

  if (source.droppableId === 'palette') {
    if (destination.droppableId !== activeStepId) {
      return null
    }
    return {
      kind: 'addField',
      type: draggableId.slice(PALETTE_PREFIX.length) as FieldType,
      index: destination.index,
    }
  }

  if (
    source.droppableId === activeStepId &&
    destination.droppableId === activeStepId &&
    source.index !== destination.index
  ) {
    return {
      kind: 'moveField',
      fromIndex: source.index,
      toIndex: destination.index,
    }
  }

  return null
}
