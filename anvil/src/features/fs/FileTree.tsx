import { createContext, useContext, useEffect, useRef, useState } from 'react'

import { sortedChildIds } from './fsHelpers'

import type { FsNode, FsNodeType, FsStoreState } from './types'

/**
 * Everything a `TreeNode` at any depth needs, threaded through React
 * context instead of as props on every recursive call. A flat sibling
 * list (like `form-builder`'s `StepTabs`) passes callbacks as props
 * because there's only one level of nesting to thread through; a tree
 * of arbitrary depth is the case context exists for — the alternative
 * is the same dozen callbacks re-declared on every `TreeNode`'s prop
 * type just to pass them one level further down.
 */
interface FileTreeContextValue {
  nodes: FsStoreState['nodes']
  selectedId: string | null
  expanded: FsStoreState['expanded']
  renamingId: string | null
  draftName: string
  creating: { parentId: string; kind: FsNodeType } | null
  setDraftName: (value: string) => void
  startRename: (node: FsNode) => void
  commitRename: () => void
  cancelRename: () => void
  startCreating: (parentId: string, kind: FsNodeType) => void
  commitCreating: () => void
  cancelCreating: () => void
  toggleExpanded: (id: string) => void
  select: (id: string) => void
  remove: (id: string) => void
}

const FileTreeContext = createContext<FileTreeContextValue | null>(null)

function useFileTreeContext(): FileTreeContextValue {
  const ctx = useContext(FileTreeContext)
  if (!ctx) {
    throw new Error('FileTree components must render inside <FileTree>.')
  }
  return ctx
}

/** Focuses an input as soon as it mounts. An `autoFocus` prop would do
 * the same thing more tersely, but `jsx-a11y/no-autofocus` flags it —
 * autofocus-on-page-load is the accessibility hazard that rule guards
 * against, but a rename/create input that only exists because the
 * user just clicked "rename" or "+ file" is a different situation:
 * focus is following an action they just took, not grabbing it out
 * from under them on load. An effect-driven focus does the same thing
 * without tripping the lint rule aimed at the page-load case. */
function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return ref
}

/**
 * The virtual file system's tree UI: expand/collapse, selection, and
 * create/rename/delete — everything Phase 2's roadmap line calls for
 * except drag-and-drop reordering. `move` exists and is fully tested
 * on the store (see `createFsStore.test.ts`), but has no UI affordance
 * yet — a deliberate scope cut, the same kind `form-builder` made for
 * `moveFieldToStep`, and for the same reason: a synthetic pointer-drag
 * is real complexity (see that project's README case study on E2E
 * drag flakiness) that this phase doesn't need to take on to prove out
 * hierarchical state management.
 */
export function FileTree({ fs }: { fs: FsStoreState }) {
  const [creating, setCreating] = useState<{
    parentId: string
    kind: FsNodeType
  } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  const startCreating = (parentId: string, kind: FsNodeType) => {
    // The new-node input renders inside the parent folder's children
    // list, which only renders while that folder is expanded — without
    // this, clicking "+ file" on a collapsed folder would open an
    // input nobody can see. `createFolder` already expands a folder it
    // just made for the same reason; this covers the other direction
    // (an existing, still-collapsed folder).
    if (parentId !== fs.rootId && !fs.expanded[parentId]) {
      fs.toggleExpanded(parentId)
    }
    setCreating({ parentId, kind })
    setDraftName('')
  }
  const commitCreating = () => {
    if (creating) {
      const name = draftName.trim()
      if (name) {
        if (creating.kind === 'file') {
          fs.createFile(creating.parentId, name)
        } else {
          fs.createFolder(creating.parentId, name)
        }
      }
    }
    setCreating(null)
    setDraftName('')
  }
  const cancelCreating = () => {
    setCreating(null)
    setDraftName('')
  }

  const startRename = (node: FsNode) => {
    setRenamingId(node.id)
    setDraftName(node.name)
  }
  const commitRename = () => {
    if (renamingId) {
      const name = draftName.trim()
      if (name) {
        fs.rename(renamingId, name)
      }
    }
    setRenamingId(null)
    setDraftName('')
  }
  const cancelRename = () => {
    setRenamingId(null)
    setDraftName('')
  }

  const contextValue: FileTreeContextValue = {
    nodes: fs.nodes,
    selectedId: fs.selectedId,
    expanded: fs.expanded,
    renamingId,
    draftName,
    creating,
    setDraftName,
    startRename,
    commitRename,
    cancelRename,
    startCreating,
    commitCreating,
    cancelCreating,
    toggleExpanded: fs.toggleExpanded,
    select: fs.select,
    remove: fs.remove,
  }

  const root = fs.nodes[fs.rootId]

  return (
    <div className="file-tree">
      <div className="file-tree__toolbar">
        <button
          type="button"
          onClick={() => {
            startCreating(fs.rootId, 'file')
          }}
        >
          + File
        </button>
        <button
          type="button"
          onClick={() => {
            startCreating(fs.rootId, 'folder')
          }}
        >
          + Folder
        </button>
      </div>
      <FileTreeContext.Provider value={contextValue}>
        <ul className="file-tree__list">
          {root?.type === 'folder' &&
            sortedChildIds(fs.nodes, root).map((childId) => (
              <TreeNode key={childId} nodeId={childId} depth={0} />
            ))}
          {creating?.parentId === fs.rootId && (
            <NewNodeRow kind={creating.kind} depth={0} />
          )}
        </ul>
      </FileTreeContext.Provider>
    </div>
  )
}

