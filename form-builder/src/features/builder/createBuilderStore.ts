import { createStore } from 'zustand/vanilla'

import type { FieldSchema, FormSchema } from '@/types/schema'

import { createDefaultField, defaultOptionsFor } from './fieldTypeMeta'

import type { BuilderStoreState } from './types'

function blankSchema(): FormSchema {
  return {
    id: 'untitled-form',
    title: 'Untitled form',
    steps: [{ id: crypto.randomUUID(), title: 'Step 1', fields: [] }],
  }
}

function findField(
  schema: FormSchema,
  stepId: string,
  fieldId: string,
): FieldSchema | undefined {
  return schema.steps
    .find((s) => s.id === stepId)
    ?.fields.find((f) => f.id === fieldId)
}

/** `exactOptionalPropertyTypes` means an optional key must be either
 * absent or exactly its type — never explicitly `undefined` — so
 * "clear this optional property" has to delete the key, not assign
 * `undefined` to it. Same convention as createFormStore's asyncStatus
 * cleanup (Phase 3). */
function withoutKey<T extends object>(obj: T, key: keyof T): T {
  const next = { ...obj }
  Reflect.deleteProperty(next, key)
  return next
}

/** Field names are the `values` object's keys, shared across every step
 * in the form — so uniqueness is checked schema-wide, not per step. */
function nextFieldName(schema: FormSchema): string {
  const used = new Set(schema.steps.flatMap((s) => s.fields.map((f) => f.name)))
  let n = 1
  while (used.has(`field_${n}`)) {
    n += 1
  }
  return `field_${n}`
}

export type BuilderStore = ReturnType<typeof createBuilderStore>

/**
 * Builds one builder session's Zustand store. A factory, not a
 * module-level singleton, for the same reason as `createFormStore`
 * (Phase 2/3): a singleton would leak one builder's edits into every
 * other mounted instance instead of scoping state per editor.
 */
