import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the app heading and the first step of the demo schema', async () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /form & workflow builder/i }),
    ).toBeInTheDocument()
    // RuntimeDemo is now behind React.lazy (see App.tsx's Phase 5 code-
    // splitting comment) — it isn't in the DOM synchronously on mount the
    // way a plain import would be, so this awaits Suspense resolving
    // rather than asserting on the fallback.
    // Proves the schema is actually driving the render, not hardcoded JSX.
    // "About you" appears twice (progress list + current step legend).
    expect((await screen.findAllByText('About you')).length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })

  it('switches to the Phase 4 builder view and back via the nav', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByLabelText(/full name/i)

    await user.click(screen.getByRole('button', { name: 'Builder' }))
    expect(await screen.findByLabelText('Form title')).toBeInTheDocument()
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Runtime demo' }))
    expect(await screen.findByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Form title')).not.toBeInTheDocument()
  })

  it('the debug panel reflects dirty state as fields are edited', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByLabelText(/full name/i)

    expect(screen.getByText(/Dirty: no/)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/full name/i), 'Ada')

    expect(screen.getByText(/Dirty: yes/)).toBeInTheDocument()
  })
})
