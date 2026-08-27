import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the three-pane workbench shell', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Anvil' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'File explorer' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editor' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Preview' })).toBeInTheDocument()
  })
})
