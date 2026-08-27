import { memo } from 'react'

import { Draggable } from '@hello-pangea/dnd'

import type { FieldSchema } from '@/types/schema'

import { labelForFieldType } from './fieldTypeMeta'

export interface FieldCardProps {
  field: FieldSchema
  index: number
  isSelected: boolean
  isFirst: boolean
  isLast: boolean
  onSelect: () => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

/**
 * One field's row in the step canvas: a summary (label, type, required
 * badge) plus controls that all have a non-drag equivalent. Up/down
 * buttons duplicate what dragging the card does — same WCAG 2.5.7
 * reasoning as the palette's click-to-add — and are what the component
 * tests drive, since simulating a real pointer drag through
 * @hello-pangea/dnd isn't practical in jsdom (that's what the Playwright
 * E2E drag test is for).
 */
function FieldCardImpl({
  field,
  index,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
}: FieldCardProps) {
  const isRequired = field.validation?.some((rule) => rule.type === 'required')

  return (
    <Draggable
      draggableId={field.id}
      index={index}
      // See the matching comment in FieldPalette.tsx — the drag handle
      // here is the <button> below, and @hello-pangea/dnd blocks
      // pointer drags starting on interactive elements unless told
      // otherwise.
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={
            snapshot.isDragging
              ? 'builder-field-card builder-field-card--dragging'
              : 'builder-field-card'
          }
        >
          <button
            type="button"
            className={
              isSelected
                ? 'builder-field-card__select builder-field-card__select--active'
                : 'builder-field-card__select'
            }
            onClick={onSelect}
            aria-pressed={isSelected}
            {...provided.dragHandleProps}
          >
            <span className="builder-field-card__label">
              {field.label || '(untitled field)'}
            </span>
            <span className="builder-field-card__meta">
              {labelForFieldType(field.type)}
              {isRequired && ' · required'}
              {field.visibleWhen && ' · conditional'}
            </span>
          </button>
          <div className="builder-field-card__actions">
            <button
              type="button"
              aria-label={`Move ${field.label || 'field'} up`}
              disabled={isFirst}
              onClick={onMoveUp}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${field.label || 'field'} down`}
              disabled={isLast}
              onClick={onMoveDown}
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={`Remove ${field.label || 'field'}`}
              className="builder-field-card__remove"
              onClick={onRemove}
            >
              ✕
            </button>
          </div>
        </li>
      )}
    </Draggable>
  )
}

export const FieldCard = memo(FieldCardImpl)
