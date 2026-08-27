import { useState } from 'react'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { FieldSchema, FieldValue } from '@/types/schema'

import { Field } from '../Field'

/** Minimal controlled harness so each test can assert round-tripped
 * values, not just that onChange was called with *something*. */
function renderField(field: FieldSchema, initialValue: FieldValue = null) {
  const onFieldChange = vi.fn()

  function Harness() {
    const [value, setValue] = useState<FieldValue>(initialValue)
    return (
      <Field
        field={field}
        value={value}
        error={undefined}
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

  it('shows the error message and marks the control invalid', () => {
    render(
      <Field
        field={{ id: 'f-name', name: 'name', type: 'text', label: 'Name' }}
        value={null}
        error="Name is required"
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
