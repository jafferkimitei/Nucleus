import { describe, expect, it } from 'vitest'

import { createFsStore } from '../createFsStore'

import type { FsNode, FsState } from '../types'

/** A small, fixed-id tree — deterministic ids make assertions
 * readable and let tests target exact nodes without threading
 * `crypto.randomUUID()` results back out of the store. */
function buildState(): FsState {
  const nodes: Record<string, FsNode> = {
    root: {
      id: 'root',
      type: 'folder',
      name: '',
      parentId: null,
      childIds: ['src', 'readme'],
    },
    src: {
      id: 'src',
      type: 'folder',
      name: 'src',
      parentId: 'root',
      childIds: ['index'],
    },
    index: {
      id: 'index',
      type: 'file',
      name: 'index.ts',
      parentId: 'src',
      content: 'export {}\n',
    },
    readme: {
      id: 'readme',
      type: 'file',
      name: 'README.md',
      parentId: 'root',
      content: '# Anvil\n',
    },
  }
  return {
    nodes,
    rootId: 'root',
    selectedId: 'index',
    expanded: { src: true },
  }
}

describe('createFsStore', () => {
  describe('createFile', () => {
    it('adds a file under the given parent and returns its id', () => {
      const store = createFsStore(buildState())
      const id = store.getState().createFile('src', 'utils.ts')

      expect(id).not.toBeNull()
      const node = id ? store.getState().nodes[id] : undefined
      expect(node).toMatchObject({
        type: 'file',
        name: 'utils.ts',
        parentId: 'src',
      })
      expect(store.getState().nodes['src']).toMatchObject({
        childIds: ['index', id],
      })
    })

    it('de-duplicates a colliding name instead of failing', () => {
      const store = createFsStore(buildState())
      const id = store.getState().createFile('src', 'index.ts')

      expect(id).not.toBeNull()
      expect(store.getState().nodes[id ?? '']?.name).toBe('index (2).ts')
    })

    it('returns null for a blank name and leaves the tree unchanged', () => {
      const store = createFsStore(buildState())
      const before = store.getState().nodes
      const id = store.getState().createFile('src', '   ')

      expect(id).toBeNull()
      expect(store.getState().nodes).toBe(before)
    })

    it('returns null when the parent does not exist or is a file', () => {
      const store = createFsStore(buildState())

      expect(store.getState().createFile('does-not-exist', 'a.ts')).toBeNull()
      expect(store.getState().createFile('index', 'a.ts')).toBeNull()
    })
  })

  describe('createFolder', () => {
    it('adds a folder and expands it immediately', () => {
      const store = createFsStore(buildState())
      const id = store.getState().createFolder('root', 'lib')

      expect(id).not.toBeNull()
      expect(store.getState().nodes[id ?? '']).toMatchObject({
        type: 'folder',
        name: 'lib',
        childIds: [],
      })
      expect(store.getState().expanded[id ?? '']).toBe(true)
    })
  })

  describe('rename', () => {
    it('renames a node', () => {
      const store = createFsStore(buildState())
      expect(store.getState().rename('readme', 'README.txt')).toBe(true)
      expect(store.getState().nodes['readme']?.name).toBe('README.txt')
    })

    it('de-duplicates against a sibling instead of failing', () => {
      const store = createFsStore(buildState())
      // "readme"'s only sibling under root is the "src" folder — name
      // collisions apply across files and folders alike (a real file
      // system won't let a file and a folder share a name either), so
      // renaming it to "src" collides and gets a suffix rather than
      // failing outright.
      expect(store.getState().rename('readme', 'src')).toBe(true)
      expect(store.getState().nodes['readme']?.name).toBe('src (2)')
    })

    it('treats renaming to the current name as a no-op success', () => {
      const store = createFsStore(buildState())
      expect(store.getState().rename('readme', 'README.md')).toBe(true)
      expect(store.getState().nodes['readme']?.name).toBe('README.md')
    })

    it('returns false for a blank name, an unknown id, or the root', () => {
      const store = createFsStore(buildState())
      expect(store.getState().rename('readme', '   ')).toBe(false)
      expect(store.getState().rename('missing', 'x')).toBe(false)
      expect(store.getState().rename('root', 'x')).toBe(false)
    })
  })

  describe('remove', () => {
    it('removes a file and drops it from its parent childIds', () => {
      const store = createFsStore(buildState())
      store.getState().remove('readme')

      expect(store.getState().nodes['readme']).toBeUndefined()
      expect(store.getState().nodes['root']).toMatchObject({
        childIds: ['src'],
      })
    })

    it('removes a folder and its entire subtree', () => {
      const store = createFsStore(buildState())
      store.getState().remove('src')

      expect(store.getState().nodes['src']).toBeUndefined()
      expect(store.getState().nodes['index']).toBeUndefined()
      expect(store.getState().nodes['root']).toMatchObject({
        childIds: ['readme'],
      })
    })

    it('clears selection when the selected file is inside the removed subtree', () => {
      const store = createFsStore(buildState()) // selectedId: 'index', inside 'src'
      store.getState().remove('src')
      expect(store.getState().selectedId).toBeNull()
    })

    it('leaves selection untouched when an unrelated node is removed', () => {
      const store = createFsStore(buildState())
      store.getState().remove('readme')
      expect(store.getState().selectedId).toBe('index')
    })

    it('no-ops on the root id or an unknown id', () => {
      const store = createFsStore(buildState())
      const before = store.getState().nodes
      store.getState().remove('root')
      store.getState().remove('does-not-exist')
      expect(store.getState().nodes).toBe(before)
    })
  })

  describe('move', () => {
    it('reparents a node, updating both parents childIds', () => {
      const store = createFsStore(buildState())
      expect(store.getState().move('readme', 'src')).toBe(true)

      expect(store.getState().nodes['readme']?.parentId).toBe('src')
      expect(store.getState().nodes['root']).toMatchObject({
        childIds: ['src'],
      })
      expect(store.getState().nodes['src']).toMatchObject({
        childIds: ['index', 'readme'],
      })
    })

    it('de-duplicates the name against the destination siblings', () => {
      const store = createFsStore(buildState())
      // Give the moved-in file the same name as one already in `src`.
      store.getState().rename('readme', 'index.ts')
      expect(store.getState().move('readme', 'src')).toBe(true)
      expect(store.getState().nodes['readme']?.name).toBe('index (2).ts')
    })

    it('is a no-op success when the node is already in that parent', () => {
      const store = createFsStore(buildState())
      const before = store.getState().nodes
      expect(store.getState().move('index', 'src')).toBe(true)
      expect(store.getState().nodes).toBe(before)
    })

    it('refuses moving a folder into itself', () => {
      const store = createFsStore(buildState())
      expect(store.getState().move('src', 'src')).toBe(false)
      expect(store.getState().nodes['src']?.parentId).toBe('root')
    })

    it('refuses moving a folder into its own descendant', () => {
      const state = buildState()
      const src = state.nodes['src']
      if (src?.type !== 'folder') {
        throw new Error('test setup: "src" must be a folder')
      }
      state.nodes['src'] = { ...src, childIds: [...src.childIds, 'nested'] }
      state.nodes['nested'] = {
        id: 'nested',
        type: 'folder',
        name: 'nested',
        parentId: 'src',
        childIds: [],
      }
      const store = createFsStore(state)

      expect(store.getState().move('src', 'nested')).toBe(false)
      expect(store.getState().nodes['src']?.parentId).toBe('root')
    })

    it('refuses moving into a file or a non-existent target', () => {
      const store = createFsStore(buildState())
      expect(store.getState().move('readme', 'index')).toBe(false)
      expect(store.getState().move('readme', 'missing')).toBe(false)
    })
  })

  describe('setFileContent', () => {
    it("overwrites a file's content", () => {
      const store = createFsStore(buildState())
      store.getState().setFileContent('index', 'export const x = 1\n')
      expect(store.getState().nodes['index']).toMatchObject({
        content: 'export const x = 1\n',
      })
    })

    it('no-ops on a folder id or unknown id', () => {
      const store = createFsStore(buildState())
      const before = store.getState().nodes
      store.getState().setFileContent('src', 'nope')
      store.getState().setFileContent('missing', 'nope')
      expect(store.getState().nodes).toBe(before)
    })
  })

  describe('toggleExpanded', () => {
    it("flips a folder's expanded state", () => {
      const store = createFsStore(buildState())
      expect(store.getState().expanded['src']).toBe(true)
      store.getState().toggleExpanded('src')
      expect(store.getState().expanded['src']).toBe(false)
    })

    it('toggling a freshly-created (auto-expanded) folder collapses it', () => {
      const store = createFsStore(buildState())
      const id = store.getState().createFolder('root', 'lib')
      expect(store.getState().expanded[id ?? '']).toBe(true)
      store.getState().toggleExpanded(id ?? '')
      expect(store.getState().expanded[id ?? '']).toBe(false)
    })
  })

  describe('select', () => {
    it('sets and clears the selected id', () => {
      const store = createFsStore(buildState())
      store.getState().select('readme')
      expect(store.getState().selectedId).toBe('readme')
      store.getState().select(null)
      expect(store.getState().selectedId).toBeNull()
    })
  })

  describe('default initial state', () => {
    it('seeds a single starter file, selected by default', () => {
      const store = createFsStore()
      const { rootId, nodes, selectedId } = store.getState()
      const root = nodes[rootId]
      expect(root?.type).toBe('folder')
      const rootChildIds = root?.type === 'folder' ? root.childIds : []
      expect(rootChildIds).toHaveLength(1)
      expect(selectedId).toBe(rootChildIds[0])
      expect(nodes[selectedId ?? '']).toMatchObject({
        type: 'file',
        name: 'index.js',
      })
    })
  })
})
