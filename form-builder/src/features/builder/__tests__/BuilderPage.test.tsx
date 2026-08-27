import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { BuilderPage } from '../BuilderPage'

/**
 * Drives the builder through its button-based affordances (click to
 * add, up/down to reorder) rather than simulating a pointer drag —
 * @hello-pangea/dnd's drag gesture isn't practical to simulate through
 * RTL/jsdom. The actual drag path gets one Playwright E2E test in a
 * real browser instead; this file is where the builder's *logic* (what
 * each control does to the schema, and that the live preview reflects
 * it) is proven.
 */
describe('BuilderPage', () => {
  it('starts with one blank step and an empty canvas', () => {
    render(<BuilderPage />)

    expect(screen.getByRole('heading', { name: 'Step 1' })).toBeInTheDocument()
    expect(
      screen.getByText('Drag a field type here, or click one in the palette.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Select a field to edit its properties.'),
    ).toBeInTheDocument()
  })

  it('adding a field from the palette selects it and shows it in the canvas and inspector', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)

    await user.click(screen.getByRole('button', { name: /^Text/ }))

    // Canvas: the new field's card is present and selected.
    expect(
      screen.getByRole('button', { name: /^Text.*Text/, pressed: true }),
    ).toBeInTheDocument()
    // Inspector: editing the field it was just added as.
    expect(screen.getByLabelText('Label')).toHaveValue('Text')
    expect(screen.getByLabelText('Name (data key)')).toHaveValue('field_1')
  })

  it('editing label and name in the inspector updates the canvas and live preview', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ }))

    await user.clear(screen.getByLabelText('Label'))
    await user.type(screen.getByLabelText('Label'), 'Full name')
    const nameInput = screen.getByLabelText('Name (data key)')
    await user.clear(nameInput)
    await user.type(nameInput, 'fullName')
    await user.tab() // blur to commit the rename

    expect(screen.getByLabelText('Full name')).toBeInTheDocument() // live preview
  })

  it('rejects renaming a field to a name already used elsewhere', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ })) // field_1, selected
    await user.click(screen.getByRole('button', { name: /^Email/ })) // field_2, now selected

    const nameInput = screen.getByLabelText('Name (data key)')
    await user.clear(nameInput)
    await user.type(nameInput, 'field_1')
    await user.tab()

    expect(
      screen.getByText('Must be non-empty and unique across the form.'),
    ).toBeInTheDocument()
  })

  it('toggling "required" adds a required validation rule to the schema', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ }))

    await user.click(screen.getByRole('checkbox', { name: 'Required' }))

    await user.click(screen.getByRole('button', { name: 'Schema JSON' }))
    expect(screen.getByLabelText('Form schema JSON')).toHaveTextContent(
      '"type": "required"',
    )
  })

  it('adding two fields and setting a visibleWhen condition hides the dependent field until met', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)

    await user.click(screen.getByRole('button', { name: /^Dropdown/ })) // field_1 (select)
    await user.clear(screen.getByLabelText('Label'))
    await user.type(screen.getByLabelText('Label'), 'Country')

    await user.click(screen.getByRole('button', { name: /^Text/ })) // field_2, now selected
    await user.clear(screen.getByLabelText('Label'))
    await user.type(screen.getByLabelText('Label'), 'State')

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Only show this field conditionally',
      }),
    )
    // Live preview: State is hidden until the default condition (first
    // other field notEmpty) is satisfied.
    expect(screen.queryByLabelText('State')).not.toBeInTheDocument()
  })

  it('moving a field down in the canvas reorders it in the live preview', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ })) // field_1
    await user.clear(screen.getByLabelText('Label'))
    await user.type(screen.getByLabelText('Label'), 'First')
    await user.click(screen.getByRole('button', { name: /^Email/ })) // field_2
    await user.clear(screen.getByLabelText('Label'))
    await user.type(screen.getByLabelText('Label'), 'Second')

    // "First" is now at index 0; move it down below "Second".
    await user.click(screen.getByRole('button', { name: 'Move First down' }))

    // The live values debug panel doesn't reflect field order, so check
    // the JSON view, which mirrors the schema's own field array order.
    await user.click(screen.getByRole('button', { name: 'Schema JSON' }))
    const json = screen.getByLabelText('Form schema JSON').textContent
    expect(json.indexOf('"Second"')).toBeLessThan(json.indexOf('"First"'))
  })

  it('moving a field up in the canvas reorders it in the live preview', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ })) // field_1
    await user.clear(screen.getByLabelText('Label'))
    await user.type(screen.getByLabelText('Label'), 'First')
    await user.click(screen.getByRole('button', { name: /^Email/ })) // field_2
    await user.clear(screen.getByLabelText('Label'))
    await user.type(screen.getByLabelText('Label'), 'Second')

    // "Second" is at index 1 (the one just added, and selected); move it
    // up above "First" — the counterpart to the "move down" test above.
    await user.click(screen.getByRole('button', { name: 'Move Second up' }))

    await user.click(screen.getByRole('button', { name: 'Schema JSON' }))
    const json = screen.getByLabelText('Form schema JSON').textContent
    expect(json.indexOf('"Second"')).toBeLessThan(json.indexOf('"First"'))
  })

  it('clicking an unselected field card in the canvas re-selects it for editing', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ })) // field_1
    await user.clear(screen.getByLabelText('Label'))
    await user.type(screen.getByLabelText('Label'), 'First')
    await user.click(screen.getByRole('button', { name: /^Email/ })) // field_2, now selected
    await user.clear(screen.getByLabelText('Label'))
    await user.type(screen.getByLabelText('Label'), 'Second')

    // The inspector is currently editing "Second" (field_2). Click
    // "First"'s own card in the canvas — not the palette — to switch
    // the inspector back to it.
    await user.click(
      screen.getByRole('button', { name: /^First/, pressed: false }),
    )

    expect(screen.getByLabelText('Label', { exact: true })).toHaveValue('First')
  })

  it('adding a step and switching to it shows its own (empty) canvas', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Add step' }))

    expect(screen.getByRole('heading', { name: 'Step 2' })).toBeInTheDocument()
    expect(
      screen.getByText('Drag a field type here, or click one in the palette.'),
    ).toBeInTheDocument()
  })

  it('the "Remove" button on the only step is disabled', () => {
    render(<BuilderPage />)
    expect(screen.getByRole('button', { name: 'Remove Step 1' })).toBeDisabled()
  })

  it('the schema JSON view reflects the form title', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)

    const titleInput = screen.getByLabelText('Form title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Volunteer Sign-up')

    await user.click(screen.getByRole('button', { name: 'Schema JSON' }))
    expect(screen.getByLabelText('Form schema JSON')).toHaveTextContent(
      'Volunteer Sign-up',
    )
  })

  it('Start over resets the whole schema back to one blank step', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('button', { name: 'Add step' }))
    expect(screen.getByRole('heading', { name: 'Step 2' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start over' }))

    expect(
      screen.queryByRole('heading', { name: 'Step 2' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('Select a field to edit its properties.'),
    ).toBeInTheDocument()
  })

  it("switching steps via StepTabs shows that step's own canvas", async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Add step' })) // Step 2, now active
    await user.click(screen.getByRole('button', { name: /^Text/ })) // field on Step 2

    const stepTabs = screen.getByRole('list', { name: 'Builder steps' })
    await user.click(within(stepTabs).getByRole('button', { name: 'Step 1' }))

    expect(screen.getByRole('heading', { name: 'Step 1' })).toBeInTheDocument()
    expect(
      screen.getByText('Drag a field type here, or click one in the palette.'),
    ).toBeInTheDocument()
  })

  it('moving a step reorders it in the step tabs', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Add step' }))

    await user.click(screen.getByRole('button', { name: 'Move Step 1 later' }))

    const stepTabs = screen.getByRole('list', { name: 'Builder steps' })
    const tabs = within(stepTabs).getAllByRole('button', { name: /^Step \d$/ })
    expect(tabs.map((t) => t.textContent)).toEqual(['Step 2', 'Step 1'])
  })

  it('moving a step back earlier reorders it in the step tabs', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Add step' }))
    await user.click(screen.getByRole('button', { name: 'Move Step 1 later' }))
    // Tabs are now [Step 2, Step 1] — move the second tab (originally
    // Step 1) back earlier to exercise the ↑ button, the counterpart of
    // the ↓ button the previous test already covers.
    await user.click(
      screen.getByRole('button', { name: 'Move Step 1 earlier' }),
    )

    const stepTabs = screen.getByRole('list', { name: 'Builder steps' })
    const tabs = within(stepTabs).getAllByRole('button', { name: /^Step \d$/ })
    expect(tabs.map((t) => t.textContent)).toEqual(['Step 1', 'Step 2'])
  })

  it('removing a non-last step drops it from the tabs', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Add step' }))

    await user.click(screen.getByRole('button', { name: 'Remove Step 2' }))

    expect(
      screen.queryByRole('button', { name: 'Step 2' }),
    ).not.toBeInTheDocument()
  })

  it('removing a field from the canvas clears it from the live preview', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.clear(screen.getByLabelText('Label'))
    await user.type(screen.getByLabelText('Label'), 'Nickname')
    expect(screen.getByLabelText('Nickname')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Nickname' }))

    expect(screen.queryByLabelText('Nickname')).not.toBeInTheDocument()
    expect(
      screen.getByText('Select a field to edit its properties.'),
    ).toBeInTheDocument()
  })

  it("changing a field's type resets its type-specific state", async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Dropdown/ })) // select, has options

    await user.selectOptions(screen.getByLabelText('Type'), 'checkbox')

    await user.click(screen.getByRole('button', { name: 'Schema JSON' }))
    expect(screen.getByLabelText('Form schema JSON')).toHaveTextContent(
      '"type": "checkbox"',
    )
    expect(screen.getByLabelText('Form schema JSON')).not.toHaveTextContent(
      '"options"',
    )
  })

  it('the options editor adds, edits, and removes an option', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Dropdown/ }))

    await user.click(screen.getByRole('button', { name: 'Add option' }))
    expect(screen.getByLabelText('Option 3 label')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Option 1 label'))
    await user.type(screen.getByLabelText('Option 1 label'), 'Yes')
    expect(screen.getByRole('option', { name: 'Yes' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove option 3' }))
    expect(screen.queryByLabelText('Option 3 label')).not.toBeInTheDocument()
  })

  it('min/max and pattern validation rules appear in the schema JSON', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Number/ }))
    await user.type(screen.getByLabelText('Min'), '1')
    await user.type(screen.getByLabelText('Max'), '10')

    await user.click(screen.getByRole('button', { name: /^Text/ }))
    // user-event's .type() parses `{`/`[` as special-key syntax, which a
    // regex pattern is full of — fireEvent.change bypasses that parsing
    // entirely and is the documented escape hatch for literal input.
    fireEvent.change(screen.getByLabelText('Pattern (regex)'), {
      target: { value: '^[a-z]+$' },
    })
    await user.type(screen.getByLabelText('Min length'), '2')
    await user.type(screen.getByLabelText('Max length'), '20')

    await user.click(screen.getByRole('button', { name: 'Schema JSON' }))
    const json = screen.getByLabelText('Form schema JSON')
    expect(json).toHaveTextContent('"type": "min"')
    expect(json).toHaveTextContent('"type": "max"')
    expect(json).toHaveTextContent('"type": "pattern"')
    expect(json).toHaveTextContent('"type": "minLength"')
    expect(json).toHaveTextContent('"type": "maxLength"')
  })

  it('the async rule editor sets an endpoint and message, and clearing the endpoint removes the rule', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ }))

    await user.type(
      screen.getByPlaceholderText('/api/check-something'),
      '/api/check-promo',
    )
    await user.type(
      screen.getByPlaceholderText('Error message if it comes back invalid'),
      'Not valid.',
    )

    await user.click(screen.getByRole('button', { name: 'Schema JSON' }))
    expect(screen.getByLabelText('Form schema JSON')).toHaveTextContent(
      '/api/check-promo',
    )

    await user.click(screen.getByRole('button', { name: 'Live preview' }))
    await user.clear(screen.getByPlaceholderText('/api/check-something'))

    await user.click(screen.getByRole('button', { name: 'Schema JSON' }))
    expect(screen.getByLabelText('Form schema JSON')).not.toHaveTextContent(
      '/api/check-promo',
    )
  })

  it('switching the visibility condition operator to "in" accepts a comma-separated value', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ })) // field_1
    await user.click(screen.getByRole('button', { name: /^Email/ })) // field_2, selected

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Only show this field conditionally',
      }),
    )
    await user.selectOptions(screen.getByLabelText('Operator'), 'in')
    await user.type(
      screen.getByLabelText('Value(s), comma-separated'),
      'a, b, 3',
    )

    await user.click(screen.getByRole('button', { name: 'Schema JSON' }))
    expect(screen.getByLabelText('Form schema JSON')).toHaveTextContent(
      '"operator": "in"',
    )
  })

  it('switching the visibility operator to asyncStatus offers a status dropdown, and unchecking clears the condition', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    await user.click(screen.getByRole('button', { name: /^Email/ }))

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Only show this field conditionally',
      }),
    )
    await user.selectOptions(screen.getByLabelText('Operator'), 'asyncStatus')
    expect(screen.getByLabelText('Status equals')).toBeInTheDocument()

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Only show this field conditionally',
      }),
    )
    expect(screen.queryByLabelText('Status equals')).not.toBeInTheDocument()
  })

  it('the visibility checkbox is disabled when there are no other fields to reference', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)
    await user.click(screen.getByRole('button', { name: /^Text/ }))

    expect(
      screen.getByRole('checkbox', {
        name: 'Only show this field conditionally',
      }),
    ).toBeDisabled()
  })
})
