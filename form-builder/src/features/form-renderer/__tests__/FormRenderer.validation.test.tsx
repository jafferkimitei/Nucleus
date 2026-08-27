import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ASYNC_DEBOUNCE_MS,
  useWorkflowFormController,
} from '@/features/workflow'
import type { FormSchema } from '@/types/schema'

import { FormRenderer } from '../FormRenderer'

const schema: FormSchema = {
  id: 'test-form',
  title: 'Test form',
  steps: [
    {
      id: 'step-1',
      title: 'Step one',
      fields: [
        {
          id: 'f-name',
          name: 'name',
          type: 'text',
          label: 'Name',
          validation: [{ type: 'required', message: 'Name is required.' }],
        },
      ],
    },
    {
      id: 'step-2',
      title: 'Step two',
      fields: [{ id: 'f-b', name: 'b', type: 'text', label: 'B' }],
    },
  ],
}

const conditionalSchema: FormSchema = {
  id: 'conditional-form',
  title: 'Conditional form',
  steps: [
    {
      id: 'step-1',
      title: 'Step one',
      fields: [
        {
          id: 'f-country',
          name: 'country',
          type: 'select',
          label: 'Country',
          options: [
            { value: 'us', label: 'United States' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          id: 'f-state',
          name: 'state',
          type: 'text',
          label: 'State',
          visibleWhen: {
            fieldName: 'country',
            operator: 'equals',
            value: 'us',
          },
        },
      ],
    },
  ],
}

const asyncSchema: FormSchema = {
  id: 'async-form',
  title: 'Async form',
  steps: [
    {
      id: 'step-1',
      title: 'Step one',
      fields: [
        {
          id: 'f-promo',
          name: 'promo',
          type: 'text',
          label: 'Promo code',
          validation: [{ type: 'async', endpoint: '/api/check-promo-code' }],
        },
      ],
    },
  ],
}

function DemoForm({ schema: s }: { schema: FormSchema }) {
  const controller = useWorkflowFormController(s)
  return <FormRenderer schema={s} controller={controller} />
}

describe('FormRenderer — validation', () => {
  it('does not show an error before the field is touched', () => {
    render(<DemoForm schema={schema} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('blocks Next and reveals the error when a required field is left empty', async () => {
    const user = userEvent.setup()
    render(<DemoForm schema={schema} />)

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Name is required.')
    expect(
      within(screen.getByRole('group')).getByText('Step one'),
    ).toBeInTheDocument()
  })

  it('reveals the error on blur, without needing to attempt Next', async () => {
    const user = userEvent.setup()
    render(<DemoForm schema={schema} />)

    await user.click(screen.getByLabelText(/Name/))
    await user.tab() // blur without typing

    expect(screen.getByRole('alert')).toHaveTextContent('Name is required.')
  })

  it('advances once the required field is filled', async () => {
    const user = userEvent.setup()
    render(<DemoForm schema={schema} />)

    await user.type(screen.getByLabelText(/Name/), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      within(screen.getByRole('group')).getByText('Step two'),
    ).toBeInTheDocument()
  })

  it('hides a conditional field until its condition is met, and clears it if hidden again', async () => {
    const user = userEvent.setup()
    render(<DemoForm schema={conditionalSchema} />)

    expect(screen.queryByLabelText('State')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Country'), 'us')
    expect(screen.getByLabelText('State')).toBeInTheDocument()

    await user.type(screen.getByLabelText('State'), 'California')
    expect(screen.getByLabelText('State')).toHaveValue('California')

    await user.selectOptions(screen.getByLabelText('Country'), 'other')
    expect(screen.queryByLabelText('State')).not.toBeInTheDocument()

    // Switching back to 'us' shows a freshly-cleared field, not the
    // stale value from before it was hidden.
    await user.selectOptions(screen.getByLabelText('Country'), 'us')
    expect(screen.getByLabelText('State')).toHaveValue('')
  })

  describe('with a pending async check', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('disables Next and swaps its label to "Checking…" while the check is in flight', async () => {
      render(<DemoForm schema={asyncSchema} />)

      // fireEvent rather than userEvent.type — userEvent's own internal
      // delays don't play well with fake timers, and this test only
      // cares about the field's committed value, not simulating keystrokes.
      fireEvent.change(screen.getByLabelText('Promo code'), {
        target: { value: 'ANYTHING' },
      })
      await vi.advanceTimersByTimeAsync(ASYNC_DEBOUNCE_MS)

      const next = screen.getByRole('button', { name: 'Checking…' })
      expect(next).toBeDisabled()
    })
  })
})
