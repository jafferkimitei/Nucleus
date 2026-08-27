import { describe, expect, it } from 'vitest'

import { createBuilderStore } from '../createBuilderStore'

describe('createBuilderStore', () => {
  it('starts with one blank step, selected, and no field selected', () => {
    const store = createBuilderStore()
    const state = store.getState()

    expect(state.schema.steps).toHaveLength(1)
    expect(state.selectedStepId).toBe(state.schema.steps[0]?.id)
    expect(state.selectedFieldId).toBeNull()
    expect(state.version).toBe(0)
  })

  it('setFormMeta patches title/description and bumps version', () => {
    const store = createBuilderStore()
    store.getState().setFormMeta({ title: 'Event Registration' })

    expect(store.getState().schema.title).toBe('Event Registration')
    expect(store.getState().version).toBe(1)
  })

  it('addStep appends a step, selects it, and clears field selection', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id
    store.getState().addField(firstStepId ?? '', 'text')

    const newStepId = store.getState().addStep()

    expect(store.getState().schema.steps).toHaveLength(2)
    expect(store.getState().schema.steps[1]?.id).toBe(newStepId)
    expect(store.getState().schema.steps[1]?.title).toBe('Step 2')
    expect(store.getState().selectedStepId).toBe(newStepId)
    expect(store.getState().selectedFieldId).toBeNull()
  })

  it('removeStep refuses to remove the last remaining step', () => {
    const store = createBuilderStore()
    const onlyStepId = store.getState().schema.steps[0]?.id ?? ''

    store.getState().removeStep(onlyStepId)

    expect(store.getState().schema.steps).toHaveLength(1)
  })

  it('removeStep removes a step and reselects the first remaining one', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id ?? ''
    const secondStepId = store.getState().addStep()
    store.getState().selectStep(secondStepId)

    store.getState().removeStep(secondStepId)

    expect(store.getState().schema.steps).toHaveLength(1)
    expect(store.getState().selectedStepId).toBe(firstStepId)
  })

  it('moveStep reorders steps', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id
    const secondStepId = store.getState().addStep()
    const thirdStepId = store.getState().addStep()

    store.getState().moveStep(0, 2)

    expect(store.getState().schema.steps.map((s) => s.id)).toEqual([
      secondStepId,
      thirdStepId,
      firstStepId,
    ])
  })

  it('addField inserts a field with a unique auto-generated name and selects it', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''

    const fieldId = store.getState().addField(stepId, 'text')

    const field = store.getState().schema.steps[0]?.fields[0]
    expect(field?.id).toBe(fieldId)
    expect(field?.name).toBe('field_1')
    expect(field?.type).toBe('text')
    expect(store.getState().selectedFieldId).toBe(fieldId)
  })

  it('addField skips names already used, including by a loaded schema', () => {
    const store = createBuilderStore({
      id: 'f',
      title: 'F',
      steps: [
        {
          id: 'step-1',
          title: 'Step 1',
          fields: [{ id: 'x', name: 'field_1', type: 'text', label: 'X' }],
        },
      ],
    })

    store.getState().addField('step-1', 'text')

    expect(store.getState().schema.steps[0]?.fields[1]?.name).toBe('field_2')
  })

  it('select/radio fields get default options; other types do not', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''

    store.getState().addField(stepId, 'select')
    store.getState().addField(stepId, 'text')

    const fields = store.getState().schema.steps[0]?.fields
    expect(fields?.[0]?.options).toHaveLength(2)
    expect(fields?.[1]?.options).toBeUndefined()
  })

  it('addField inserts at a given index rather than always appending', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    store.getState().addField(stepId, 'text') // field_1 at 0
    store.getState().addField(stepId, 'text') // field_2 at 1

    store.getState().addField(stepId, 'number', 1)

    expect(store.getState().schema.steps[0]?.fields.map((f) => f.name)).toEqual(
      ['field_1', 'field_3', 'field_2'],
    )
  })

  it('removeField removes the field and clears its selection', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const fieldId = store.getState().addField(stepId, 'text')

    store.getState().removeField(stepId, fieldId)

    expect(store.getState().schema.steps[0]?.fields).toHaveLength(0)
    expect(store.getState().selectedFieldId).toBeNull()
  })

  it('removeField clears a dangling visibleWhen on another field that referenced it', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const countryId = store.getState().addField(stepId, 'select')
    const stateId = store.getState().addField(stepId, 'text')
    store.getState().updateField(stepId, stateId, {
      visibleWhen: { fieldName: 'field_1', operator: 'equals', value: 'us' },
    })

    store.getState().removeField(stepId, countryId)

    const stateField = store
      .getState()
      .schema.steps[0]?.fields.find((f) => f.id === stateId)
    expect(stateField?.visibleWhen).toBeUndefined()
  })

  it('moveField reorders fields within a step', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    store.getState().addField(stepId, 'text') // field_1
    store.getState().addField(stepId, 'text') // field_2
    store.getState().addField(stepId, 'text') // field_3

    store.getState().moveField(stepId, 0, 2)

    expect(store.getState().schema.steps[0]?.fields.map((f) => f.name)).toEqual(
      ['field_2', 'field_3', 'field_1'],
    )
  })

  it('moveFieldToStep moves a field between steps and selects it in its new home', () => {
    const store = createBuilderStore()
    const fromStepId = store.getState().schema.steps[0]?.id ?? ''
    const toStepId = store.getState().addStep()
    const fieldId = store.getState().addField(fromStepId, 'text')

    store.getState().moveFieldToStep(fromStepId, fieldId, toStepId, 0)

    expect(store.getState().schema.steps[0]?.fields).toHaveLength(0)
    expect(store.getState().schema.steps[1]?.fields).toHaveLength(1)
    expect(store.getState().schema.steps[1]?.fields[0]?.id).toBe(fieldId)
    expect(store.getState().selectedStepId).toBe(toStepId)
    expect(store.getState().selectedFieldId).toBe(fieldId)
  })

  it('updateField patches label/placeholder/etc. without touching name/type', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const fieldId = store.getState().addField(stepId, 'text')

    store.getState().updateField(stepId, fieldId, {
      label: 'Full name',
      helpText: 'As it appears on your ID',
    })

    const field = store.getState().schema.steps[0]?.fields[0]
    expect(field?.label).toBe('Full name')
    expect(field?.helpText).toBe('As it appears on your ID')
    expect(field?.name).toBe('field_1')
  })

  it('clearFieldVisibility removes the key entirely rather than setting it undefined', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const fieldId = store.getState().addField(stepId, 'text')
    store.getState().updateField(stepId, fieldId, {
      visibleWhen: { fieldName: 'other', operator: 'notEmpty' },
    })

    store.getState().clearFieldVisibility(stepId, fieldId)

    const field = store.getState().schema.steps[0]?.fields[0]
    expect(field).not.toHaveProperty('visibleWhen')
  })

  it('renameField succeeds on a unique name and rewrites references to it', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const countryId = store.getState().addField(stepId, 'select') // field_1
    const stateId = store.getState().addField(stepId, 'text') // field_2
    store.getState().updateField(stepId, stateId, {
      visibleWhen: { fieldName: 'field_1', operator: 'equals', value: 'us' },
    })

    const ok = store.getState().renameField(stepId, countryId, 'country')

    expect(ok).toBe(true)
    expect(
      store.getState().schema.steps[0]?.fields.find((f) => f.id === countryId)
        ?.name,
    ).toBe('country')
    expect(
      store.getState().schema.steps[0]?.fields.find((f) => f.id === stateId)
        ?.visibleWhen?.fieldName,
    ).toBe('country')
  })

  it('renameField refuses a blank name or one already used elsewhere', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const firstId = store.getState().addField(stepId, 'text') // field_1
    store.getState().addField(stepId, 'text') // field_2

    expect(store.getState().renameField(stepId, firstId, '   ')).toBe(false)
    expect(store.getState().renameField(stepId, firstId, 'field_2')).toBe(false)
    expect(
      store.getState().schema.steps[0]?.fields.find((f) => f.id === firstId)
        ?.name,
    ).toBe('field_1')
  })

  it('changeFieldType resets options/validation/defaultValue for the new type', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const fieldId = store.getState().addField(stepId, 'text')
    store.getState().updateField(stepId, fieldId, {
      validation: [{ type: 'pattern', value: '^[a-z]+$' }],
      defaultValue: 'abc',
    })

    store.getState().changeFieldType(stepId, fieldId, 'select')

    const field = store.getState().schema.steps[0]?.fields[0]
    expect(field?.type).toBe('select')
    expect(field?.options).toHaveLength(2)
    expect(field?.validation).toBeUndefined()
    expect(field?.defaultValue).toBeUndefined()
  })

  it('loadSchema replaces the schema and resets selection to its first step', () => {
    const store = createBuilderStore()
    const replacement = {
      id: 'imported',
      title: 'Imported form',
      steps: [
        { id: 's1', title: 'Only step', fields: [] },
        { id: 's2', title: 'Second', fields: [] },
      ],
    }

    store.getState().loadSchema(replacement)

    expect(store.getState().schema).toEqual(replacement)
    expect(store.getState().selectedStepId).toBe('s1')
    expect(store.getState().selectedFieldId).toBeNull()
  })

  it('reset returns to a fresh blank single-step schema', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    store.getState().addField(stepId, 'text')
    store.getState().addStep()

    store.getState().reset()

    expect(store.getState().schema.steps).toHaveLength(1)
    expect(store.getState().schema.steps[0]?.fields).toHaveLength(0)
    expect(store.getState().schema.title).toBe('Untitled form')
  })
})
