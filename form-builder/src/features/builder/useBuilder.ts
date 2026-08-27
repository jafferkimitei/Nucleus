import { useState } from 'react'

import { useStore } from 'zustand'

import type { FormSchema } from '@/types/schema'

import { createBuilderStore } from './createBuilderStore'

import type { BuilderStoreState } from './types'

/**
 * One builder session: a per-instance Zustand store (see
 * createBuilderStore's doc comment for why not a singleton), created
 * lazily and once for the component's lifetime — same pattern as
 * `useWorkflowFormController`. `initialSchema` is only read on first
 * mount; call the returned `loadSchema` action to replace it later
 * (e.g. an "import JSON" affordance), not a new `initialSchema` prop.
 */
export function useBuilder(initialSchema?: FormSchema): BuilderStoreState {
  const [store] = useState(() => createBuilderStore(initialSchema))
  return useStore(store)
}
