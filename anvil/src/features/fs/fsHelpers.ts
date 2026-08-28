import type { FolderNode, FsNode } from './types'

/**
 * Splits a file name into its de-duplication "stem" and "extension" —
 * `resolveUniqueName` appends the " (2)" suffix to the stem, before
 * the extension, so `"index.ts"` collides into `"index (2).ts"`
 * rather than the much less useful `"index.ts (2)"`.
 *
 * A leading dot doesn't count as starting an extension (`.gitignore`
 * splits as stem `.gitignore`, no extension) — the same rule real file
 * systems use for dotfiles.
 */
function splitExtension(name: string): { stem: string; ext: string } {
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex <= 0) {
    return { stem: name, ext: '' }
  }
  return { stem: name.slice(0, dotIndex), ext: name.slice(dotIndex) }
}

/**
 * Finds a name that doesn't collide with any of `parentId`'s existing
 * children (other than `excludeId`, so renaming a node to its own
 * current name is never treated as a collision with itself).
 *
 * De-duplicating rather than rejecting the call keeps `createFile` /
 * `createFolder` / `rename` always-succeeds operations from the
 * caller's point of view — the UI never has to show a "name taken"
 * error for what's usually just a fast double-click.
 */
export function resolveUniqueName(
  nodes: Record<string, FsNode>,
  parentId: string,
  desiredName: string,
  excludeId?: string,
): string {
  const parent = nodes[parentId]
  const siblingNames = new Set(
    parent?.type === 'folder'
      ? parent.childIds
          .filter((id) => id !== excludeId)
          .map((id) => nodes[id]?.name)
      : [],
  )

  if (!siblingNames.has(desiredName)) {
    return desiredName
  }

  const { stem, ext } = splitExtension(desiredName)
  let attempt = 2
  let candidate = `${stem} (${attempt})${ext}`
  while (siblingNames.has(candidate)) {
    attempt += 1
    candidate = `${stem} (${attempt})${ext}`
  }
  return candidate
}

/** `true` if `candidateId` is `ancestorId` itself or nested anywhere
 * inside it — the check a move has to pass so a folder can never end
 * up as its own descendant. */
export function isSelfOrDescendant(
  nodes: Record<string, FsNode>,
  ancestorId: string,
  candidateId: string,
): boolean {
  if (ancestorId === candidateId) {
    return true
  }
  const ancestor = nodes[ancestorId]
  if (ancestor?.type !== 'folder') {
    return false
  }
  return ancestor.childIds.some((childId) =>
    isSelfOrDescendant(nodes, childId, candidateId),
  )
}

/** Every id in `id`'s subtree, `id` itself included — used by
 * `remove` to delete a folder and everything inside it in one pass. */
export function collectSubtreeIds(
  nodes: Record<string, FsNode>,
  id: string,
): string[] {
  const node = nodes[id]
  if (!node) {
    return []
  }
  if (node.type === 'file') {
    return [id]
  }
  return [
    id,
    ...node.childIds.flatMap((childId) => collectSubtreeIds(nodes, childId)),
  ]
}

/** A folder's children, folders first then files, each group
 * alphabetical (case-insensitive) — the ordering the tree UI displays,
 * independent of `childIds`' own order (creation order, preserved so a
 * future manual-reorder feature has something stable to reorder). */
export function sortedChildIds(
  nodes: Record<string, FsNode>,
  folder: FolderNode,
): string[] {
  return [...folder.childIds].sort((a, b) => {
    const nodeA = nodes[a]
    const nodeB = nodes[b]
    if (!nodeA || !nodeB) {
      return 0
    }
    if (nodeA.type !== nodeB.type) {
      return nodeA.type === 'folder' ? -1 : 1
    }
    return nodeA.name.localeCompare(nodeB.name, undefined, {
      sensitivity: 'base',
    })
  })
}

/** The slash-joined path from (but not including) the root to `id` —
 * `"src/index.ts"`, not `"/src/index.ts"`. Not shown in the UI yet,
 * but this is the address form the bundler's resolver (Phase 5) will
 * need, so it's introduced now alongside the tree it walks rather than
 * invented later against a data model that wasn't built with it in
 * mind. */
export function getPath(nodes: Record<string, FsNode>, id: string): string {
  const segments: string[] = []
  let current = nodes[id]
  while (current && current.parentId !== null) {
    segments.unshift(current.name)
    current = nodes[current.parentId]
  }
  return segments.join('/')
}
