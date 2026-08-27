# Nucleus Workspace

An npm-workspaces monorepo of portfolio projects.

| Workspace                        | What it is                                                      |
| --------------------------------- | ----------------------------------------------------------------- |
| [`form-builder`](./form-builder) | Configurable form & workflow builder (React + Vite + TypeScript) |
| [`anvil`](./anvil)                | In-browser code playground & bundler (React + Vite + TypeScript, esbuild-wasm on a Web Worker, sandboxed iframe preview) |

## Getting started

```bash
npm install        # installs every workspace's deps from the root
npm run dev         # runs form-builder's dev server
npm run dev --workspace=anvil   # runs anvil's dev server instead
npm run ci           # lint + typecheck + format check + test + build, every workspace
```

Most root scripts fan out to every workspace via `--workspaces --if-present`
(`dev` and `preview` are the exception — a dev server is a single-project
thing, so those stay scoped to `form-builder` and each project's own dev
server is run with `--workspace=<name>` instead). See each project's own
README — [`form-builder/README.md`](./form-builder/README.md),
[`anvil/README.md`](./anvil/README.md) — for its docs, architecture, and
roadmap.

## Why a root workspace

`.github/workflows/` has to live at the actual repository root, so setting
up the workspace layout from the start (back when there was only one
project) was less disruptive than moving it later once there was more code
and history to work around. `anvil` is the first project to actually prove
the layout out. Each project still owns its full toolchain (ESLint,
Prettier, tsconfig, Vitest, Playwright) rather than sharing it from the
root — `anvil`'s configs are a close copy of `form-builder`'s today, but
nothing forces them to stay identical if the two projects' needs diverge
(e.g. `anvil`'s Web Worker source will need `WebWorker` lib types its
tsconfig has to carry that `form-builder`'s doesn't).

## CI/CD

Two independent systems, on purpose:

- **`.github/workflows/ci.yml`** is the quality gate, with an independent
  set of jobs per project (`lint-and-typecheck`, `unit-tests`, `build`,
  `e2e` for `form-builder`; the same shape, suffixed `-anvil`, for `anvil`).
  It does **not** deploy anything. Set a GitHub branch protection rule on
  `main` requiring these jobs to pass before merge — that's what actually
  keeps broken code off the branch Vercel deploys to production.
- **Vercel** deploys, via its native GitHub integration: this repo's
  `jafferkimitei/Nucleus` is linked to a `form-builder` Vercel project with
  Root Directory `form-builder` (see
  [`form-builder/vercel.json`](./form-builder/vercel.json) for the build
  config). `anvil` has its own `vercel.json` ready the same way, but isn't
  linked to a Vercel project yet — that's a one-time setup step in the
  Vercel dashboard, not something this repo's config alone can turn on.
  Every PR gets its own preview deployment; every push to `main` deploys to
  production. Both happen independently of the GitHub Actions run above —
  Vercel doesn't wait on CI, which is why the branch protection rule is
  what's actually load-bearing for keeping bad code off production, not the
  deploy mechanism itself.

This is a deliberate split: reusing GitHub Actions to *also* drive the
deploy (build once, upload as an artifact, `vercel deploy` it) would mean
maintaining Vercel's build behavior ourselves instead of letting Vercel's
purpose-built build system do it. The cost is that a red CI run doesn't
block a Vercel preview from existing (previews are meant to be seen even
on in-progress PRs) — production is what branch protection actually
guards.

## Adding a new project later

`anvil` followed this checklist when it was added as the second workspace;
the next one follows the same steps.

1. Add the folder as a sibling of `form-builder/` and `anvil/` (or
   introduce `apps/`/`packages/` at that point, if the mix of projects
   calls for it).
2. Add it to this root `package.json`'s `"workspaces"` array. The root
   scripts that use `--workspaces --if-present` (`lint`, `typecheck`,
   `test`, `test:coverage`, `test:e2e`, `build`, `ci`) then cover it
   automatically; `dev` and `preview` don't, on purpose (see "Why a root
   workspace" above) — run those with `--workspace=<name>`.
3. Give it its own jobs in `.github/workflows/ci.yml` and, if it deploys,
   its own Vercel project (Root Directory set to that folder).
4. Add a row to the workspace table above.
