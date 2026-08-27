import { memo } from 'react'

import { Button } from '@/components/ui/Button'
import type { FormSchema } from '@/types/schema'

import { StepRenderer } from './StepRenderer'

import type { FormController } from './useLocalFormController'

export interface FormRendererProps {
  schema: FormSchema
  controller: FormController
}

/**
 * The top-level "schema in, DOM out" component. Deliberately knows
 * nothing about *how* state is managed — it only calls the FormController
 * contract, so swapping useLocalFormController for the Zustand-backed
 * controller in Phase 2 is a one-line change at the call site, not a
 * rewrite of this component.
 */
function FormRendererImpl({ schema, controller }: FormRendererProps) {
  const {
    currentStepIndex,
    values,
    errors,
    setFieldValue,
    goToNextStep,
    goToPreviousStep,
  } = controller
  const step = schema.steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === schema.steps.length - 1

  if (!step) {
    return null
  }

  return (
    <div className="form">
      <header className="form__header">
        <h2 className="form__title">{schema.title}</h2>
        {schema.description && (
          <p className="form__description">{schema.description}</p>
        )}
        <ol className="form__progress" aria-label="Form steps">
          {schema.steps.map((s, index) => (
            <li
              key={s.id}
              aria-current={index === currentStepIndex ? 'step' : undefined}
              className={
                index === currentStepIndex
                  ? 'form__progress-step form__progress-step--current'
                  : 'form__progress-step'
              }
            >
              {s.title}
            </li>
          ))}
        </ol>
      </header>

      <StepRenderer
        step={step}
        values={values}
        errors={errors}
        onFieldChange={setFieldValue}
        onFieldBlur={undefined}
      />

      <div className="form__actions">
        <Button
          variant="secondary"
          onClick={goToPreviousStep}
          disabled={isFirstStep}
        >
          Back
        </Button>
        <Button onClick={goToNextStep} disabled={isLastStep}>
          Next
        </Button>
      </div>
    </div>
  )
}

export const FormRenderer = memo(FormRendererImpl)
