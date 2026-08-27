# Form & Workflow Builder

A configurable, metadata-driven, multi-step form builder: a drag-and-drop
dashboard for building forms as data, plus the runtime that renders and
validates them.

> **Status: Phase 0 — project scaffold.** The architecture write-up,
> diagrams, and "trade-offs" case study called for by the project brief
> live in this README once the engine (Phases 1-6) exists to document. For
> now, this is the setup guide.

This project lives inside an npm-workspaces monorepo — see the
[root README](../README.md) for the workspace layout. Commands below
assume you're in this directory (`form-builder/`); the same scripts are
also reachable from the repo root via `npm run <script> --workspace=form-builder`.

## Roadmap

1. ~~Project scaffold: strict TS, ESLint/Prettier, Vitest, Playwright, CI~~
   (this phase)
2. Metadata-driven form schema & renderer
3. State management & multi-step workflow engine
4. Validation engine (sync, cross-field, async conditional)
5. Drag-and-drop builder dashboard
6. Performance tuning pass
7. Test coverage (unit + integration + E2E)
8. GitHub Actions CI (quality gate) + Vercel (build/deploy) — done, ahead of schedule
9. Case-study README (this file, rewritten)

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript (strict mode, plus the
  extra strictness flags `strict` alone doesn't enable — see
  `tsconfig.app.json`)
- [Zustand](https://github.com/pmndrs/zustand) for state
- [ESLint](https://eslint.org) (flat config, type-checked) + [Prettier](https://prettier.io)
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) for unit/integration tests
- [Playwright](https://playwright.dev) for E2E

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Script                  | What it does                                   |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Start the Vite dev server                      |
| `npm run build`         | Type-check (`tsc -b`) and build for production |
| `npm run preview`       | Preview the production build locally           |
| `npm run lint`          | ESLint (type-checked)                          |
| `npm run lint:fix`      | ESLint with autofix                            |
| `npm run format`        | Prettier, writes changes                       |
| `npm run format:check`  | Prettier, check only (used in CI)              |
| `npm run typecheck`     | `tsc -b` with no emit                          |
| `npm run test`          | Vitest, single run                             |
| `npm run test:watch`    | Vitest, watch mode                             |
| `npm run test:coverage` | Vitest with coverage thresholds enforced       |
| `npm run test:e2e`      | Playwright E2E suite                           |
| `npm run test:e2e:ui`   | Playwright E2E suite, interactive UI mode      |
| `npm run ci`            | Everything CI runs, in one command             |

## Project structure

```
src/
  app/                 App shell (added in Phase 2)
  components/ui/       Shared, schema-agnostic UI primitives
  features/
    form-renderer/     Schema → DOM renderer (Phase 1)
    workflow/           Multi-step navigation + store (Phase 2)
    validation/         Sync/async/cross-field validation (Phase 3)
    builder/            Drag-and-drop builder dashboard (Phase 4)
  store/               Zustand stores & selectors
  lib/                 Framework-agnostic utilities
  types/               Shared schema types
  test/                Test setup
e2e/                   Playwright specs
vercel.json            Explicit build config for the Vercel deploy
```

CI (`.github/workflows/ci.yml`) lives at the monorepo root — see the root
README. Deployment is handled separately by Vercel's own GitHub
integration (Root Directory = `form-builder`), not by CI; `vercel.json` in
this folder pins the build command/output directory so that isn't left to
framework auto-detection.

## Environment / tooling notes

- Node version pinned via `.nvmrc` (22).
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` — optional env var read by
  `playwright.config.ts` to point Playwright at a pre-provisioned Chromium
  binary instead of downloading one. Not needed on a normal machine or in
  CI (`npx playwright install --with-deps` handles it there); useful in a
  sandboxed dev environment that ships its own browser at a fixed path.
