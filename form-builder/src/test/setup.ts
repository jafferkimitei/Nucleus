import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Ensure a clean DOM between tests so per-field render assertions
// (see Phase 5 performance case study) stay isolated.
afterEach(() => {
  cleanup()
})
