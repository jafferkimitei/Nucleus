# Form & Workflow Builder

A configurable, metadata-driven, multi-step form builder: a drag-and-drop
dashboard for building forms as data, plus the runtime that renders and
validates them.

> **Status: Phase 5 — performance tuning pass.** The architecture
> write-up and diagrams called for by the project brief land in this
> README once Phase 6 exists to document too. The "trade-offs" case
> study starts below, though — Phase 5 _is_ that case study.

This project lives inside an npm-workspaces monorepo — see the
[root README](../README.md) for the workspace layout. Commands below
assume you're in this directory (`form-builder/`); the same scripts are
also reachable from the repo root via `npm run <script> --workspace=form-builder`.

## Roadmap

1. ~~Project scaffold: strict TS, ESLint/Prettier, Vitest, Playwright, CI~~
2. ~~Metadata-driven form schema & renderer~~
3. ~~State management & multi-step workflow engine~~
4. ~~Validation engine (sync, cross-field, async conditional)~~
5. ~~Drag-and-drop builder dashboard~~
6. ~~Performance tuning pass~~ (this phase)
7. Test coverage (unit + integration + E2E)
8. GitHub Actions CI (quality gate) + Vercel (build/deploy) — done, ahead of schedule
9. Case-study README (this file, rewritten)

## Phase 5 case study: performance tuning

The brief for this phase is "make it faster," which only means something
if there's a number attached. Two problems turned out to be real,
measured, and fixed; a third was investigated and turned out to already
be a non-issue, which is worth writing down too — not every suspicious
pattern is actually a bug.

### 1. Code-splitting the two mutually-exclusive views

`App.tsx` shows exactly one of `RuntimeDemo` or `BuilderPage` at a time,
picked by a nav toggle that starts on `RuntimeDemo`. Both were plain
imports, so both — and everything they pull in, including
`@hello-pangea/dnd`, which only `BuilderPage` ever touches — shipped in
the one bundle every visitor downloaded before either view had rendered
a single node.

Switching both to `React.lazy` + a shared `Suspense` boundary split the
build into four chunks instead of one:

| Chunk         | Raw       | Gzip     | Loaded when                      |
| ------------- | --------- | -------- | -------------------------------- |
| `index`       | 193.26 kB | 61.17 kB | always (app shell + shared deps) |
| `RuntimeDemo` | 3.90 kB   | 1.55 kB  | the demo view mounts (default)   |
| `workflow`    | 12.34 kB  | 3.96 kB  | either view (shared controller)  |
| `builder`     | 114.67 kB | 34.17 kB | only once "Builder" is clicked   |

Before: one 322.27 kB / 98.59 kB gzip bundle, always. After: a visitor
who never opens the builder downloads `index` + `RuntimeDemo` +
`workflow` — about 209.5 kB / 66.7 kB gzip, a ~35% raw / ~32% gzip cut
— and the `@hello-pangea/dnd`-carrying `builder` chunk (a third of the
original bundle) never loads at all unless they click "Builder". The
numbers above are straight from `npm run build`'s own output, not an
estimate.

### 2. A `memo` wrapper that wasn't doing anything

`FieldPalette`, `StepCanvas`, and `StepTabs` were all wrapped in
`React.memo` from the moment they were written in Phase 4 — and it had
no effect, because `BuilderPage` passed each of them a brand-new arrow
function as a prop on every render. `memo` bails out of a re-render only
when every prop is reference-equal to last time; a fresh function
identity fails that check regardless of what the function does, so the
wrapping was pure overhead (an extra comparison that always failed)
rather than the optimization it looked like.

The concrete cost: `FieldPalette` carries no data props at all — only a
callback — so it should be able to skip re-rendering (and, since each of
its 8 entries is a `@hello-pangea/dnd` `Draggable`, skip re-registering
8 drag handles) for almost any state change elsewhere in the builder.
Instead it re-rendered on _every_ keystroke anywhere, including typing
into a field's label or the form's title — edits with no possible effect
on what the palette shows.

