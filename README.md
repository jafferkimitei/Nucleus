# Form Builder Workspace

An npm-workspaces monorepo. Currently one project; more will be added here
as siblings of `form-builder/`.

| Workspace                        | What it is                                                      |
| --------------------------------- | ----------------------------------------------------------------- |
| [`form-builder`](./form-builder) | Configurable form & workflow builder (React + Vite + TypeScript) |

## Getting started

```bash
npm install        # installs every workspace's deps from the root
npm run dev         # runs form-builder's dev server
npm run ci           # lint + typecheck + format check + test + build, form-builder
```

Root scripts delegate to `form-builder` via `--workspace=form-builder`. See
[`form-builder/README.md`](./form-builder/README.md) for that project's own
docs, architecture, and (from Phase 8) the case-study write-up.

## Why a root workspace, and why now

Only one project exists today, but `.github/workflows/` has to live at the
actual repository root — moving it later, once there's more code and
history, is more disruptive than setting it up correctly now. Everything
else (ESLint, Prettier, tsconfig, Vitest, Playwright) stays scoped inside
`form-builder/` rather than shared from the root, since we don't yet know
whether a second project will even be a JS/TS app that could share that
config.

## CI/CD

Two independent systems, on purpose:

- **`.github/workflows/ci.yml`** is the quality gate: `lint-and-typecheck`
  and `unit-tests` run in parallel, `build` runs once both pass, and `e2e`
  runs Playwright against that build. It does **not** deploy anything.
  Set a GitHub branch protection rule on `main` requiring these jobs to
  pass before merge — that's what actually keeps broken code off the
  branch Vercel deploys to production.
- **Vercel** deploys, via its native GitHub integration: this repo's
  `jafferkimitei/Nucleus` is linked to the `form-builder` Vercel project
  with Root Directory `form-builder` (see
  [`form-builder/vercel.json`](./form-builder/vercel.json) for the build
  config). Every PR gets its own preview deployment; every push to `main`
  deploys to production. Both happen independently of the GitHub Actions
  run above — Vercel doesn't wait on CI, which is why the branch
  protection rule is what's actually load-bearing for keeping bad code
  off production, not the deploy mechanism itself.

This is a deliberate split: reusing GitHub Actions to *also* drive the
deploy (build once, upload as an artifact, `vercel deploy` it) would mean
maintaining Vercel's build behavior ourselves instead of letting Vercel's
purpose-built build system do it. The cost is that a red CI run doesn't
block a Vercel preview from existing (previews are meant to be seen even
on in-progress PRs) — production is what branch protection actually
guards.

## Adding a new project later

1. Add the folder as a sibling of `form-builder/` (or introduce
   `apps/`/`packages/` at that point, if the mix of projects calls for it).
2. Add it to this root `package.json`'s `"workspaces"` array.
3. Give it its own CI job in `.github/workflows/ci.yml` and, if it
   deploys, its own Vercel project (Root Directory set to that folder).
