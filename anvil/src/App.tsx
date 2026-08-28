import { FileTree, getPath, useFs } from '@/features/fs'

/**
 * The three-pane shell, now with its first two panes wired to real
 * state: Files is the virtual file system's tree (Phase 2); Editor is
 * a read-only preview of whichever file is selected, standing in for
 * the Monaco editor Phase 3 will put there instead. Preview stays a
 * placeholder until Phases 4-7 land the compile-and-run pipeline
 * behind it.
 *
 * Both panels read the same `useFs()` instance — proving out, on a
 * small scale, the shape Phase 3 will lean on for real: the editor
 * doesn't own file content, the virtual file system does.
 */
function App() {
  const fs = useFs()
  const selectedNode = fs.selectedId ? fs.nodes[fs.selectedId] : undefined
  const selectedFile = selectedNode?.type === 'file' ? selectedNode : undefined

  return (
    <main>
      <h1>Anvil</h1>
      <p className="tagline">
        An in-browser code playground &amp; bundler — edit a small project,
        compile it off the main thread, and run it in a sandboxed preview, all
        without a server.
      </p>

      <div className="workbench">
        <section
          className="workbench__panel workbench__panel--files"
          aria-label="File explorer"
        >
          <h2>Files</h2>
          <FileTree fs={fs} />
        </section>

        <section
          className="workbench__panel workbench__panel--editor"
          aria-label="Editor"
        >
          <h2>Editor</h2>
          {selectedFile ? (
            <div className="editor-preview">
              <p className="editor-preview__path">
                {getPath(fs.nodes, selectedFile.id)}
              </p>
              <pre className="editor-preview__content">
                {selectedFile.content}
              </pre>
            </div>
          ) : (
            <p className="workbench__placeholder">
              Coming in Phase 3: a Monaco editor wired to the virtual file
              system.
            </p>
          )}
        </section>

        <section
          className="workbench__panel workbench__panel--preview"
          aria-label="Preview"
        >
          <h2>Preview</h2>
          <p className="workbench__placeholder">
            Coming in Phases 4-7: an esbuild-wasm bundle, compiled on a Web
            Worker and rendered inside a sandboxed iframe.
          </p>
        </section>
      </div>
    </main>
  )
}

export default App
