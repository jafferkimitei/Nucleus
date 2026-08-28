# Anvil

An in-browser code playground & bundler — a lightweight, client-side
alternative to CodeSandbox or StackBlitz. Edit a small multi-file project,
compile it with `esbuild-wasm` on a dedicated Web Worker (so typing never
blocks the UI thread), and run the result in a sandboxed `<iframe>` — no
server-side build step involved.

> **Status: Phase 2 (virtual file system) complete.** The workspace,
> tooling, and a virtual hierarchical file system with a working tree UI
> are in place — see it live at
> [anvil-chi-eight.vercel.app](https://anvil-chi-eight.vercel.app).
> Everything from Phase 3 on is roadmap, not yet built.

## Why this project

Most portfolio apps are CRUD over a REST API. This one is deliberately not
that — it's a tool for other developers, and the interesting problems are
systems problems: keeping a UI responsive while doing real compute work,
running untrusted code safely, and modeling a file system as data rather
than as actual files. The skills it's built to demonstrate:

- **Multi-threading via Web Workers** — compiling code without blocking the
  main UI thread, including a typed request/response/cancel protocol and
  proper worker lifecycle management.
- **Client-side bundling with `esbuild-wasm`** — resolving local imports
  (and, later, bare npm specifiers via a CDN) entirely in the browser.
- **Secure sandboxing** — running the compiled output inside an isolated
  `<iframe>` with a locked-down `sandbox` attribute, with a `postMessage`
  bridge back out for console/error capture.
- **Hierarchical state management** — a virtual file system modeled as a
  tree, with a store that supports create/rename/move/delete without
  touching a real disk.

## Roadmap

- [x] **Phase 1 — Scaffold.** npm workspace wired into the monorepo, Vite +
      React 19 + TypeScript (strict) + ESLint + Prettier + Vitest +
      Playwright, CI job, and a placeholder three-pane shell (file
      explorer / editor / preview landmarks with no behavior yet).
- [x] **Phase 2 — Virtual file system.** A hierarchical file/folder tree as
      data (a normalized, flat `Record<id, node>` map with `parentId` /
      `childIds` links, not nested objects — see
      [`src/features/fs/types.ts`](./src/features/fs/types.ts)), a Zustand
      store with CRUD operations (create, rename, move, delete — all but
      move de-duplicating a colliding name rather than failing), and a
      file-tree UI (expand/collapse, selection, inline create/rename).
      `move` has no drag-and-drop affordance yet — a deliberate scope cut,
      see [`FileTree.tsx`](./src/features/fs/FileTree.tsx)'s doc comment.
- [ ] **Phase 3 — Code editor.** Monaco wired to the virtual FS: opening a
      file loads its model into the editor, edits write back to FS state,
      a multi-tab open-files bar.
- [ ] **Phase 4 — Web Worker compilation pipeline.** A dedicated compiler
      worker, a typed message protocol (compile request / result / error /
      cancel), and lifecycle management so the worker is created once and
      reused rather than spun up per keystroke.
- [ ] **Phase 5 — `esbuild-wasm` bundling.** Initialize `esbuild-wasm`
      inside the worker; a custom resolve/load plugin that reads from an
      in-memory snapshot of the virtual FS instead of a real filesystem;
      bundle the entry file and its local imports; report errors with
      structured file/line/column information.
- [ ] **Phase 6 — Bare-specifier resolution.** Extend the bundler plugin to
      resolve `import`s that name an npm package (e.g. `react`) against a
      CDN (`esm.sh`), with an in-memory fetch cache so a rebuild doesn't
      re-fetch every dependency on every keystroke.
- [ ] **Phase 7 — Sandboxed preview.** A locked-down `sandbox` iframe, the
      bundle injected via a blob URL, a small runtime shim that captures
      `console.*` calls and uncaught errors and relays them to a console
      panel over `postMessage`, and a fresh iframe per run so state never
      leaks between runs.
- [ ] **Phase 8 — DX polish.** Debounced auto-rebuild on edit, loading and
      error states, an in-preview error overlay, keyboard shortcuts, a
      couple of starter templates.
- [ ] **Phase 9 — Testing & hardening.** Coverage for the FS store, the
      worker protocol, and the bundler plugin; component tests for the
      editor and preview; E2E covering the full edit → bundle → preview
      loop; an accessibility pass; worker cancellation edge cases.
- [ ] **Phase 10 — Architecture case study.** A README rewrite with
      diagrams of the worker message-passing protocol and the
      FS-tree → editor → bundle → iframe data flow, mirroring
      [`form-builder`](../form-builder)'s Phase 8 write-up.

## Stack

React 19, Vite, TypeScript (strict, plus the flags `strict` doesn't turn on
— see `tsconfig.app.json`), Zustand, Vitest + Testing Library, Playwright,
ESLint (flat config, type-checked rules) + Prettier.

`esbuild-wasm` and `monaco-editor` are not dependencies yet — they land in
the phases that actually use them (5 and 3, respectively) rather than being
installed upfront and sitting unused.

## Getting started

```bash
npm install              # from the monorepo root — installs every workspace
npm run dev --workspace=anvil
npm run ci --workspace=anvil   # lint + typecheck + format check + test + build
```

## Scripts

Run from this directory, or from the root with `--workspace=anvil`:

| Script                     | What it does                       |
| -------------------------- | ---------------------------------- |
| `dev`                      | Vite dev server                    |
| `build`                    | Type-check, then production build  |
| `preview`                  | Serve the production build locally |
| `lint` / `lint:fix`        | ESLint                             |
| `format` / `format:check`  | Prettier                           |
| `typecheck`                | `tsc -b` (project references)      |
| `test` / `test:watch`      | Vitest                             |
| `test:coverage`            | Vitest with the v8 coverage report |
| `test:e2e` / `test:e2e:ui` | Playwright                         |
| `ci`                       | Everything CI runs, in order       |

## Project structure

```
anvil/
  e2e/                        Playwright specs
  public/                     Static assets served as-is
  src/
    App.tsx                   The three-pane shell (files / editor / preview)
    main.tsx                  Entry point
    index.css                 Global styles
    test/setup.ts             Vitest setup (jest-dom matchers, cleanup)
    features/
      fs/                     Phase 2: the virtual file system
        types.ts              FsNode / FsState / FsActions
        fsHelpers.ts          Pure tree helpers (dedup, cycle check, sort, path)
        createFsStore.ts      The Zustand store (factory, not a singleton)
        useFs.ts              Per-component store instance hook
        FileTree.tsx          The tree UI
```

This is the same `features/`-oriented shape `form-builder` settled into
(see that project's README) — one directory per roadmap phase's slice of
the app, added as each phase actually needs it rather than scaffolded in
up front.

## Environment / tooling notes

- `esbuild-wasm` ships a `.wasm` binary that Vite needs to serve/bundle
  correctly — Phase 5 will document whatever config that turns out to
  need (most likely `?url` or `vite-plugin-wasm`, decided once there's a
  concrete integration to test against rather than guessed at now).
- The compiler worker (Phase 4) will need `WebWorker` lib types alongside
  the app's `DOM` types without the two conflicting — likely its own
  `tsconfig.worker.json` scoped to just the worker entry file, referenced
  from the root `tsconfig.json` the same way `tsconfig.node.json` is today.
- The sandboxed preview iframe (Phase 7) intentionally runs on the app's
  own origin via a `blob:`/`srcdoc` document rather than a separate
  deployed origin — real cross-origin isolation (the way StackBlitz's
  WebContainers or CodeSandbox's sandboxes do it) would need its own
  subdomain, which is out of scope for a portfolio project but worth
  calling out explicitly as a scope cut rather than leaving it implicit.
- Phase 2 shipped a real accessibility bug worth noting rather than
  quietly fixing: the tree row's rename/delete/create-in-folder buttons
  were first built hover-revealed (`visibility: hidden` by default, shown
  on `:hover`). That's not just a cosmetic choice — `visibility: hidden`
  removes an element from the accessibility tree _and_ the tab order, so
  those actions would have been completely unreachable from the keyboard,
  not merely harder to discover. Caught by the Playwright E2E test (its
  locator couldn't find the hidden button at all), not by the component
  tests, which don't render real CSS. Fixed by making the actions always
  visible instead of hover-gated — busier-looking, but actually usable.
  A worthwhile reminder that an E2E suite running against real, styled
  DOM catches a category of bug component tests structurally can't.
