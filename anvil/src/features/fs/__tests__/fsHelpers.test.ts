import { describe, expect, it } from 'vitest'

import {
  collectSubtreeIds,
  getPath,
  isSelfOrDescendant,
  resolveUniqueName,
  sortedChildIds,
} from '../fsHelpers'

import type { FolderNode, FsNode } from '../types'

function buildNodes(): Record<string, FsNode> {
  return {
    root: {
      id: 'root',
      type: 'folder',
      name: '',
      parentId: null,
      childIds: ['zebra', 'apple-folder', 'index'],
    },
    'apple-folder': {
      id: 'apple-folder',
      type: 'folder',
      name: 'Apple',
      parentId: 'root',
      childIds: ['nested'],
    },
    nested: {
      id: 'nested',
      type: 'file',
      name: 'nested.ts',
      parentId: 'apple-folder',
      content: '',
    },
    zebra: {
      id: 'zebra',
      type: 'file',
      name: 'zebra.ts',
      parentId: 'root',
      content: '',
    },
    index: {
      id: 'index',
      type: 'file',
      name: 'index.ts',
      parentId: 'root',
      content: '',
    },
  }
}

describe('resolveUniqueName', () => {
  it('returns the name unchanged when there is no collision', () => {
    const nodes = buildNodes()
    expect(resolveUniqueName(nodes, 'root', 'new.ts')).toBe('new.ts')
  })

  it('appends " (2)" before the extension on a collision', () => {
    const nodes = buildNodes()
    expect(resolveUniqueName(nodes, 'root', 'index.ts')).toBe('index (2).ts')
  })

  it('keeps incrementing until a free name is found', () => {
    const nodes = buildNodes()
    nodes['index-2'] = {
      id: 'index-2',
      type: 'file',
      name: 'index (2).ts',
      parentId: 'root',
      content: '',
    }
    const root = nodes['root']
    if (root?.type === 'folder') {
      root.childIds.push('index-2')
    }
    expect(resolveUniqueName(nodes, 'root', 'index.ts')).toBe('index (3).ts')
  })

  it('does not treat a leading dot as an extension', () => {
    const nodes = buildNodes()
    nodes['dotfile'] = {
      id: 'dotfile',
      type: 'file',
      name: '.gitignore',
      parentId: 'root',
      content: '',
    }
    const root = nodes['root']
    if (root?.type === 'folder') {
      root.childIds.push('dotfile')
    }
    expect(resolveUniqueName(nodes, 'root', '.gitignore')).toBe(
      '.gitignore (2)',
    )
  })

  it('excludes the given id, so renaming to its own current name is not a collision', () => {
    const nodes = buildNodes()
    expect(resolveUniqueName(nodes, 'root', 'index.ts', 'index')).toBe(
      'index.ts',
    )
  })

  it('a folder with no children never collides', () => {
    const nodes = buildNodes()
    expect(resolveUniqueName(nodes, 'apple-folder', 'nested.ts')).toBe(
      'nested (2).ts',
    )
    expect(resolveUniqueName(nodes, 'apple-folder', 'other.ts')).toBe(
      'other.ts',
    )
  })
})

describe('isSelfOrDescendant', () => {
  it('is true for the node itself', () => {
    const nodes = buildNodes()
    expect(isSelfOrDescendant(nodes, 'apple-folder', 'apple-folder')).toBe(true)
  })

  it('is true for a nested descendant', () => {
    const nodes = buildNodes()
    expect(isSelfOrDescendant(nodes, 'apple-folder', 'nested')).toBe(true)
  })

  it('is false for an unrelated node', () => {
    const nodes = buildNodes()
    expect(isSelfOrDescendant(nodes, 'apple-folder', 'zebra')).toBe(false)
  })

  it('is false when the ancestor id is a file (files have no children)', () => {
    const nodes = buildNodes()
    expect(isSelfOrDescendant(nodes, 'zebra', 'index')).toBe(false)
  })
})

describe('collectSubtreeIds', () => {
  it('returns just the id for a file', () => {
    const nodes = buildNodes()
    expect(collectSubtreeIds(nodes, 'zebra')).toEqual(['zebra'])
  })

  it('returns the folder and every descendant for a folder', () => {
    const nodes = buildNodes()
    expect(collectSubtreeIds(nodes, 'apple-folder')).toEqual([
      'apple-folder',
      'nested',
    ])
  })

  it('returns an empty array for an unknown id', () => {
    const nodes = buildNodes()
    expect(collectSubtreeIds(nodes, 'missing')).toEqual([])
  })
})

describe('sortedChildIds', () => {
  it('lists folders before files, each group alphabetical (case-insensitive)', () => {
    const nodes = buildNodes()
    const root = nodes['root']
    expect(root?.type).toBe('folder')
    expect(sortedChildIds(nodes, root as FolderNode)).toEqual([
      'apple-folder',
      'index',
      'zebra',
    ])
  })
})

describe('getPath', () => {
  it("joins a node's name with its ancestors', separated by '/'", () => {
    const nodes = buildNodes()
    expect(getPath(nodes, 'nested')).toBe('Apple/nested.ts')
  })

  it('is just the name for a top-level node', () => {
    const nodes = buildNodes()
    expect(getPath(nodes, 'zebra')).toBe('zebra.ts')
  })

  it('is empty for the root itself', () => {
    const nodes = buildNodes()
    expect(getPath(nodes, 'root')).toBe('')
  })
})
