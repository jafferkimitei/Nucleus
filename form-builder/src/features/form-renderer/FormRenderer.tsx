import { memo } from 'react'

import { Button } from '@/components/ui/Button'
import { isFieldVisible, maskUntouchedErrors } from '@/features/validation'
import type { FormController } from '@/features/workflow'
import type { FormSchema } from '@/types/schema'

import { StepRenderer } from './StepRenderer'

export interface FormRendererProps {
  schema: FormSchema
  controller: FormController
}

/**
 * The top-level "schema in, DOM out" component. Deliberately knows
 * nothing about *how* state is managed — it only calls the FormController
 * contract, so Phase 2 swapping the plain-useState stand-in for a
 * Zustand-backed controller was a one-line change at the call site
 * (`@/features/workflow` instead of `./useLocalFormController`), not a
 * rewrite of this component.
 */
function FormRendererImpl({ schema, controller }: FormRendererProps) {
  const {
    currentStepIndex,
    values,
    errors,
    touched,
    asyncStatus,
    visitedStepIndices,
    setFieldValue,
    setFieldTouched,
    goToNextStep,
    goToPreviousStep,
    goToStep,
  } = controller
  const step = schema.steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === schema.steps.length - 1

  if (!step) {
    return null
  }

  // The store keeps `errors` current for every field so `goToStep` can
  // gate on it, but a field only *displays* its error once it's been
  // touched — see maskUntouchedErrors's doc comment.
  const displayErrors = maskUntouchedErrors(errors, touched)

  // Next stays clickable even when the step is invalid — clicking it is
  // what reveals the errors (see goToStep) — but there's nothing useful
  // to reveal while an async check is still in flight, so it's disabled
  // just for that.
  const hasPendingAsyncCheck = step.fields.some(
    (field) =>
      isFieldVisible(field, values, asyncStatus) &&
      asyncStatus[field.name] === 'pending',
  )

  return (
    <div className="form">
      <header className="form__header">
        <h2 className="form__title">{schema.title}</h2>
        {schema.description && (
          <p className="form__description">{schema.description}</p>
        )}
        <ol className="form__progress" aria-label="Form steps">
          {schema.steps.map((s, index) => {
            const isCurrent = index === currentStepIndex
            const isVisited = visitedStepIndices.includes(index)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  className={
                    isCurrent
                      ? 'form__progress-step form__progress-step--current'
                      : 'form__progress-step'
                  }
                  disabled={!isVisited || isCurrent}
                  onClick={() => {
                    goToStep(index)
                  }}
                >
                  {s.title}
                </button>
              </li>
            )
          })}
        </ol>
      </header>

      <StepRenderer
        step={step}
        values={values}
        errors={displayErrors}
        asyncStatus={asyncStatus}
        onFieldChange={setFieldValue}
        onFieldBlur={setFieldTouched}
      />

      <div className="form__actions">
        <Button
          variant="secondary"
          onClick={goToPreviousStep}
          disabled={isFirstStep}
        >
          Back
        </Button>
        <Button
          onClick={goToNextStep}
          disabled={isLastStep || hasPendingAsyncCheck}
        >
          {hasPendingAsyncCheck ? 'Checking…' : 'Next'}
        </Button>
      </div>
    </div>
  )
}

export const FormRenderer = memo(FormRendererImpl)
