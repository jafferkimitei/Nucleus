import type { ComponentType } from 'react'

import type { FieldType } from '@/types/schema'

import { CheckboxFieldControl } from './fields/CheckboxFieldControl'
import { NumberFieldControl } from './fields/NumberFieldControl'
import { RadioFieldControl } from './fields/RadioFieldControl'
import { SelectFieldControl } from './fields/SelectFieldControl'
import { TextareaFieldControl } from './fields/TextareaFieldControl'
import {
  DateFieldControl,
  EmailFieldControl,
  TextFieldControl,
} from './fields/TextLikeFieldControl'

import type { FieldControlProps } from './fields/types'

/**
 * The single place that maps a schema's `field.type` to the component
 * that renders it. This is the whole "metadata-driven" mechanism: nothing
 * upstream (Field.tsx, StepRenderer, FormRenderer) has a switch statement
 * over field types — they all just do `fieldRegistry[field.type]`. Adding
 * a new field type means adding one entry here (plus the control itself
 * under fields/) and nowhere else in the renderer.
 */
export const fieldRegistry: Record<
  FieldType,
  ComponentType<FieldControlProps>
> = {
  text: TextFieldControl,
  email: EmailFieldControl,
  date: DateFieldControl,
  number: NumberFieldControl,
  textarea: TextareaFieldControl,
  select: SelectFieldControl,
  radio: RadioFieldControl,
  checkbox: CheckboxFieldControl,
}
