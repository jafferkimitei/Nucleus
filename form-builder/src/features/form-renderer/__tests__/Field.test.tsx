import { useState } from 'react'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { FieldSchema, FieldValue } from '@/types/schema'

import { Field } from '../Field'

/** Minimal controlled harness so each test can assert round-tripped
 * values, not just that onChange was called with *something*. */
function renderField(
  field: FieldSchema,
  initialValue: FieldValue = null,
  checking = false,
) {
  const onFieldChange = vi.fn()

  function Harness() {
    const [value, setValue] = useState<FieldValue>(initialValue)
    return (
      <Field
        field={field}
        value={value}
        error={undefined}
        checking={checking}
        onFieldChange={(name, next) => {
          setValue(next)
          onFieldChange(name, next)
        }}
        onFieldBlur={undefined}
      />
    )
  }

  render(<Harness />)
  return { onFieldChange }
}

describe('Field', () => {
  it('renders a text field and reports typed values', async () => {
    const user = userEvent.setup()
    const { onFieldChange } = renderField({
      id: 'f-name',
      name: 'name',
      type: 'text',
      label: 'Name',
    })

    await user.type(screen.getByLabelText('Name'), 'Ada')

    expect(onFieldChange).toHaveBeenLastCalledWith('name', 'Ada')
  })

  it('renders an email field as a native email input', () => {
    renderField({ id: 'f-email', name: 'email', type: 'email', label: 'Email' })
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
  })

  it('renders a date field as a native date input', async () => {
    const user = userEvent.setup()
    const { onFieldChange } = renderField({
      id: 'f-dob',
      name: 'dob',
      type: 'date',
      label: 'Date of birth',
    })

    const input = screen.getByLabelText('Date of birth')
    expect(input).toHaveAttribute('type', 'date')
    await user.type(input, '2000-01-15')

    expect(onFieldChange).toHaveBeenLastCalledWith('dob', '2000-01-15')
  })

  it('renders a textarea and reports typed values', async () => {
    const user = userEvent.setup()
    const { onFieldChange } = renderField({
      id: 'f-bio',
      name: 'bio',
      type: 'textarea',
      label: 'Bio',
    })

    await user.type(screen.getByLabelText('Bio'), 'Hi')

    expect(onFieldChange).toHaveBeenLastCalledWith('bio', 'Hi')
  })

  it('reports null, not an empty string, when a textarea is cleared', async () => {
    const user = userEvent.setup()
    const { onFieldChange } = renderField(
      { id: 'f-bio', name: 'bio', type: 'textarea', label: 'Bio' },
      'Hi',
    )

    await user.clear(screen.getByLabelText('Bio'))

    expect(onFieldChange).toHaveBeenLastCalledWith('bio', null)
  })

  it('reports null, not an empty string, when a text field is cleared', async () => {
    const user = userEvent.setup()
    const { onFieldChange } = renderField(
      { id: 'f-name', name: 'name', type: 'text', label: 'Name' },
      'Ada',
    )

    await user.clear(screen.getByLabelText('Name'))

    expect(onFieldChange).toHaveBeenLastCalledWith('name', null)
  })

  it('renders a required text field with an asterisk and native required attribute', () => {
    renderField({
      id: 'f-name',
      name: 'name',
      type: 'text',
      label: 'Name',
      validation: [{ type: 'required' }],
    })

    const input = screen.getByLabelText(/Name/)
    expect(input).toBeRequired()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('parses number field input to a number, preserving in-progress decimals', async () => {
    const user = userEvent.setup()
    const { onFieldChange } = renderField({
      id: 'f-count',
      name: 'count',
      type: 'number',
      label: 'Count',
    })

    const input = screen.getByLabelText('Count')
    await user.type(input, '1.5')

    expect(input).toHaveValue(1.5)
    expect(onFieldChange).toHaveBeenLastCalledWith('count', 1.5)
  })

  it("resyncs the number field's displayed text to an externally-changed value", () => {
    // The displayed text is local state so in-progress typing (e.g. a
    // trailing ".") isn't clobbered on every keystroke — but it still
    // has to pick up a value that changed for a reason other than this
    // control's own onChange (e.g. a form reset). Simulated here by
    // re-rendering the same Field with a new `value` prop, exactly what
    // happens when the store's `values` object changes out from under it.
    const { rerender } = render(
      <Field
        field={{ id: 'f-count', name: 'count', type: 'number', label: 'Count' }}
        value={5}
        error={undefined}
        checking={false}
        onFieldChange={vi.fn()}
        onFieldBlur={undefined}
      />,
    )
    expect(screen.getByLabelText('Count')).toHaveValue(5)

    rerender(
      <Field
        field={{ id: 'f-count', name: 'count', type: 'number', label: 'Count' }}
        value={null}
        error={undefined}
        checking={false}
        onFieldChange={vi.fn()}
        onFieldBlur={undefined}
      />,
    )

    expect(screen.getByLabelText('Count')).toHaveValue(null)
  })

  it('renders select options from the schema and reports the chosen value', async () => {
    const user = userEvent.setup()
    const { onFieldChange } = renderField({
      id: 'f-role',
      name: 'role',
      type: 'select',
      label: 'Role',
      options: [
        { value: 'engineer', label: 'Engineer' },
        { value: 'designer', label: 'Designer' },
      ],
    })

    await user.selectOptions(screen.getByLabelText('Role'), 'designer')

    expect(onFieldChange).toHaveBeenLastCalledWith('role', 'designer')
  })

  it('reports null, not an empty string, when a select is cleared back to its placeholder', async () => {
    const user = userEvent.setup()
    const { onFieldChange } = renderField(
      {
        id: 'f-role',
        name: 'role',
        type: 'select',
        label: 'Role',
        options: [{ value: 'engineer', label: 'Engineer' }],
      },
      'engineer',
    )

    await user.selectOptions(screen.getByLabelText('Role'), '')

    expect(onFieldChange).toHaveBeenLastCalledWith('role', null)
  })

  it('renders a select with no options seeded as just the placeholder', () => {
    // options ?? [] — a hand-authored or imported schema might omit the
    // key entirely rather than seeding an empty array.
    renderField({
      id: 'f-role',
      name: 'role',
      type: 'select',
      label: 'Role',
    })

    expect(
      within(screen.getByLabelText('Role')).getAllByRole('option'),
    ).toHaveLength(1) // the placeholder only
  })

  it('renders a radio group with no options seeded as no radio buttons', () => {
    renderField({
      id: 'f-contact',
      name: 'contact',
      type: 'radio',
      label: 'Contact method',
    })

    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  it('renders radio options and reports the selected one', async () => {
    const user = userEvent.setup()
    const { onFieldChange } = renderField({
      id: 'f-contact',
      name: 'contact',
      type: 'radio',
      label: 'Contact method',
      options: [
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
      ],
    })

    await user.click(screen.getByLabelText('SMS'))

    expect(onFieldChange).toHaveBeenLastCalledWith('contact', 'sms')
  })

  it('renders a checkbox without the shared FieldWrapper chrome', async () => {
    const user = userEvent.setup()
    const { onFieldChange } = renderField({
      id: 'f-agree',
      name: 'agree',
      type: 'checkbox',
      label: 'I agree',
    })

    const checkbox = screen.getByLabelText('I agree')
    await user.click(checkbox)

    expect(onFieldChange).toHaveBeenLastCalledWith('agree', true)
    // FieldWrapper renders an asterisk span for required fields; checkbox
    // skips that layout, so there should be no such element here.
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('wires a checkbox field to its error id via aria-describedby', () => {
    render(
      <Field
        field={{
          id: 'f-agree',
          name: 'agree',
          type: 'checkbox',
          label: 'I agree',
        }}
        value={false}
        error="You must agree to continue"
        checking={false}
        onFieldChange={vi.fn()}
        onFieldBlur={undefined}
      />,
    )

    // Checkboxes skip FieldWrapper's shared chrome (see the test above),
    // but Field.tsx still has to point them at their own error id itself
    // — this is that describedBy wiring, not FieldWrapper's.
    expect(screen.getByLabelText('I agree')).toHaveAttribute(
      'aria-describedby',
      'f-agree-error',
    )
  })

  it('shows a "Checking…" status while an async rule is in flight', () => {
    render(
      <Field
        field={{
          id: 'f-promo',
          name: 'promo',
          type: 'text',
          label: 'Promo code',
        }}
        value="PROMO1"
        error={undefined}
        checking
        onFieldChange={vi.fn()}
        onFieldBlur={undefined}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Checking…')
  })

  it('shows the error message and marks the control invalid', () => {
    render(
      <Field
        field={{ id: 'f-name', name: 'name', type: 'text', label: 'Name' }}
        value={null}
        error="Name is required"
        checking={false}
        onFieldChange={vi.fn()}
        onFieldBlur={undefined}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Name is required')
    expect(screen.getByLabelText('Name')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})