export function createBuilderStore(initialSchema?: FormSchema) {
  return createStore<BuilderStoreState>()((set, get) => {
    const schema = initialSchema ?? blankSchema()

    return {
      schema,
      selectedStepId: schema.steps[0]?.id ?? null,
      selectedFieldId: null,
      version: 0,

      setFormMeta: (patch) => {
        set((state) => ({
          schema: { ...state.schema, ...patch },
          version: state.version + 1,
        }))
      },

      addStep: () => {
        const id = crypto.randomUUID()
        set((state) => {
          const stepNumber = state.schema.steps.length + 1
          return {
            schema: {
              ...state.schema,
              steps: [
                ...state.schema.steps,
                { id, title: `Step ${stepNumber}`, fields: [] },
              ],
            },
            selectedStepId: id,
            selectedFieldId: null,
            version: state.version + 1,
          }
        })
        return id
      },

      removeStep: (stepId) => {
        set((state) => {
          // A form with zero steps has nothing to render — refuse rather
          // than produce a schema the workflow store can't drive.
          if (state.schema.steps.length <= 1) {
            return state
          }
          const steps = state.schema.steps.filter((s) => s.id !== stepId)
          const wasSelected = state.selectedStepId === stepId
          return {
            schema: { ...state.schema, steps },
            selectedStepId: wasSelected
              ? (steps[0]?.id ?? null)
              : state.selectedStepId,
            selectedFieldId: wasSelected ? null : state.selectedFieldId,
            version: state.version + 1,
          }
        })
      },

      renameStep: (stepId, patch) => {
        set((state) => ({
          schema: {
            ...state.schema,
            steps: state.schema.steps.map((s) =>
              s.id === stepId ? { ...s, ...patch } : s,
            ),
          },
          version: state.version + 1,
        }))
      },

      moveStep: (fromIndex, toIndex) => {
        set((state) => {
          const steps = [...state.schema.steps]
          if (fromIndex < 0 || fromIndex >= steps.length) {
            return state
          }
          const clampedTo = Math.max(0, Math.min(toIndex, steps.length - 1))
          const [moved] = steps.splice(fromIndex, 1)
          if (!moved) {
            return state
          }
          steps.splice(clampedTo, 0, moved)
          return {
            schema: { ...state.schema, steps },
            version: state.version + 1,
          }
        })
      },

      selectStep: (stepId) => {
        set({ selectedStepId: stepId, selectedFieldId: null })
      },

      addField: (stepId, type, atIndex) => {
        const id = crypto.randomUUID()
        set((state) => {
          const step = state.schema.steps.find((s) => s.id === stepId)
          if (!step) {
            return state
          }
          const field = createDefaultField(
            type,
            id,
            nextFieldName(state.schema),
          )
          const fields = [...step.fields]
          const insertAt =
            atIndex === undefined
              ? fields.length
              : Math.max(0, Math.min(atIndex, fields.length))
          fields.splice(insertAt, 0, field)
          return {
            schema: {
              ...state.schema,
              steps: state.schema.steps.map((s) =>
                s.id === stepId ? { ...s, fields } : s,
              ),
            },
            selectedStepId: stepId,
            selectedFieldId: id,
            version: state.version + 1,
          }
        })
        return id
      },

      removeField: (stepId, fieldId) => {
        set((state) => {
          const removed = findField(state.schema, stepId, fieldId)
          if (!removed) {
            return state
          }
          // Dropping a field can orphan any `visibleWhen` elsewhere that
          // points at it (same integrity concern as Phase 3's async
          // visibility cascade, just at author-time instead of runtime)
          // — clear those rather than leaving a dangling reference.
          const steps = state.schema.steps.map((s) => ({
            ...s,
            fields: s.fields
              .filter((f) => f.id !== fieldId)
              .map((f) =>
                f.visibleWhen?.fieldName === removed.name
                  ? withoutKey(f, 'visibleWhen')
                  : f,
              ),
          }))
          const wasSelected = state.selectedFieldId === fieldId
          return {
            schema: { ...state.schema, steps },
            selectedFieldId: wasSelected ? null : state.selectedFieldId,
            version: state.version + 1,
          }
        })
      },

      moveField: (stepId, fromIndex, toIndex) => {
        set((state) => {
          const step = state.schema.steps.find((s) => s.id === stepId)
          if (!step) {
            return state
          }
          const fields = [...step.fields]
          if (fromIndex < 0 || fromIndex >= fields.length) {
            return state
          }
          const clampedTo = Math.max(0, Math.min(toIndex, fields.length - 1))
          const [moved] = fields.splice(fromIndex, 1)
          if (!moved) {
            return state
          }
          fields.splice(clampedTo, 0, moved)
          return {
            schema: {
              ...state.schema,
              steps: state.schema.steps.map((s) =>
                s.id === stepId ? { ...s, fields } : s,
              ),
            },
            version: state.version + 1,
          }
        })
      },

      moveFieldToStep: (fromStepId, fieldId, toStepId, toIndex) => {
        set((state) => {
          if (fromStepId === toStepId) {
            return state
          }
          const fromStep = state.schema.steps.find((s) => s.id === fromStepId)
          const toStep = state.schema.steps.find((s) => s.id === toStepId)
          const field = fromStep?.fields.find((f) => f.id === fieldId)
          if (!fromStep || !toStep || !field) {
            return state
          }
          const fromFields = fromStep.fields.filter((f) => f.id !== fieldId)
          const toFields = [...toStep.fields]
          const insertAt = Math.max(0, Math.min(toIndex, toFields.length))
          toFields.splice(insertAt, 0, field)
          return {
            schema: {
              ...state.schema,
              steps: state.schema.steps.map((s) => {
                if (s.id === fromStepId) {
                  return { ...s, fields: fromFields }
                }
                if (s.id === toStepId) {
                  return { ...s, fields: toFields }
                }
                return s
              }),
            },
            selectedStepId: toStepId,
            selectedFieldId: fieldId,
            version: state.version + 1,
          }
        })
      },

      updateField: (stepId, fieldId, patch) => {
        set((state) => ({
          schema: {
            ...state.schema,
            steps: state.schema.steps.map((s) =>
              s.id === stepId
                ? {
                    ...s,
                    fields: s.fields.map((f) =>
                      f.id === fieldId ? { ...f, ...patch } : f,
                    ),
                  }
                : s,
            ),
          },
          version: state.version + 1,
        }))
      },

      setFieldValidation: (stepId, fieldId, rules) => {
        set((state) => ({
          schema: {
            ...state.schema,
            steps: state.schema.steps.map((s) =>
              s.id === stepId
                ? {
                    ...s,
                    fields: s.fields.map((f) => {
                      if (f.id !== fieldId) {
                        return f
                      }
                      return rules && rules.length > 0
                        ? { ...f, validation: rules }
                        : withoutKey(f, 'validation')
                    }),
                  }
                : s,
            ),
          },
          version: state.version + 1,
        }))
      },

      clearFieldVisibility: (stepId, fieldId) => {
        set((state) => ({
          schema: {
            ...state.schema,
            steps: state.schema.steps.map((s) =>
              s.id === stepId
                ? {
                    ...s,
                    fields: s.fields.map((f) =>
                      f.id === fieldId ? withoutKey(f, 'visibleWhen') : f,
                    ),
                  }
                : s,
            ),
          },
          version: state.version + 1,
        }))
      },

      renameField: (stepId, fieldId, rawName) => {
        const name = rawName.trim()
        if (!name) {
          return false
        }
        const { schema } = get()
        const target = findField(schema, stepId, fieldId)
        if (!target) {
          return false
        }
        if (name === target.name) {
          return true
        }
        const collision = schema.steps.some((s) =>
          s.fields.some((f) => f.id !== fieldId && f.name === name),
        )
        if (collision) {
          return false
        }
        const oldName = target.name
        set((state) => ({
          schema: {
            ...state.schema,
            steps: state.schema.steps.map((s) => ({
              ...s,
              fields: s.fields.map((f) => {
                if (f.id === fieldId) {
                  return { ...f, name }
                }
                // A rename shouldn't silently break another field's
                // condition that referenced the old name.
                if (f.visibleWhen?.fieldName === oldName) {
                  return {
                    ...f,
                    visibleWhen: { ...f.visibleWhen, fieldName: name },
                  }
                }
                return f
              }),
            })),
          },
          version: state.version + 1,
        }))
        return true
      },

      changeFieldType: (stepId, fieldId, type) => {
        set((state) => {
          const target = findField(state.schema, stepId, fieldId)
          if (!target) {
            return state
          }
          const options = defaultOptionsFor(type)
          const bare = { ...target }
          Reflect.deleteProperty(bare, 'validation')
          Reflect.deleteProperty(bare, 'defaultValue')
          Reflect.deleteProperty(bare, 'options')
          const updated: FieldSchema = {
            ...bare,
            type,
            ...(options ? { options } : {}),
          }
          return {
            schema: {
              ...state.schema,
              steps: state.schema.steps.map((s) =>
                s.id === stepId
                  ? {
                      ...s,
                      fields: s.fields.map((f) =>
                        f.id === fieldId ? updated : f,
                      ),
                    }
                  : s,
              ),
            },
            version: state.version + 1,
          }
        })
      },

      selectField: (stepId, fieldId) => {
        set({ selectedStepId: stepId, selectedFieldId: fieldId })
      },

      clearSelection: () => {
        set({ selectedFieldId: null })
      },

      loadSchema: (schema) => {
        set((state) => ({
          schema,
          selectedStepId: schema.steps[0]?.id ?? null,
          selectedFieldId: null,
          version: state.version + 1,
        }))
      },

      reset: () => {
        set((state) => {
          const fresh = blankSchema()
          return {
            schema: fresh,
            selectedStepId: fresh.steps[0]?.id ?? null,
            selectedFieldId: null,
            version: state.version + 1,
          }
        })
      },
    }
  })
}
