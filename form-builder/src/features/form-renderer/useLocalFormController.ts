import { useCallback, useMemo, useState } from 'react'

import type { FieldValue, FormSchema } from '@/types/schema'

/**
 * The contract FormRenderer needs from "whatever is managing form state."
 * `useLocalFormController` below is Phase 1's implementation - plain
 * `useState`, no persistence, no branching, no validation. Phase 2
 * replaces it with a Zustand-backed hook (multi-step branching,
 * dirty/touched tracking) that returns this exact same shape, so
 * FormRenderer/StepRenderer/Field don't change at all when that lands.
 * `errors` is always `{}` here - Phase 3 is what populates it.
 */
export interface FormController {
  currentStepIndex: number
  values: Record<string, FieldValue>
  errors: Record<string, string | undefined>
  setFieldValue: (name: string, value: FieldValue) => void
  goToNextStep: () => void
  goToPreviousStep: () => void
}

function initialValuesFor(schema: FormSchema): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {}
  for (const step of schema.steps) {
    for (const field of step.fields) {
      values[field.name] = field.defaultValue ?? null
    }
  }
  return values
}

export function useLocalFormController(schema: FormSchema): FormController {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [values, setValues] = useState(() => initialValuesFor(schema))
  const lastStepIndex = schema.steps.length - 1

  const setFieldValue = useCallback((name: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const goToNextStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, lastStepIndex))
  }, [lastStepIndex])

  const goToPreviousStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0))
  }, [])

  const errors = useMemo<Record<string, string | undefined>>(() => ({}), [])

  return {
    currentStepIndex,
    values,
    errors,
    setFieldValue,
    goToNextStep,
    goToPreviousStep,
  }
}