function RenameInput({ node }: { node: FsNode }) {
  const ctx = useFileTreeContext()
  const inputRef = useFocusOnMount<HTMLInputElement>()
  return (
    <input
      ref={inputRef}
      type="text"
      className="file-tree__input"
      value={ctx.draftName}
      aria-label={`Rename ${node.name}`}
      onChange={(event) => {
        ctx.setDraftName(event.target.value)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          ctx.commitRename()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          ctx.cancelRename()
        }
      }}
      onBlur={ctx.commitRename}
    />
  )
}

function NewNodeRow({ kind, depth }: { kind: FsNodeType; depth: number }) {
  const ctx = useFileTreeContext()
  const inputRef = useFocusOnMount<HTMLInputElement>()
  const label = kind === 'file' ? 'New file name' : 'New folder name'
  return (
    <li>
      <div
        className="file-tree__row"
        style={{ paddingLeft: depth * 16 + (kind === 'file' ? 20 : 0) }}
      >
        <input
          ref={inputRef}
          type="text"
          className="file-tree__input"
          placeholder={label}
          value={ctx.draftName}
          aria-label={label}
          onChange={(event) => {
            ctx.setDraftName(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              ctx.commitCreating()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              ctx.cancelCreating()
            }
          }}
          onBlur={ctx.cancelCreating}
        />
      </div>
    </li>
  )
}

function TreeNode({ nodeId, depth }: { nodeId: string; depth: number }) {
  const ctx = useFileTreeContext()
  const node = ctx.nodes[nodeId]
  if (!node) {
    return null
  }

  const isRenaming = ctx.renamingId === nodeId

  if (node.type === 'folder') {
    const isExpanded = Boolean(ctx.expanded[nodeId])
    return (
      <li>
        <div className="file-tree__row" style={{ paddingLeft: depth * 16 }}>
          <button
            type="button"
            className="file-tree__toggle"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`}
            onClick={() => {
              ctx.toggleExpanded(nodeId)
            }}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
          {isRenaming ? (
            <RenameInput node={node} />
          ) : (
            <span className="file-tree__name">{node.name}</span>
          )}
          <span className="file-tree__actions">
            <button
              type="button"
              aria-label={`New file in ${node.name}`}
              onClick={() => {
                ctx.startCreating(nodeId, 'file')
              }}
            >
              + file
            </button>
            <button
              type="button"
              aria-label={`New folder in ${node.name}`}
              onClick={() => {
                ctx.startCreating(nodeId, 'folder')
              }}
            >
              + folder
            </button>
            <button
              type="button"
              aria-label={`Rename ${node.name}`}
              onClick={() => {
                ctx.startRename(node)
              }}
            >
              Rename
            </button>
            <button
              type="button"
              aria-label={`Delete ${node.name}`}
              onClick={() => {
                ctx.remove(nodeId)
              }}
            >
              Delete
            </button>
          </span>
        </div>
        {isExpanded && (
          <ul>
            {sortedChildIds(ctx.nodes, node).map((childId) => (
              <TreeNode key={childId} nodeId={childId} depth={depth + 1} />
            ))}
            {ctx.creating?.parentId === nodeId && (
              <NewNodeRow kind={ctx.creating.kind} depth={depth + 1} />
            )}
          </ul>
        )}
      </li>
    )
  }

  const isSelected = ctx.selectedId === nodeId
  return (
    <li>
      <div className="file-tree__row" style={{ paddingLeft: depth * 16 + 20 }}>
        {isRenaming ? (
          <RenameInput node={node} />
        ) : (
          <button
            type="button"
            className="file-tree__name file-tree__name--file"
            aria-current={isSelected ? 'true' : 'false'}
            onClick={() => {
              ctx.select(nodeId)
            }}
          >
            {node.name}
          </button>
        )}
        <span className="file-tree__actions">
          <button
            type="button"
            aria-label={`Rename ${node.name}`}
            onClick={() => {
              ctx.startRename(node)
            }}
          >
            Rename
          </button>
          <button
            type="button"
            aria-label={`Delete ${node.name}`}
            onClick={() => {
              ctx.remove(nodeId)
            }}
          >
            Delete
          </button>
        </span>
      </div>
    </li>
  )
}
