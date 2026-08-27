import { lazy, Suspense, useState } from 'react'

type View = 'demo' | 'builder'

// Code-split, not eagerly imported: `view` starts on 'demo' and the two
// views are mutually exclusive, so bundling BuilderPage's code into the
// initial chunk buys nothing for the (likely more common) visitor who
// only ever opens the demo - worse, it drags @hello-pangea/dnd along
// with it, a dependency the demo view never touches. See the Phase 5
// case study in the README for the measured bundle-size difference this
// makes. RuntimeDemo is small enough on its own that splitting it out
// is really about symmetry (and about not eagerly loading the builder
// chunk while sitting on the demo view) rather than its own weight.
const RuntimeDemo = lazy(() =>
  import('./RuntimeDemo').then((m) => ({ default: m.RuntimeDemo })),
)
const BuilderPage = lazy(() =>
  import('@/features/builder').then((m) => ({ default: m.BuilderPage })),
)

function App() {
  const [view, setView] = useState<View>('demo')

  return (
    <main>
      <h1>Form &amp; Workflow Builder</h1>
      <nav className="app-nav" aria-label="View">
        <button
          type="button"
          aria-pressed={view === 'demo'}
          onClick={() => {
            setView('demo')
          }}
        >
          Runtime demo
        </button>
        <button
          type="button"
          aria-pressed={view === 'builder'}
          onClick={() => {
            setView('builder')
          }}
        >
          Builder
        </button>
      </nav>

      <div className={view === 'builder' ? 'page page--wide' : 'page'}>
        <Suspense fallback={<p className="page__loading">Loading…</p>}>
          {view === 'demo' ? <RuntimeDemo /> : <BuilderPage />}
        </Suspense>
      </div>
    </main>
  )
}

export default App
