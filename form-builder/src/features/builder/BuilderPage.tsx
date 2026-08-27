import { useCallback, useState } from 'react'

import { DragDropContext, type DropResult } from '@hello-pangea/dnd'

import { Button } from '@/components/ui/Button'

import { FieldPalette } from './FieldPalette'
import { LivePreview } from './LivePreview'
import { PropertyInspector } from './PropertyInspector'
import { resolveDragEnd } from './resolveDragEnd'
import { SchemaJsonView } from './SchemaJsonView'
import { StepCanvas } from './StepCanvas'
import { StepTabs } from './StepTabs'
import { useBuilder } from './useBuilder'

type OutputView = 'preview' | 'json'

/**
 * The Phase 4 dashboard: field palette, step tabs, canvas, property
 * inspector, and — proving the whole point of a metadata-driven
 * architecture — a live preview built from the exact same FormRenderer
 * and workflow store Phases 1-3 already shipped. Nothing here has its
 * own notion of "what a text field looks like"; it only ever edits
 * `FormSchema` data and hands that data to the real runtime.
 *
 * One `DragDropContext` covers the palette (a drag source only) and the
 * *currently selected* step's canvas (source + destination). Only one
 * step's canvas is ever mounted at a time — see StepTabs — so
 * cross-step field moves go through a dedicated action
 * (`moveFieldToStep`, surfaced as... nowhere in this UI yet; it's
 * exercised by the store's own tests but has no inspector affordance
 * today, a deliberate scope cut noted in the case-study README) rather
 * than a drop target that isn't visibly on screen.
 */
export function BuilderPage() {
  const builder = useBuilder()
  const { addField, selectField, removeField, moveField } = builder
  const [outputView, setOutputView] = useState<OutputView>('preview')

  const activeStep =
    builder.schema.steps.find((s) => s.id === builder.selectedStepId) ??
    builder.schema.steps[0]
  const selectedField = activeStep?.fields.find(
    (f) => f.id === builder.selectedFieldId,
  )
  const activeStepId = activeStep?.id

  // Every handler below is memoized on the active step id and the
  // specific store action(s) it calls — destructured above so ESLint's
  // exhaustive-deps can see they're exactly what each callback closes
  // over, rather than depending on the whole `builder` object (which
  // would defeat the memoization: `builder` itself is a fresh object
  // every render, since `useStore` returns a new snapshot on every
  // change). The store actions are themselves stable for the store's
  // lifetime (see createBuilderStore's doc comment), so in practice
  // these only change identity when `activeStepId` does.
  //
  // Passing a fresh arrow function here every render — as this used to
  // — silently defeats FieldPalette's and StepCanvas's `memo` wrapping:
  // `memo` only skips a re-render when every prop is reference-equal,
  // and a new function identity fails that check regardless of what the
  // function does. The payoff is concrete for FieldPalette in
  // particular — it carries no data props at all, only this callback,
  // so a stable reference is what lets it skip re-rendering (and
  // re-registering its 8 dnd Draggables) on every keystroke anywhere
  // else in the builder.
  const handleAddFieldType = useCallback(
    (type: Parameters<typeof addField>[1]) => {
      if (activeStepId) {
        addField(activeStepId, type)
      }
    },
    [activeStepId, addField],
  )
  const handleSelectField = useCallback(
    (fieldId: string) => {
      if (activeStepId) {
        selectField(activeStepId, fieldId)
      }
    },
    [activeStepId, selectField],
  )
  const handleRemoveField = useCallback(
    (fieldId: string) => {
      if (activeStepId) {
        removeField(activeStepId, fieldId)
      }
    },
    [activeStepId, removeField],
  )
  const handleMoveField = useCallback(
    (from: number, to: number) => {
      if (activeStepId) {
        moveField(activeStepId, from, to)
      }
    },
    [activeStepId, moveField],
  )
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!activeStepId) {
        return
      }
      const action = resolveDragEnd(result, activeStepId)
      if (!action) {
        return
      }
      if (action.kind === 'addField') {
        addField(activeStepId, action.type, action.index)
      } else {
        moveField(activeStepId, action.fromIndex, action.toIndex)
      }
    },
    [activeStepId, addField, moveField],
  )

  if (!activeStep) {
    return null
  }

  return (
    <div className="builder">
      <label className="builder-meta">
        <span>Form title</span>
        <input
          type="text"
          value={builder.schema.title}
          onChange={(event) => {
            builder.setFormMeta({ title: event.target.value })
          }}
        />
        <Button type="button" variant="secondary" onClick={builder.reset}>
          Start over
        </Button>
      </label>

      <StepTabs
        steps={builder.schema.steps}
        selectedStepId={builder.selectedStepId}
        onSelect={builder.selectStep}
        onAdd={builder.addStep}
        onRemove={builder.removeStep}
        onMove={builder.moveStep}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="builder-workspace">
          <FieldPalette onAddFieldType={handleAddFieldType} />
          <StepCanvas
            step={activeStep}
            selectedFieldId={builder.selectedFieldId}
            onSelectField={handleSelectField}
            onRemoveField={handleRemoveField}
            onMoveField={handleMoveField}
          />
          {selectedField ? (
            <PropertyInspector
              schema={builder.schema}
              field={selectedField}
              onUpdateField={(patch) => {
                builder.updateField(activeStep.id, selectedField.id, patch)
              }}
              onRenameField={(name) =>
                builder.renameField(activeStep.id, selectedField.id, name)
              }
              onChangeType={(type) => {
                builder.changeFieldType(activeStep.id, selectedField.id, type)
              }}
              onSetValidation={(rules) => {
                builder.setFieldValidation(
                  activeStep.id,
                  selectedField.id,
                  rules,
                )
              }}
              onClearVisibility={() => {
                builder.clearFieldVisibility(activeStep.id, selectedField.id)
              }}
            />
          ) : (
            <div className="builder-inspector builder-inspector--empty">
              <p>Select a field to edit its properties.</p>
            </div>
          )}
        </div>
      </DragDropContext>

      <div className="builder-output">
        <div className="builder-output__switch">
          <button
            type="button"
            aria-pressed={outputView === 'preview'}
            onClick={() => {
              setOutputView('preview')
            }}
          >
            Live preview
          </button>
          <button
            type="button"
            aria-pressed={outputView === 'json'}
            onClick={() => {
              setOutputView('json')
            }}
          >
            Schema JSON
          </button>
        </div>
        {outputView === 'preview' ? (
          <LivePreview key={builder.version} schema={builder.schema} />
        ) : (
          <SchemaJsonView schema={builder.schema} />
        )}
      </div>
    </div>
  )
}
