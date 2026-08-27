import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { BuilderPage } from '../BuilderPage'
import { builderRenderCounts, resetBuilderRenderCounts } from '../renderTracker'

/**
 * The Phase 5 performance fix, checked directly rather than taken on
 * faith — same approach as form-renderer's renderIsolation.test.tsx.
 * FieldPalette carries no data props, only a callback; before
 * BuilderPage.tsx memoized that callback on the active step id, a fresh
 * arrow function on every BuilderPage render defeated FieldPalette's
 * own `memo` wrapping and re-rendered (and re-registered) its 8 dnd
 * Draggables on every keystroke anywhere else in the builder, including
 * ones with no possible effect on what the palette shows.
 */
describe('builder render isolation', () => {
  beforeEach(() => {
    resetBuilderRenderCounts()
  })

  it('does not re-render the field palette while adding a field or editing its properties', async () => {
    const user = userEvent.setup()
    render(<BuilderPage />)

    expect(builderRenderCounts['FieldPalette']).toBe(1)

    // Adding a field mutates the active step (new field, new selection)
    // but not which step is active — FieldPalette's callback identity
    // should survive that unchanged.
    await user.click(screen.getByRole('button', { name: /^Text/ }))
    expect(builderRenderCounts['FieldPalette']).toBe(1)

    // Editing the newly-added field's label goes through the inspector,
    // not the palette, and shouldn't touch it either.
    await user.type(screen.getByLabelText('Label'), 'Full name')
    expect(builderRenderCounts['FieldPalette']).toBe(1)

    // Same for the form title, which only patches top-level schema
    // fields (see createBuilderStore's setFormMeta) and leaves the
    // steps array's own references untouched.
    await user.type(screen.getByLabelText('Form title'), 'x')
    expect(builderRenderCounts['FieldPalette']).toBe(1)
  })
})
