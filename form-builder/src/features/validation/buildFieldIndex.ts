import type { FieldSchema, FormSchema } from '@/types/schema'

export interface FieldIndex {
  /** Every field in the schema, keyed by its `name`. */
  fieldsByName: Map<string, FieldSchema>
  /** For a given field name, every field whose `visibleWhen.fieldName`
   * points at it - i.e. "who needs re-checking when this field changes."
   * Built once per schema rather than re-scanned on every change, since
   * a schema-driven form's field count only grows with what the builder
   * (Phase 4) lets someone author, not with how often they type. */
  dependentsByFieldName: Map<string, FieldSchema[]>
}

export function buildFieldIndex(schema: FormSchema): FieldIndex {
  const fieldsByName = new Map<string, FieldSchema>()
  const dependentsByFieldName = new Map<string, FieldSchema[]>()

  for (const step of schema.steps) {
    for (const field of step.fields) {
      fieldsByName.set(field.name, field)
    }
  }

  for (const step of schema.steps) {
    for (const field of step.fields) {
      const dependsOn = field.visibleWhen?.fieldName
      if (!dependsOn) {
        continue
      }
      const dependents = dependentsByFieldName.get(dependsOn) ?? []
      dependents.push(field)
      dependentsByFieldName.set(dependsOn, dependents)
    }
  }

  return { fieldsByName, dependentsByFieldName }
}
