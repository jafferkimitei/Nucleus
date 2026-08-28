import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the three-pane workbench shell, with Files and Editor wired to the seeded file', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Anvil' }),
    ).toBeInTheDocument()

    const files = screen.getByRole('region', { name: 'File explorer' })
    expect(within(files).getByText('index.js')).toBeInTheDocument()

    const editor = screen.getByRole('region', { name: 'Editor' })
    expect(within(editor).getByText('index.js')).toBeInTheDocument()
    expect(within(editor).getByText(/Hello from Anvil/)).toBeInTheDocument()

    const preview = screen.getByRole('region', { name: 'Preview' })
    expect(
      within(preview).getByText(/Coming in Phases 4-7/),
    ).toBeInTheDocument()
  })

  it('selecting a newly created file shows its (empty) content in the editor panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '+ File' }))
    await user.type(
      screen.getByRole('textbox', { name: 'New file name' }),
      'notes.md',
    )
    await user.keyboard('{Enter}')

    await user.click(screen.getByRole('button', { name: 'notes.md' }))

    const editor = screen.getByRole('region', { name: 'Editor' })
    expect(within(editor).getByText('notes.md')).toBeInTheDocument()
  })

  it('deleting the selected file falls back to the Phase 3 placeholder', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Delete index.js' }))

    const editor = screen.getByRole('region', { name: 'Editor' })
    expect(within(editor).getByText(/Coming in Phase 3/)).toBeInTheDocument()
  })
})
