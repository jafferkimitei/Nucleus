import { memo } from 'react'

import { Droppable } from '@hello-pangea/dnd'

import type { StepSchema } from '@/types/schema'

import { FieldCard } from './FieldCard'

export interface StepCanvasProps {
  step: StepSchema
  selectedFieldId: string | null
  onSelectField: (fieldId: string) => void
  onRemoveField: (fieldId: string) => void
  onMoveField: (fromIndex: number, toIndex: number) => void
}

/**
 * The active step's field list — both the drop target for fields
 * dragged in from the palette and the reorderable list of fields
 * already on this step. `droppableId` is the step's own id, which is
 * exactly what BuilderPage's onDragEnd needs to tell "reordering within
 * this step" apart from "a different step's canvas" (were more than one
 * ever rendered at once, which today it isn't — see BuilderPage).
 */
function StepCanvasImpl({
  step,
  selectedFieldId,
  onSelectField,
  onRemoveField,
  onMoveField,
}: StepCanvasProps) {
  return (
    <div className="builder-canvas">
      <h3 className="builder-panel__title">{step.title}</h3>
      <Droppable droppableId={step.id} type="FIELD">
        {(provided, snapshot) => (
          <ul
            className={
              snapshot.isDraggingOver
                ? 'builder-canvas__list builder-canvas__list--drag-over'
                : 'builder-canvas__list'
            }
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {step.fields.length === 0 && (
              <li
                className="builder-canvas__empty"
                aria-hidden={!snapshot.isDraggingOver}
              >
                Drag a field type here, or click one in the palette.
              </li>
            )}
            {step.fields.map((field, index) => (
              <FieldCard
                key={field.id}
                field={field}
                index={index}
                isSelected={field.id === selectedFieldId}
                isFirst={index === 0}
                isLast={index === step.fields.length - 1}
                onSelect={() => {
                  onSelectField(field.id)
                }}
                onRemove={() => {
                  onRemoveField(field.id)
                }}
                onMoveUp={() => {
                  onMoveField(index, index - 1)
                }}
                onMoveDown={() => {
                  onMoveField(index, index + 1)
                }}
              />
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </div>
  )
}

export const StepCanvas = memo(StepCanvasImpl)
