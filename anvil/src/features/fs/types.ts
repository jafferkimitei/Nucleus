/**
 * The virtual file system: a normalized, flat map of nodes keyed by id,
 * with hierarchy expressed through `parentId` (child -> parent) and
 * `childIds` (folder -> children), rather than a nested object tree.
 *
 * That's a deliberate choice over `{ name, children: [...] }` nesting:
 * looking up, renaming, or moving any node is an O(1) map access
 * instead of a recursive search, and moving a node between folders is
 * two array splices instead of cloning the whole subtree. The
 * hierarchy is still real — every relationship a nested tree would
 * encode is still here — it's just addressed by id instead of by
 * walking pointers.
 */
export type FsNodeType = 'file' | 'folder'

interface FsNodeBase {
  id: string
  name: string
  /** `null` only for the synthetic root folder — every other node has
   * a real parent folder. */
  parentId: string | null
}

export interface FileNode extends FsNodeBase {
  type: 'file'
  content: string
}

export interface FolderNode extends FsNodeBase {
  type: 'folder'
  childIds: string[]
}

export type FsNode = FileNode | FolderNode

export interface FsState {
  nodes: Record<string, FsNode>
  /** The synthetic root folder's id. Its own `name` is never shown —
   * only its children render, starting at depth 0 in the tree UI. */
  rootId: string
  /** The file currently open for editing. Never a folder id: the UI
   * only ever calls `select` from a file row. */
  selectedId: string | null
  /** Which folder ids are expanded in the tree UI. Absent = collapsed;
   * there's no entry for every folder up front; folders are recorded
   * here the first time they're toggled (or created, which expands
   * them so a newly-created folder doesn't look like it swallowed
   * whatever was just dropped into it). */
  expanded: Record<string, boolean>
}

export interface FsActions {
  /** Creates a file under `parentId` with `name`, de-duplicating
   * against existing sibling names (see `resolveUniqueName`) rather
   * than rejecting the call outright. Returns the new node's id, or
   * `null` if `parentId` doesn't name an existing folder or `name` is
   * blank after trimming. */
  createFile: (parentId: string, name: string) => string | null
  /** Same as `createFile`, for a folder — and expands it immediately
   * (see `FsState.expanded`). */
  createFolder: (parentId: string, name: string) => string | null
  /** Renames a node in place, de-duplicating against its *other*
   * siblings the same way `createFile`/`createFolder` do. Returns
   * `false` (leaving the tree unchanged) only if `id` doesn't exist,
   * names the root, or `name` is blank after trimming — a collision
   * never fails, it just gets a suffix. */
  rename: (id: string, name: string) => boolean
  /** Deletes a node — and, for a folder, its entire subtree. Clears
   * `selectedId` if the selected file was inside what got deleted.
   * No-ops on the root id or an id that doesn't exist. */
  remove: (id: string) => void
  /** Reparents a node under `newParentId`. Returns `false` (leaving
   * the tree unchanged) if `newParentId` isn't an existing folder, is
   * the node's current parent already producing no real move... — see
   * the implementation note on why a no-op move still returns `true` —
   * or would create a cycle (moving a folder into itself or one of its
   * own descendants). Successful moves de-duplicate the name against
   * the destination's existing children the same way creation does. */
  move: (id: string, newParentId: string) => boolean
  /** Overwrites a file's content. No-ops if `id` doesn't name an
   * existing file (e.g. it names a folder, or nothing). */
  setFileContent: (id: string, content: string) => void
  toggleExpanded: (id: string) => void
  select: (id: string | null) => void
}

export type FsStoreState = FsState & FsActions
