import { Button } from '@/components/ui/Button'
import { exampleFormSchema, FormRenderer } from '@/features/form-renderer'
import { useWorkflowFormController } from '@/features/workflow'

function App() {
  const controller = useWorkflowFormController(exampleFormSchema)

  return (
    <main>
      <h1>Form &amp; Workflow Builder</h1>
      <p className="app-intro">
        The form schema is data (see{' '}
        <code>features/form-renderer/exampleSchema.ts</code>) and this entire
        form is rendered from it. Nothing below is hand-authored JSX per field.
        Step state, branching, and validation are backed by a Zustand store
        scoped to this form instance (<code>features/workflow</code> +{' '}
        <code>features/validation</code>) — click a visited step above the form
        to jump back to it, or try entering &quot;USED&quot; in Promo code on
        step 2 to see the async check fail.
      </p>

      <FormRenderer schema={exampleFormSchema} controller={controller} />

      <section aria-label="Live form values" className="debug-panel">
        <h3>Live values (debug)</h3>
        <p className="debug-panel__summary">
          Dirty: {controller.isDirty ? 'yes' : 'no'} · Visited steps:{' '}
          {controller.visitedStepIndices.map((i) => i + 1).join(', ')}
          <Button
            type="button"
            variant="secondary"
            className="debug-panel__reset"
            onClick={controller.reset}
          >
            Start over
          </Button>
        </p>
        <div className="debug-panel__grid">
          <div>
            <h4>values</h4>
            <pre>{JSON.stringify(controller.values, null, 2)}</pre>
          </div>
          <div>
            <h4>touched</h4>
            <pre>{JSON.stringify(controller.touched, null, 2)}</pre>
          </div>
          <div>
            <h4>dirty</h4>
            <pre>{JSON.stringify(controller.dirty, null, 2)}</pre>
          </div>
          <div>
            <h4>asyncStatus</h4>
            <pre>{JSON.stringify(controller.asyncStatus, null, 2)}</pre>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