The fix was mechanical: `BuilderPage`'s handlers now go through
`useCallback`, keyed on the active step id and the specific store
action(s) each one calls (both stable — see `createBuilderStore`'s doc
comment on why store actions don't change identity, and
`setFormMeta`/`updateField`'s structural sharing on why editing a title
or a field leaves _other_ steps' object references untouched). This is
checked directly, not taken on faith:
`src/features/builder/__tests__/renderIsolation.test.tsx` renders the
builder, adds a field, types into its label, types into the form title,
and asserts `FieldPalette`'s render count stays at 1 throughout — the
same "assert on a render counter, not DOM behavior" approach
`form-renderer/renderTracker.ts` already used for the Phase 1-3 render-
isolation claim.

`StepCanvas` legitimately re-renders while its own step's fields
change — the visible field-card labels really do need to update — so
there's no claim that panel goes to zero re-renders, only that it's no
longer re-rendering for reasons unrelated to what's on screen.

### 3. What turned out not to be a problem

`StepTabs` receives `steps={builder.schema.steps}`, and that array gets
a brand-new reference on _every_ field edit (`updateField` rebuilds the
top-level `steps` array via `.map`, even when only one field on one
step actually changed) — so `StepTabs` re-renders on every keystroke
too, `memo` or not, and fixing that for real would mean a custom prop
comparator that diffs step id/title instead of trusting array identity.
That was deliberately left alone: `StepTabs` renders a handful of
buttons with no drag registration and no per-item work worth avoiding,
so the render is cheap regardless of whether it was "necessary" —
adding a custom comparator here would be complexity spent on a cost
that was never actually measurable.

The form-renderer/workflow layer (Phases 1-3) needed no changes at all
— it already followed the discipline this phase applied to the builder
(`Field.tsx` and `StepRenderer.tsx`'s doc comments describe it, and
`renderIsolation.test.tsx` in that feature already checks it), which is
exactly why the builder's version of the same test lives right next to
it now instead of being a one-off.

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
  components/ui/       Shared, schema-agnostic UI primitives (Button,
                        TextInput, Select, RadioGroup, Checkbox,
                        FieldWrapper — presentational only)
  features/
    form-renderer/     Schema → DOM renderer (Phase 1, done)
      fieldRegistry.tsx    FieldType -> control component lookup table
      Field.tsx            Per-field orchestrator (memoized)
      StepRenderer.tsx      Renders one step's fields
      FormRenderer.tsx      Top-level; takes a FormController, knows
                             nothing about how state is managed
      renderTracker.ts     Per-field render counter used only by the
                            render-isolation test
      fields/               One control per FieldType
    workflow/           Multi-step navigation + store (Phases 2-3, done)
      types.ts              FormController contract (state + actions +
                             derived isDirty) — the shape form-renderer
                             consumes and knows nothing else about
      createFormStore.ts    Per-instance Zustand store factory: values,
                             errors, touched, dirty, asyncStatus,
                             visitedStepIndices; wires the validation/
                             module's pure functions in for sync rules,
                             visibility cascades, and debounced/
                             race-safe async checks; goToStep force-
                             validates + touches the current step's
                             visible fields on forward navigation only
      useWorkflowFormController.ts  React hook: one store per mounted
                                     instance via useState's lazy
                                     initializer, never a module-level
                                     singleton
    validation/         Sync/cross-field/async validation (Phase 3, done)
      syncRules.ts           required/min/max/length/pattern rule checks
      evaluateCondition.ts   visibleWhen conditions, incl. one field
                              gated on another's asyncStatus
      buildFieldIndex.ts     name -> field lookup + dependents graph,
                              used to cascade-clear hidden fields
      asyncValidator.ts      mock network validator (debounced,
                              simulated latency) fields' `async` rules
                              call through
      maskUntouchedErrors.ts hides an error until its field is touched,
                              so untouched-but-invalid fields stay quiet
    builder/            Drag-and-drop builder dashboard (Phase 4, done):
                        edits a FormSchema as data. A deliberately
                        separate store from workflow/'s — that one runs
                        a fill session against a schema, this one edits
                        the schema itself; they share only the
                        FormSchema contract.
      types.ts               BuilderState/BuilderActions contract
      createBuilderStore.ts  Per-instance Zustand store factory: add/
                              remove/move/rename fields and steps,
                              change a field's type, edit its
                              validation rules and visibleWhen
                              condition — keeps dangling visibleWhen
                              references clean when a field they depend
                              on is removed or renamed
      useBuilder.ts           React hook, same lazy-useState pattern as
                              useWorkflowFormController
      fieldTypeMeta.ts        Palette copy + defaults per FieldType
      validationRuleHelpers.ts  Pure helpers for reading/updating one
                                rule in a field's validation array
      resolveDragEnd.ts       Pure function: a DragDropContext
                              onDragEnd result -> an addField/moveField
                              action or null — extracted so every
                              branch is unit-testable without
                              simulating a real pointer drag
      FieldPalette.tsx        Field-type source list: drag onto the
                              canvas, or click to add (the WCAG 2.5.7
                              single-pointer alternative)
      StepCanvas.tsx          Active step's field list; drop target +
                              reorderable
      FieldCard.tsx           One field's row: drag handle + up/down/
                              remove button equivalents
      StepTabs.tsx            Step management via up/down/remove
                              buttons only (no drag — see the comment
                              in the file for why)
      PropertyInspector.tsx   Edits the selected field: label/name/
                              type/options/validation/visibility
      LivePreview.tsx         Mounts the real FormRenderer +
                              useWorkflowFormController against the
                              schema being built — proves the builder's
                              output is exactly what the runtime
                              consumes, not a mock
      SchemaJsonView.tsx      Raw FormSchema JSON, for the curious
      BuilderPage.tsx         Top-level: layout, DragDropContext,
                              output view switcher; its handlers are
                              memoized (Phase 5) so FieldPalette/
                              StepCanvas's `memo` wrapping is effective
      renderTracker.ts        Per-component render counter, mirroring
                              form-renderer's — used only by the Phase 5
                              render-isolation test
  types/schema.ts       FormSchema/StepSchema/FieldSchema — the contract
                        everything above renders from
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
