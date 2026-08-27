import { memo } from 'react'

import { Draggable, Droppable } from '@hello-pangea/dnd'

import type { FieldType } from '@/types/schema'

import { FIELD_TYPE_META, paletteDraggableId } from './fieldTypeMeta'
import { trackBuilderRender } from './renderTracker'

export interface FieldPaletteProps {
  /** Adds a field of this type to the end of the active step — the
   * click-to-add path, always available regardless of pointer support.
   * Dragging a palette entry onto the canvas (see BuilderPage's
   * onDragEnd) does the same thing at a chosen position instead of
   * always the end. */
  onAddFieldType: (type: FieldType) => void
}

/**
 * The field-type source list. Every entry is both a drag source (into
 * the active step's canvas) and a plain button — dragging is the
 * showcase interaction for a "drag-and-drop builder," but WCAG 2.5.7
 * requires a single-pointer alternative to any dragging movement, and a
 * click is also just less friction for a repeat action like "add five
 * text fields." `isDropDisabled` keeps this list from ever being a drop
 * target itself; it's a source only.
 */
function FieldPaletteImpl({ onAddFieldType }: FieldPaletteProps) {
  trackBuilderRender('FieldPalette')
  return (
    <div className="builder-palette">
      <h3 className="builder-panel__title">Field types</h3>
      <p className="builder-panel__hint">
        Drag onto the canvas, or click to add.
      </p>
      <Droppable droppableId="palette" isDropDisabled type="FIELD">
        {(provided) => (
          <ul
            className="builder-palette__list"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {FIELD_TYPE_META.map((meta, index) => (
              <Draggable
                key={meta.type}
                draggableId={paletteDraggableId(meta.type)}
                index={index}
                // The drag handle below is a <button> — see the comment
                // on it. @hello-pangea/dnd blocks starting a drag from
                // any "interactive" element (button, input, a[href], …)
                // by default, since those normally have their own
                // click/keyboard behavior that dragging would clash
                // with; without this flag every pointer drag from the
                // palette is silently swallowed at mousedown (no error,
                // it just never lifts) because the handle *is* the
                // button.
                disableInteractiveElementBlocking
              >
                {(dragProvided, dragSnapshot) => (
                  <li
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    className={
                      dragSnapshot.isDragging
                        ? 'builder-palette__item builder-palette__item--dragging'
                        : 'builder-palette__item'
                    }
                  >
                    {/* dragHandleProps on the button itself, not the
                     * wrapping <li> — that keeps this a single
                     * button-role element (draggable *and* clickable)
                     * instead of two nested elements both named "Text"
                     * for assistive tech and test queries alike. */}
                    <button
                      type="button"
                      className="builder-palette__add"
                      onClick={() => {
                        onAddFieldType(meta.type)
                      }}
                      {...dragProvided.dragHandleProps}
                    >
                      <span className="builder-palette__label">
                        {meta.label}
                      </span>
                      <span className="builder-palette__description">
                        {meta.description}
                      </span>
                    </button>
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </div>
  )
}

export const FieldPalette = memo(FieldPaletteImpl)
