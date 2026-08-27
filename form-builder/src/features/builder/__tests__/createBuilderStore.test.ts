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

  it('selectedStepId falls back to null when the initial schema has no steps', () => {
    // schema.steps[0]?.id ?? null — the ?? null branch, unreachable through
    // blankSchema() (always seeds one step) but reachable via an imported
    // schema, which isn't type-guaranteed to be non-empty at runtime.
    const store = createBuilderStore({ id: 'f', title: 'F', steps: [] })

    expect(store.getState().selectedStepId).toBeNull()
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

  it('removeStep leaves selection untouched when the removed step is not the selected one', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id ?? ''
    const secondStepId = store.getState().addStep()
    store.getState().selectStep(firstStepId)

    store.getState().removeStep(secondStepId)

    expect(store.getState().schema.steps).toHaveLength(1)
    expect(store.getState().selectedStepId).toBe(firstStepId)
  })

  it('renameStep patches only the targeted step, leaving others untouched', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id ?? ''
    const secondStepId = store.getState().addStep()

    store.getState().renameStep(firstStepId, { title: 'Personal details' })

    expect(store.getState().schema.steps[0]?.title).toBe('Personal details')
    expect(store.getState().schema.steps[1]?.id).toBe(secondStepId)
    expect(store.getState().schema.steps[1]?.title).toBe('Step 2')
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

  it('moveStep does nothing when fromIndex is out of range', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id
    store.getState().addStep()

    store.getState().moveStep(-1, 1)
    store.getState().moveStep(5, 0)

    expect(store.getState().schema.steps.map((s) => s.id)[0]).toBe(firstStepId)
    expect(store.getState().version).toBe(1) // only the addStep bumped it
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

  it('addField does nothing when the step does not exist', () => {
    const store = createBuilderStore()

    store.getState().addField('no-such-step', 'text')

    expect(store.getState().schema.steps[0]?.fields).toHaveLength(0)
    expect(store.getState().version).toBe(0)
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

  it('removeField does nothing when the field does not exist', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    store.getState().addField(stepId, 'text')

    store.getState().removeField(stepId, 'no-such-field')

    expect(store.getState().schema.steps[0]?.fields).toHaveLength(1)
    expect(store.getState().version).toBe(1) // only the addField bumped it
  })

  it('removeField leaves a field with no matching visibleWhen untouched', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const countryId = store.getState().addField(stepId, 'select') // field_1
    const unrelatedId = store.getState().addField(stepId, 'text') // field_2
    store.getState().updateField(stepId, unrelatedId, {
      visibleWhen: { fieldName: 'some_other_field', operator: 'notEmpty' },
    })

    store.getState().removeField(stepId, countryId)

    const unrelated = store
      .getState()
      .schema.steps[0]?.fields.find((f) => f.id === unrelatedId)
    // unrelated's visibleWhen points at a name other than countryId's
    // ('field_1'), so removing countryId shouldn't touch it — the `: f`
    // passthrough branch inside removeField's cleanup map.
    expect(unrelated?.visibleWhen).toEqual({
      fieldName: 'some_other_field',
      operator: 'notEmpty',
    })
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

  it('moveField does nothing when the step does not exist', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    store.getState().addField(stepId, 'text')

    store.getState().moveField('no-such-step', 0, 1)

    expect(store.getState().version).toBe(1) // only the addField bumped it
  })

  it('moveField does nothing when fromIndex is out of range', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    store.getState().addField(stepId, 'text')

    store.getState().moveField(stepId, -1, 0)
    store.getState().moveField(stepId, 5, 0)

    expect(store.getState().schema.steps[0]?.fields.map((f) => f.name)).toEqual(
      ['field_1'],
    )
    expect(store.getState().version).toBe(1) // only the addField bumped it
  })

  it('moveField leaves other steps untouched', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id ?? ''
    const secondStepId = store.getState().addStep()
    store.getState().addField(secondStepId, 'text')
    store.getState().addField(firstStepId, 'text')
    store.getState().addField(firstStepId, 'text')

    store.getState().moveField(firstStepId, 0, 1)

    const secondStepFields = store.getState().schema.steps[1]?.fields
    expect(secondStepFields).toHaveLength(1)
    expect(secondStepFields?.[0]?.name).toBe('field_1')
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

  it('moveFieldToStep does nothing when the source and destination step are the same', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const fieldId = store.getState().addField(stepId, 'text')

    store.getState().moveFieldToStep(stepId, fieldId, stepId, 0)

    expect(store.getState().version).toBe(1) // only the addField bumped it
  })

  it('moveFieldToStep does nothing when the step or field does not exist', () => {
    const store = createBuilderStore()
    const fromStepId = store.getState().schema.steps[0]?.id ?? ''
    const toStepId = store.getState().addStep()
    const fieldId = store.getState().addField(fromStepId, 'text')

    store.getState().moveFieldToStep('no-such-step', fieldId, toStepId, 0)
    store.getState().moveFieldToStep(fromStepId, 'no-such-field', toStepId, 0)
    store.getState().moveFieldToStep(fromStepId, fieldId, 'no-such-step', 0)

    expect(store.getState().schema.steps[0]?.fields).toHaveLength(1)
    expect(store.getState().schema.steps[1]?.fields).toHaveLength(0)
  })

  it('moveFieldToStep leaves a third, unrelated step untouched', () => {
    const store = createBuilderStore()
    const fromStepId = store.getState().schema.steps[0]?.id ?? ''
    const toStepId = store.getState().addStep()
    const thirdStepId = store.getState().addStep()
    store.getState().addField(thirdStepId, 'text')
    const fieldId = store.getState().addField(fromStepId, 'text')

    store.getState().moveFieldToStep(fromStepId, fieldId, toStepId, 0)

    const thirdStepFields = store.getState().schema.steps[2]?.fields
    expect(thirdStepFields).toHaveLength(1)
    expect(thirdStepFields?.[0]?.name).toBe('field_1')
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

  it('updateField leaves other steps untouched', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id ?? ''
    const secondStepId = store.getState().addStep()
    const otherFieldId = store.getState().addField(secondStepId, 'text')
    const originalOtherLabel = store
      .getState()
      .schema.steps[1]?.fields.find((f) => f.id === otherFieldId)?.label
    const fieldId = store.getState().addField(firstStepId, 'text')

    store.getState().updateField(firstStepId, fieldId, { label: 'Name' })

    const otherField = store
      .getState()
      .schema.steps[1]?.fields.find((f) => f.id === otherFieldId)
    expect(otherField?.label).toBe(originalOtherLabel)
    expect(otherField?.label).not.toBe('Name')
  })

  it('setFieldValidation sets rules, clears them when empty, and leaves other steps untouched', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id ?? ''
    const secondStepId = store.getState().addStep()
    const otherFieldId = store.getState().addField(secondStepId, 'text')
    const fieldId = store.getState().addField(firstStepId, 'text')

    store
      .getState()
      .setFieldValidation(firstStepId, fieldId, [{ type: 'required' }])

    let field = store.getState().schema.steps[0]?.fields[0]
    expect(field?.validation).toEqual([{ type: 'required' }])
    const otherField = store
      .getState()
      .schema.steps[1]?.fields.find((f) => f.id === otherFieldId)
    expect(otherField).not.toHaveProperty('validation')

    store.getState().setFieldValidation(firstStepId, fieldId, [])

    field = store.getState().schema.steps[0]?.fields[0]
    expect(field).not.toHaveProperty('validation')
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

  it('clearFieldVisibility leaves other steps untouched', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id ?? ''
    const secondStepId = store.getState().addStep()
    const otherFieldId = store.getState().addField(secondStepId, 'text')
    store.getState().updateField(secondStepId, otherFieldId, {
      visibleWhen: { fieldName: 'x', operator: 'notEmpty' },
    })
    const fieldId = store.getState().addField(firstStepId, 'text')

    store.getState().clearFieldVisibility(firstStepId, fieldId)

    const otherField = store
      .getState()
      .schema.steps[1]?.fields.find((f) => f.id === otherFieldId)
    expect(otherField?.visibleWhen).toEqual({
      fieldName: 'x',
      operator: 'notEmpty',
    })
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

  it('renameField returns false when the field does not exist', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''

    expect(store.getState().renameField(stepId, 'no-such-field', 'x')).toBe(
      false,
    )
    expect(store.getState().version).toBe(0)
  })

  it('renameField returns true and no-ops when renamed to its current name', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const fieldId = store.getState().addField(stepId, 'text') // field_1

    const ok = store.getState().renameField(stepId, fieldId, 'field_1')

    expect(ok).toBe(true)
    expect(store.getState().version).toBe(1) // only the addField bumped it
  })

  it('renameField leaves an unrelated field with no matching visibleWhen untouched', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const targetId = store.getState().addField(stepId, 'text') // field_1
    const unrelatedId = store.getState().addField(stepId, 'text') // field_2
    store.getState().updateField(stepId, unrelatedId, {
      visibleWhen: { fieldName: 'some_other_field', operator: 'notEmpty' },
    })

    store.getState().renameField(stepId, targetId, 'renamed')

    const unrelated = store
      .getState()
      .schema.steps[0]?.fields.find((f) => f.id === unrelatedId)
    // unrelated's visibleWhen doesn't reference targetId's old name, so it
    // hits the plain `return f` passthrough rather than the rewrite branch.
    expect(unrelated?.visibleWhen).toEqual({
      fieldName: 'some_other_field',
      operator: 'notEmpty',
    })
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

  it('changeFieldType does nothing when the field does not exist', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''

    store.getState().changeFieldType(stepId, 'no-such-field', 'select')

    expect(store.getState().version).toBe(0)
  })

  it('changeFieldType leaves other steps untouched', () => {
    const store = createBuilderStore()
    const firstStepId = store.getState().schema.steps[0]?.id ?? ''
    const secondStepId = store.getState().addStep()
    const otherFieldId = store.getState().addField(secondStepId, 'text')
    const fieldId = store.getState().addField(firstStepId, 'text')

    store.getState().changeFieldType(firstStepId, fieldId, 'select')

    const otherField = store
      .getState()
      .schema.steps[1]?.fields.find((f) => f.id === otherFieldId)
    expect(otherField?.type).toBe('text')
  })

  it('clearSelection clears only the field selection, leaving the step selected', () => {
    const store = createBuilderStore()
    const stepId = store.getState().schema.steps[0]?.id ?? ''
    const fieldId = store.getState().addField(stepId, 'text')
    expect(store.getState().selectedFieldId).toBe(fieldId)

    store.getState().clearSelection()

    expect(store.getState().selectedFieldId).toBeNull()
    expect(store.getState().selectedStepId).toBe(stepId)
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

  it('loadSchema falls back to a null selectedStepId when the schema has no steps', () => {
    const store = createBuilderStore()

    store.getState().loadSchema({ id: 'empty', title: 'Empty', steps: [] })

    expect(store.getState().selectedStepId).toBeNull()
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
