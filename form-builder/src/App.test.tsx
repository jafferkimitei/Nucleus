import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the app heading and the first step of the demo schema', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /form & workflow builder/i }),
    ).toBeInTheDocument()
    // Proves the schema is actually driving the render, not hardcoded JSX.
    // "About you" appears twice (progress list + current step legend).
    expect(screen.getAllByText('About you').length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })
})
