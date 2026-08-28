import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { FileTree } from '../FileTree'
import { useFs } from '../useFs'

import type { FsNode, FsState } from '../types'

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
  // `src` starts collapsed, so tests that need to see inside it get to
  // exercise the expand affordance rather than finding it pre-opened.
  return { nodes, rootId: 'root', selectedId: 'readme', expanded: {} }
}

function Harness({ initial }: { initial?: FsState }) {
  const fs = useFs(initial)
  return <FileTree fs={fs} />
}

describe('FileTree', () => {
  it('renders top-level nodes, folders collapsed by default', () => {
    render(<Harness initial={buildState()} />)

    expect(
      screen.getByRole('button', { name: 'README.md' }),
    ).toBeInTheDocument()
    expect(screen.getByText('src')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'index.ts' }),
    ).not.toBeInTheDocument()
  })

  it('expands a folder to reveal its children', async () => {
    const user = userEvent.setup()
    render(<Harness initial={buildState()} />)

    await user.click(screen.getByRole('button', { name: 'Expand src' }))

    expect(screen.getByRole('button', { name: 'index.ts' })).toBeInTheDocument()
  })

  it('marks the selected file with aria-current', () => {
    render(<Harness initial={buildState()} />)
    expect(screen.getByRole('button', { name: 'README.md' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('creating a file at the root adds it to the tree', async () => {
    const user = userEvent.setup()
    render(<Harness initial={buildState()} />)

    await user.click(screen.getByRole('button', { name: '+ File' }))
    await user.type(
      screen.getByRole('textbox', { name: 'New file name' }),
      'notes.md',
    )
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: 'notes.md' })).toBeInTheDocument()
  })

  it('pressing Escape while creating cancels without adding a node', async () => {
    const user = userEvent.setup()
    render(<Harness initial={buildState()} />)

    await user.click(screen.getByRole('button', { name: '+ Folder' }))
    await user.type(
      screen.getByRole('textbox', { name: 'New folder name' }),
      'abandoned',
    )
    await user.keyboard('{Escape}')

    expect(
      screen.queryByRole('textbox', { name: 'New folder name' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('abandoned')).not.toBeInTheDocument()
  })

  it('creating a file inside a folder via its own control nests it there', async () => {
    const user = userEvent.setup()
    render(<Harness initial={buildState()} />)

    await user.click(screen.getByRole('button', { name: 'New file in src' }))
    await user.type(
      screen.getByRole('textbox', { name: 'New file name' }),
      'utils.ts',
    )
    await user.keyboard('{Enter}')

    // Creating inside `src` expands it (see the store's createFolder /
    // FileTree's own expectation that a create-in-progress row implies
    // the parent is visible), so the new file should be visible without
    // an extra expand click.
    expect(screen.getByRole('button', { name: 'utils.ts' })).toBeInTheDocument()
  })

  it('renaming a node via the inline input commits on Enter', async () => {
    const user = userEvent.setup()
    render(<Harness initial={buildState()} />)

    await user.click(screen.getByRole('button', { name: 'Rename README.md' }))
    const input = screen.getByRole('textbox', { name: 'Rename README.md' })
    await user.clear(input)
    await user.type(input, 'GUIDE.md')
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: 'GUIDE.md' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'README.md' }),
    ).not.toBeInTheDocument()
  })

  it('deleting a node removes it from the tree', async () => {
    const user = userEvent.setup()
    render(<Harness initial={buildState()} />)

    await user.click(screen.getByRole('button', { name: 'Delete README.md' }))

    expect(
      screen.queryByRole('button', { name: 'README.md' }),
    ).not.toBeInTheDocument()
  })

  it('deleting a folder removes its whole subtree', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness initial={buildState()} />)

    await user.click(
      within(container).getByRole('button', { name: 'Delete src' }),
    )

    expect(screen.queryByText('src')).not.toBeInTheDocument()
  })
})
