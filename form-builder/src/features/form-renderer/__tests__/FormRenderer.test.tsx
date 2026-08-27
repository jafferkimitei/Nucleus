import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { FormSchema } from '@/types/schema'

import { FormRenderer } from '../FormRenderer'
import { useLocalFormController } from '../useLocalFormController'

const schema: FormSchema = {
  id: 'test-form',
  title: 'Test Form',
  steps: [
    {
      id: 'step-1',
      title: 'Step one',
      fields: [{ id: 'f-a', name: 'a', type: 'text', label: 'A' }],
    },
    {
      id: 'step-2',
      title: 'Step two',
      fields: [{ id: 'f-b', name: 'b', type: 'text', label: 'B' }],
    },
  ],
}

function DemoForm() {
  const controller = useLocalFormController(schema)
  return <FormRenderer schema={schema} controller={controller} />
}

// "Step one"/"Step two" each appear twice: once in the progress list
// (always) and once as the active fieldset's legend (only the current
// step). Scope queries to one or the other rather than using a bare
// getByText, which would fail on the ambiguous match.
function currentStepFieldset() {
  return screen.getByRole('group')
}

function progressList() {
  return screen.getByRole('list', { name: 'Form steps' })
}

describe('FormRenderer', () => {
  it('renders the first step, with Back disabled and Next enabled', () => {
    render(<DemoForm />)

    expect(
      within(currentStepFieldset()).getByText('Step one'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('A')).toBeInTheDocument()
    expect(screen.queryByLabelText('B')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('advances to the next step and back again, preserving entered values', async () => {
    const user = userEvent.setup()
    render(<DemoForm />)

    await user.type(screen.getByLabelText('A'), 'hello')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      within(currentStepFieldset()).getByText('Step two'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(
      within(currentStepFieldset()).getByText('Step one'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('A')).toHaveValue('hello')
  })

  it('marks the current step in the progress list via aria-current', async () => {
    const user = userEvent.setup()
    render(<DemoForm />)

    expect(
      within(progressList()).getByText('Step one').closest('li'),
    ).toHaveAttribute('aria-current', 'step')

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      within(progressList()).getByText('Step two').closest('li'),
    ).toHaveAttribute('aria-current', 'step')
  })
})
