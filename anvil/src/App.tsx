/**
 * Phase 1 scaffold: the three-pane shell the rest of the roadmap fills
 * in. Each panel is a landmark region with its own accessible name so
 * later phases (and their tests) can target a panel without depending
 * on layout order — `aria-label` here, not a heading-text lookup, is
 * the stable hook.
 *
 *   Files (Phase 2: virtual FS tree)
 *     -> Editor (Phase 3: Monaco, wired to the virtual FS)
 *     -> Preview (Phases 4-7: Web Worker + esbuild-wasm bundle,
 *        rendered inside a sandboxed iframe)
 *
 * See the README for the full roadmap and the architecture this shell
 * is standing in for.
 */
function App() {
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
          <p className="workbench__placeholder">
            Coming in Phase 2: a virtual, hierarchical file tree.
          </p>
        </section>

        <section
          className="workbench__panel workbench__panel--editor"
          aria-label="Editor"
        >
          <h2>Editor</h2>
          <p className="workbench__placeholder">
            Coming in Phase 3: a Monaco editor wired to the virtual file system.
          </p>
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
