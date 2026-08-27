import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { FieldSchema, FormSchema } from '@/types/schema'

import { PropertyInspector } from '../PropertyInspector'

import type { PropertyInspectorProps } from '../PropertyInspector'

/**
 * Direct, unit-level coverage of PropertyInspector's own logic —
 * validation rule editing, the visibility condition editor's field/
 * operator/value wiring, and parseConditionValue's true/false/numeric/
 * string heuristic. BuilderPage.test.tsx already exercises a slice of
 * this through the full builder store; this file is narrower (mocked
 * handlers, no store) and reaches the branches that slice doesn't:
 * editing an option's value (not just its label), the async rule's
 * message field, switching which field a condition depends on, and the
 * asyncStatus operator's own value select.
 */
function makeSchema(fields: FieldSchema[]): FormSchema {
  return {
    id: 'form',
    title: 'Form',
    steps: [{ id: 'step-1', title: 'Step 1', fields }],
  }
}

function textField(overrides: Partial<FieldSchema> = {}): FieldSchema {
  return {
    id: 'f-1',
    name: 'field_1',
    type: 'text',
    label: 'Field',
    ...overrides,
  }
}

function renderInspector(
  field: FieldSchema,
  otherFields: FieldSchema[] = [],
  overrides: Partial<{
    onUpdateField: PropertyInspectorProps['onUpdateField']
    onRenameField: PropertyInspectorProps['onRenameField']
    onChangeType: PropertyInspectorProps['onChangeType']
    onSetValidation: PropertyInspectorProps['onSetValidation']
    onClearVisibility: PropertyInspectorProps['onClearVisibility']
  }> = {},
) {
  const onUpdateField =
    overrides.onUpdateField ?? vi.fn<PropertyInspectorProps['onUpdateField']>()
  const onRenameField =
    overrides.onRenameField ??
    vi.fn<PropertyInspectorProps['onRenameField']>(() => true)
  const onChangeType =
    overrides.onChangeType ?? vi.fn<PropertyInspectorProps['onChangeType']>()
  const onSetValidation =
    overrides.onSetValidation ??
    vi.fn<PropertyInspectorProps['onSetValidation']>()
  const onClearVisibility =
    overrides.onClearVisibility ??
    vi.fn<PropertyInspectorProps['onClearVisibility']>()

  render(
    <PropertyInspector
      schema={makeSchema([field, ...otherFields])}
      field={field}
      onUpdateField={onUpdateField}
      onRenameField={onRenameField}
      onChangeType={onChangeType}
      onSetValidation={onSetValidation}
      onClearVisibility={onClearVisibility}
    />,
  )

  return {
    onUpdateField,
    onRenameField,
    onChangeType,
    onSetValidation,
    onClearVisibility,
  }
}

