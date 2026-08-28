import { createStore } from 'zustand/vanilla'

import {
  collectSubtreeIds,
  isSelfOrDescendant,
  resolveUniqueName,
} from './fsHelpers'

import type { FsNode, FsState, FsStoreState } from './types'

const ROOT_ID = 'root'

/** A single starter file so the tree — and, once Phase 3 lands, the
 * editor — isn't empty on first load. A richer set of starter
 * templates is Phase 8's job (see the README roadmap); this is just
 * enough to make Phase 2's tree and Phase 3's editor demonstrable
 * against real content. */
function createInitialState(): FsState {
  const fileId = crypto.randomUUID()
  const nodes: Record<string, FsNode> = {
    [ROOT_ID]: {
      id: ROOT_ID,
      type: 'folder',
      name: '',
      parentId: null,
      childIds: [fileId],
    },
    [fileId]: {
      id: fileId,
      type: 'file',
      name: 'index.js',
      parentId: ROOT_ID,
      content: "console.log('Hello from Anvil!')\n",
    },
  }
  return {
    nodes,
    rootId: ROOT_ID,
    selectedId: fileId,
    expanded: {},
  }
}

export type FsStore = ReturnType<typeof createFsStore>

/**
 * Builds one playground session's virtual file system as its own
 * Zustand store — a factory, not a module-level singleton, so more
 * than one `<FileTree>` (e.g. a future side-by-side comparison view)
 * never share state by accident. Same pattern as `form-builder`'s
 * `createBuilderStore`.
 */
export function createFsStore(initialState?: FsState) {
  return createStore<FsStoreState>()((set, get) => ({
    ...(initialState ?? createInitialState()),

    createFile: (parentId, rawName) => {
      const name = rawName.trim()
      if (!name) {
        return null
      }
      const parent = get().nodes[parentId]
      if (parent?.type !== 'folder') {
        return null
      }
      const id = crypto.randomUUID()
      const uniqueName = resolveUniqueName(get().nodes, parentId, name)
      set((state) => {
        const parentNode = state.nodes[parentId]
        if (parentNode?.type !== 'folder') {
          return state
        }
        return {
          nodes: {
            ...state.nodes,
            [id]: {
              id,
              type: 'file',
              name: uniqueName,
              parentId,
              content: '',
            },
            [parentId]: {
              ...parentNode,
              childIds: [...parentNode.childIds, id],
            },
          },
        }
      })
      return id
    },

    createFolder: (parentId, rawName) => {
      const name = rawName.trim()
      if (!name) {
        return null
      }
      const parent = get().nodes[parentId]
      if (parent?.type !== 'folder') {
        return null
      }
      const id = crypto.randomUUID()
      const uniqueName = resolveUniqueName(get().nodes, parentId, name)
      set((state) => {
        const parentNode = state.nodes[parentId]
        if (parentNode?.type !== 'folder') {
          return state
        }
        return {
          nodes: {
            ...state.nodes,
            [id]: {
              id,
              type: 'folder',
              name: uniqueName,
              parentId,
              childIds: [],
            },
            [parentId]: {
              ...parentNode,
              childIds: [...parentNode.childIds, id],
            },
          },
          // Expanded immediately: a folder you just made shouldn't look
          // like it swallowed whatever you drop into it next.
          expanded: { ...state.expanded, [id]: true },
        }
      })
      return id
    },

    rename: (id, rawName) => {
      const name = rawName.trim()
      if (!name || id === get().rootId) {
        return false
      }
      const node = get().nodes[id]
      if (node?.parentId == null) {
        return false
      }
      if (name === node.name) {
        return true
      }
      const uniqueName = resolveUniqueName(get().nodes, node.parentId, name, id)
      set((state) => {
        const target = state.nodes[id]
        if (!target) {
          return state
        }
        return {
          nodes: { ...state.nodes, [id]: { ...target, name: uniqueName } },
        }
      })
      return true
    },

    remove: (id) => {
      if (id === get().rootId) {
        return
      }
      const node = get().nodes[id]
      if (node?.parentId == null) {
        return
      }
      const parentId = node.parentId
      const doomedIds = new Set(collectSubtreeIds(get().nodes, id))
      set((state) => {
        const parent = state.nodes[parentId]
        if (parent?.type !== 'folder') {
          return state
        }
        const nodes = { ...state.nodes }
        for (const doomedId of doomedIds) {
          Reflect.deleteProperty(nodes, doomedId)
        }
        nodes[parent.id] = {
          ...parent,
          childIds: parent.childIds.filter((childId) => childId !== id),
        }
        const expanded = { ...state.expanded }
        for (const doomedId of doomedIds) {
          Reflect.deleteProperty(expanded, doomedId)
        }
        return {
          nodes,
          expanded,
          selectedId:
            state.selectedId && doomedIds.has(state.selectedId)
              ? null
              : state.selectedId,
        }
      })
    },

    move: (id, newParentId) => {
      const { nodes } = get()
      const node = nodes[id]
      const newParent = nodes[newParentId]
      if (node?.parentId == null || newParent?.type !== 'folder') {
        return false
      }
      // Refuses moving a folder into itself or one of its own
      // descendants — without this, `move` could disconnect a whole
      // subtree from the root while still leaving every node "in" the
      // tree's `nodes` map, silently orphaning it from anything that
      // walks down from `rootId`.
      if (isSelfOrDescendant(nodes, id, newParentId)) {
        return false
      }
      const oldParentId = node.parentId
      if (oldParentId === newParentId) {
        // Already there — a no-op "move" is still a successful one
        // from the caller's point of view (e.g. a future drag-and-drop
        // handler dropping a card back where it started shouldn't have
        // to special-case this itself).
        return true
      }
      const uniqueName = resolveUniqueName(nodes, newParentId, node.name, id)
      set((state) => {
        const current = state.nodes[id]
        const oldParent = state.nodes[oldParentId]
        const targetParent = state.nodes[newParentId]
        if (
          !current ||
          oldParent?.type !== 'folder' ||
          targetParent?.type !== 'folder'
        ) {
          return state
        }
        return {
          nodes: {
            ...state.nodes,
            [id]: { ...current, parentId: newParentId, name: uniqueName },
            [oldParent.id]: {
              ...oldParent,
              childIds: oldParent.childIds.filter((childId) => childId !== id),
            },
            [targetParent.id]: {
              ...targetParent,
              childIds: [...targetParent.childIds, id],
            },
          },
        }
      })
      return true
    },

    setFileContent: (id, content) => {
      set((state) => {
        const node = state.nodes[id]
        if (node?.type !== 'file') {
          return state
        }
        return { nodes: { ...state.nodes, [id]: { ...node, content } } }
      })
    },

    toggleExpanded: (id) => {
      set((state) => ({
        expanded: { ...state.expanded, [id]: !state.expanded[id] },
      }))
    },

    select: (id) => {
      set({ selectedId: id })
    },
  }))
}
