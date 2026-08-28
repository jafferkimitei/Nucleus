import { useState } from 'react'

import { useStore } from 'zustand'

import { createFsStore } from './createFsStore'

import type { FsState, FsStoreState } from './types'

/**
 * One playground session's virtual file system — a per-instance store
 * created lazily and once for the component's lifetime. Same pattern
 * as `form-builder`'s `useBuilder`.
 */
export function useFs(initialState?: FsState): FsStoreState {
  const [store] = useState(() => createFsStore(initialState))
  return useStore(store)
}
