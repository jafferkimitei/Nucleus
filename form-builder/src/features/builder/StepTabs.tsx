import { memo } from 'react'

import { Button } from '@/components/ui/Button'
import type { StepSchema } from '@/types/schema'

export interface StepTabsProps {
  steps: StepSchema[]
  selectedStepId: string | null
  onSelect: (stepId: string) => void
  onAdd: () => void
  onRemove: (stepId: string) => void
  onMove: (fromIndex: number, toIndex: number) => void
}

/**
 * Step management. Reordered with up/down buttons rather than drag —
 * unlike fields, a form's steps are few and are never dragged onto from
 * anywhere, so a second DragDropContext here would add real complexity
 * (nested drag contexts, another set of droppable ids to keep straight)
 * for an interaction two buttons already cover just as well.
 */
function StepTabsImpl({
  steps,
  selectedStepId,
  onSelect,
  onAdd,
  onRemove,
  onMove,
}: StepTabsProps) {
  return (
    <div className="builder-steps">
      {/* "Builder steps", not "Form steps" — the live preview panel
       * renders its own step progress list with that exact label, and a
       * duplicate aria-label makes both list and button queries
       * ambiguous for anything (including tests) that looks up "the"
       * steps list by its accessible name. */}
      <ol className="builder-steps__list" aria-label="Builder steps">
        {steps.map((step, index) => (
          <li key={step.id} className="builder-steps__item">
            <button
              type="button"
              className={
                step.id === selectedStepId
                  ? 'builder-steps__tab builder-steps__tab--active'
                  : 'builder-steps__tab'
              }
              aria-current={step.id === selectedStepId ? 'step' : undefined}
              onClick={() => {
                onSelect(step.id)
              }}
            >
              {step.title}
            </button>
            <span className="builder-steps__tab-actions">
              <button
                type="button"
                aria-label={`Move ${step.title} earlier`}
                disabled={index === 0}
                onClick={() => {
                  onMove(index, index - 1)
                }}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${step.title} later`}
                disabled={index === steps.length - 1}
                onClick={() => {
                  onMove(index, index + 1)
                }}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Remove ${step.title}`}
                disabled={steps.length <= 1}
                onClick={() => {
                  onRemove(step.id)
                }}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ol>
      <Button type="button" variant="secondary" onClick={onAdd}>
        Add step
      </Button>
    </div>
  )
}

export const StepTabs = memo(StepTabsImpl)
