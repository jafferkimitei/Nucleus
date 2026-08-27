import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useWorkflowFormController } from '@/features/workflow'
import type { FormSchema } from '@/types/schema'

import { FormRenderer } from '../FormRenderer'
import { fieldRenderCounts, resetFieldRenderCounts } from '../renderTracker'

/**
 * The performance claim from the project brief ("typing in one field does
 * not trigger expensive global re-renders across the rest of the
 * canvas"), checked directly via the render counter in renderTracker.ts
 * rather than taken on faith. See Field.tsx's doc comment for the
 * mechanism this test is guarding: memoized Field, primitive props
 * (value/error), and referentially stable field/callback props.
 */
describe('field render isolation', () => {
  beforeEach(() => {
    resetFieldRenderCounts()
  })

  it('does not re-render sibling fields while typing in one field', async () => {
    const user = userEvent.setup()

    const schema: FormSchema = {
      id: 'perf-form',
      title: 'Perf form',
      steps: [
        {
          id: 'step-1',
          title: 'Step 1',
          fields: [
            { id: 'f-a', name: 'a', type: 'text', label: 'A' },
            { id: 'f-b', name: 'b', type: 'text', label: 'B' },
            { id: 'f-c', name: 'c', type: 'text', label: 'C' },
          ],
        },
      ],
    }

    function DemoForm() {
      const controller = useWorkflowFormController(schema)
      return <FormRenderer schema={schema} controller={controller} />
    }

    render(<DemoForm />)
    // Each field renders exactly once on mount.
    expect(fieldRenderCounts).toEqual({ a: 1, b: 1, c: 1 })

    await user.type(screen.getByLabelText('A'), 'xyz')

    // Three keystrokes into A: A re-rendered (at least once per keystroke,
    // React may batch some), B and C did not re-render at all.
    expect(fieldRenderCounts['a']).toBeGreaterThanOrEqual(2)
    expect(fieldRenderCounts['b']).toBe(1)
    expect(fieldRenderCounts['c']).toBe(1)
  })

  it('resetFieldRenderCounts actually clears counts left over from a previous test', () => {
    // This test's own beforeEach just reset a *populated* counter object
    // (the previous test left `a`/`b`/`c` behind) — proves
    // resetFieldRenderCounts deletes stale keys rather than only ever
    // running against an already-empty object.
    expect(fieldRenderCounts).toEqual({})
  })
})
