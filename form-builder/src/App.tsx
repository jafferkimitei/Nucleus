import {
  exampleFormSchema,
  FormRenderer,
  useLocalFormController,
} from '@/features/form-renderer'

function App() {
  const controller = useLocalFormController(exampleFormSchema)

  return (
    <main>
      <h1>Form &amp; Workflow Builder</h1>
      <p className="app-intro">
        Phase 1: the form schema is data (see{' '}
        <code>features/form-renderer/exampleSchema.ts</code>) and this entire
        form is rendered from it. Nothing below is hand-authored JSX per field.
      </p>

      <FormRenderer schema={exampleFormSchema} controller={controller} />

      <section aria-label="Live form values" className="debug-panel">
        <h3>Live values (debug)</h3>
        <pre>{JSON.stringify(controller.values, null, 2)}</pre>
      </section>
    </main>
  )
}

export default App