describe('PropertyInspector', () => {
  it('edits placeholder and help text', async () => {
    const user = userEvent.setup()
    const { onUpdateField } = renderInspector(textField())

    await user.type(screen.getByLabelText('Placeholder'), 'x')
    expect(onUpdateField).toHaveBeenCalledWith({ placeholder: 'x' })

    await user.type(screen.getByLabelText('Help text'), 'y')
    expect(onUpdateField).toHaveBeenCalledWith({ helpText: 'y' })
  })

  it('commitName is a no-op when the trimmed draft matches the current name', async () => {
    const user = userEvent.setup()
    const { onRenameField } = renderInspector(textField({ name: 'field_1' }))

    const nameInput = screen.getByLabelText('Name (data key)')
    await user.click(nameInput)
    await user.keyboard('  ')
    await user.tab()

    // Trimmed draft ("field_1" + whitespace, trimmed back to "field_1")
    // equals the field's current name, so this is treated as no change
    // — onRenameField is never called, and any error is cleared.
    expect(onRenameField).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the rename error when onRenameField reports failure', async () => {
    const user = userEvent.setup()
    const onRenameField = vi.fn(() => false)
    renderInspector(textField(), [], { onRenameField })

    const nameInput = screen.getByLabelText('Name (data key)')
    await user.clear(nameInput)
    await user.type(nameInput, 'taken')
    await user.tab()

    expect(onRenameField).toHaveBeenCalledWith('taken')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Must be non-empty and unique across the form.',
    )
  })

  it('edits an option label and an option value independently', async () => {
    const user = userEvent.setup()
    const { onUpdateField } = renderInspector(
      textField({
        type: 'select',
        options: [{ value: 'a', label: 'A' }],
      }),
    )

    await user.type(screen.getByLabelText('Option 1 label'), 'x')
    expect(onUpdateField).toHaveBeenLastCalledWith({
      options: [{ value: 'a', label: 'Ax' }],
    })

    await user.type(screen.getByLabelText('Option 1 value'), 'y')
    expect(onUpdateField).toHaveBeenLastCalledWith({
      options: [{ value: 'ay', label: 'A' }],
    })
  })

  // Each rule input is a controlled component driven by `field.validation`
  // — PropertyInspector holds no state of its own for it — so "set" and
  // "clear" are exercised as separate renders rather than one render with
  // two fireEvents: without a real store feeding an updated `field` back
  // in between, a second fireEvent on an unchanged-prop input can't be
  // relied on to reflect the first one's effect (React snaps the
  // controlled value back to the untouched prop after the first change,
  // so a same-valued second event may not even register as a change).

  it('sets the pattern, min length, and max length rules', () => {
    const onSetValidation = vi.fn()
    renderInspector(textField(), [], { onSetValidation })

    // fireEvent.change, not user.type — a regex pattern is full of
    // characters user-event's typing parser misreads as key syntax
    // (`{`, `[`), same reasoning as BuilderPage.test.tsx.
    fireEvent.change(screen.getByLabelText('Pattern (regex)'), {
      target: { value: '^[a-z]+$' },
    })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'pattern', value: '^[a-z]+$' },
    ])

    fireEvent.change(screen.getByLabelText('Min length'), {
      target: { value: '2' },
    })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'minLength', value: 2 },
    ])

    fireEvent.change(screen.getByLabelText('Max length'), {
      target: { value: '10' },
    })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'maxLength', value: 10 },
    ])
  })

  it('clears the pattern, min length, and max length rules', () => {
    const onSetValidation = vi.fn()
    renderInspector(
      textField({
        validation: [
          { type: 'pattern', value: '^[a-z]+$' },
          { type: 'minLength', value: 2 },
          { type: 'maxLength', value: 10 },
        ],
      }),
      [],
      { onSetValidation },
    )

    fireEvent.change(screen.getByLabelText('Pattern (regex)'), {
      target: { value: '' },
    })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'minLength', value: 2 },
      { type: 'maxLength', value: 10 },
    ])

    fireEvent.change(screen.getByLabelText('Min length'), {
      target: { value: '' },
    })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'pattern', value: '^[a-z]+$' },
      { type: 'maxLength', value: 10 },
    ])

    fireEvent.change(screen.getByLabelText('Max length'), {
      target: { value: '' },
    })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'pattern', value: '^[a-z]+$' },
      { type: 'minLength', value: 2 },
    ])
  })

  it('sets the min/max rules for a number field', () => {
    const onSetValidation = vi.fn()
    renderInspector(textField({ type: 'number' }), [], { onSetValidation })

    fireEvent.change(screen.getByLabelText('Min'), { target: { value: '1' } })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'min', value: 1 },
    ])

    fireEvent.change(screen.getByLabelText('Max'), { target: { value: '9' } })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'max', value: 9 },
    ])
  })

  it('clears the min/max rules for a number field', () => {
    const onSetValidation = vi.fn()
    renderInspector(
      textField({
        type: 'number',
        validation: [
          { type: 'min', value: 1 },
          { type: 'max', value: 9 },
        ],
      }),
      [],
      { onSetValidation },
    )

    fireEvent.change(screen.getByLabelText('Min'), { target: { value: '' } })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'max', value: 9 },
    ])

    fireEvent.change(screen.getByLabelText('Max'), { target: { value: '' } })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'min', value: 1 },
    ])
  })

  it('async rule editor: setting the endpoint creates the rule', () => {
    const onSetValidation = vi.fn()
    renderInspector(textField(), [], { onSetValidation })

    fireEvent.change(screen.getByPlaceholderText('/api/check-something'), {
      target: { value: '/api/check' },
    })
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'async', endpoint: '/api/check' },
    ])
  })

  it('async rule editor: editing the message on an existing rule updates it, clearing the endpoint removes it', () => {
    // The message input is only rendered once a rule already exists
    // (`{rule && (...)}`), and this component is fully controlled by
    // the `field` prop — it has no state of its own for the rule — so
    // this starts from a field that already has one, rather than
    // trying to interact with an input that a prior fireEvent hasn't
    // actually caused to appear (onSetValidation being called doesn't
    // rerender with a new `field` unless something feeds that back in,
    // same as it wouldn't through the real store either without a
    // fresh render).
    const onSetValidation = vi.fn()
    renderInspector(
      textField({ validation: [{ type: 'async', endpoint: '/api/check' }] }),
      [],
      { onSetValidation },
    )

    fireEvent.change(
      screen.getByPlaceholderText('Error message if it comes back invalid'),
      { target: { value: 'Nope' } },
    )
    expect(onSetValidation).toHaveBeenLastCalledWith([
      { type: 'async', endpoint: '/api/check', message: 'Nope' },
    ])

    fireEvent.change(screen.getByPlaceholderText('/api/check-something'), {
      target: { value: '' },
    })
    expect(onSetValidation).toHaveBeenLastCalledWith([])
  })

  it('async rule editor starts from an existing rule with a message already set', () => {
    renderInspector(
      textField({
        validation: [{ type: 'async', endpoint: '/api/check', message: 'Bad' }],
      }),
    )

    expect(screen.getByPlaceholderText('/api/check-something')).toHaveValue(
      '/api/check',
    )
    expect(
      screen.getByPlaceholderText('Error message if it comes back invalid'),
    ).toHaveValue('Bad')
  })

  it('visibility editor: checking the box enables a condition on the first other field', async () => {
    const user = userEvent.setup()
    const other1 = textField({ id: 'f-2', name: 'other1', label: 'Other 1' })
    const other2 = textField({ id: 'f-3', name: 'other2', label: 'Other 2' })
    const onUpdateField = vi.fn()
    renderInspector(textField(), [other1, other2], { onUpdateField })

    const checkbox = screen.getByRole('checkbox', {
      name: 'Only show this field conditionally',
    })
    expect(checkbox).toBeEnabled()

    await user.click(checkbox)
    expect(onUpdateField).toHaveBeenCalledWith({
      visibleWhen: { fieldName: 'other1', operator: 'notEmpty' },
    })
  })

  it('visibility editor: the checkbox is disabled when there are no other fields to depend on', () => {
    renderInspector(textField(), [])

    expect(
      screen.getByRole('checkbox', {
        name: 'Only show this field conditionally',
      }),
    ).toBeDisabled()
  })

  it('visibility editor: unchecking the box clears the condition', async () => {
    const user = userEvent.setup()
    const other = textField({ id: 'f-2', name: 'other', label: 'Other' })
    const onClearVisibility = vi.fn()
    renderInspector(
      textField({
        visibleWhen: { fieldName: 'other', operator: 'notEmpty' },
      }),
      [other],
      { onClearVisibility },
    )

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Only show this field conditionally',
      }),
    )
    expect(onClearVisibility).toHaveBeenCalled()
  })

  it('visibility editor: switching the operator away from notEmpty defaults value to an empty string, and to asyncStatus defaults it to "valid"', async () => {
    const user = userEvent.setup()
    const other = textField({ id: 'f-2', name: 'other', label: 'Other' })
    const onUpdateField = vi.fn()
    renderInspector(
      textField({
        visibleWhen: { fieldName: 'other', operator: 'notEmpty' },
      }),
      [other],
      { onUpdateField },
    )

    await user.selectOptions(screen.getByLabelText('Operator'), 'equals')
    expect(onUpdateField).toHaveBeenLastCalledWith({
      visibleWhen: { fieldName: 'other', operator: 'equals', value: '' },
    })

    await user.selectOptions(screen.getByLabelText('Operator'), 'asyncStatus')
    expect(onUpdateField).toHaveBeenLastCalledWith({
      visibleWhen: {
        fieldName: 'other',
        operator: 'asyncStatus',
        value: 'valid',
      },
    })
  })

  it('visibility editor: switches which field the condition depends on', async () => {
    const user = userEvent.setup()
    const other1 = textField({ id: 'f-2', name: 'other1', label: 'Other 1' })
    const other2 = textField({ id: 'f-3', name: 'other2', label: 'Other 2' })
    const onUpdateField = vi.fn()
    renderInspector(
      textField({
        visibleWhen: { fieldName: 'other1', operator: 'notEmpty' },
      }),
      [other1, other2],
      { onUpdateField },
    )

    await user.selectOptions(screen.getByLabelText('When field'), 'other2')
    expect(onUpdateField).toHaveBeenCalledWith({
      visibleWhen: { fieldName: 'other2', operator: 'notEmpty' },
    })
  })

  it('visibility editor: asyncStatus operator exposes and updates "Status equals"', async () => {
    const user = userEvent.setup()
    const other = textField({ id: 'f-2', name: 'other', label: 'Other' })
    const onUpdateField = vi.fn()
    renderInspector(
      textField({
        visibleWhen: {
          fieldName: 'other',
          operator: 'asyncStatus',
          value: 'valid',
        },
      }),
      [other],
      { onUpdateField },
    )

    const statusSelect = screen.getByLabelText('Status equals')
    expect(statusSelect).toHaveValue('valid')

    await user.selectOptions(statusSelect, 'invalid')
    expect(onUpdateField).toHaveBeenCalledWith({
      visibleWhen: {
        fieldName: 'other',
        operator: 'asyncStatus',
        value: 'invalid',
      },
    })
  })

  it('visibility editor: parses true/false/numeric/string condition values for equals', () => {
    const other = textField({ id: 'f-2', name: 'other', label: 'Other' })
    const onUpdateField = vi.fn()
    renderInspector(
      textField({
        visibleWhen: { fieldName: 'other', operator: 'equals', value: '' },
      }),
      [other],
      { onUpdateField },
    )

    const valueInput = screen.getByLabelText('Value')

    fireEvent.change(valueInput, { target: { value: 'true' } })
    expect(onUpdateField).toHaveBeenLastCalledWith({
      visibleWhen: { fieldName: 'other', operator: 'equals', value: true },
    })

    fireEvent.change(valueInput, { target: { value: 'false' } })
    expect(onUpdateField).toHaveBeenLastCalledWith({
      visibleWhen: { fieldName: 'other', operator: 'equals', value: false },
    })

    fireEvent.change(valueInput, { target: { value: '42' } })
    expect(onUpdateField).toHaveBeenLastCalledWith({
      visibleWhen: { fieldName: 'other', operator: 'equals', value: 42 },
    })

    fireEvent.change(valueInput, { target: { value: 'US' } })
    expect(onUpdateField).toHaveBeenLastCalledWith({
      visibleWhen: { fieldName: 'other', operator: 'equals', value: 'US' },
    })
  })

  it('visibility editor: the "in" operator splits a comma-separated value into a parsed array', () => {
    const other = textField({ id: 'f-2', name: 'other', label: 'Other' })
    const onUpdateField = vi.fn()
    renderInspector(
      textField({
        visibleWhen: { fieldName: 'other', operator: 'in', value: [] },
      }),
      [other],
      { onUpdateField },
    )

    expect(
      screen.getByLabelText('Value(s), comma-separated'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Value(s), comma-separated'), {
      target: { value: 'US, 2, true' },
    })
    expect(onUpdateField).toHaveBeenLastCalledWith({
      visibleWhen: {
        fieldName: 'other',
        operator: 'in',
        value: ['US', 2, true],
      },
    })
  })
})
