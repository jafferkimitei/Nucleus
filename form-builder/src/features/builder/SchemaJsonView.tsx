import { memo } from 'react'

import type { FormSchema } from '@/types/schema'

/**
 * The concrete "the layout and validation are just JSON" proof point —
 * this is the exact object LivePreview hands to FormRenderer, printed
 * rather than rendered. A read-only view: editing here isn't
 * round-tripped back into the builder store (no JSON parser/validator
 * for arbitrary hand-edited schemas exists yet), it's a demonstration
 * artifact, not an alternate editing surface.
 */
function SchemaJsonViewImpl({ schema }: { schema: FormSchema }) {
  return (
    <pre className="builder-json" aria-label="Form schema JSON">
      {JSON.stringify(schema, null, 2)}
    </pre>
  )
}

export const SchemaJsonView = memo(SchemaJsonViewImpl)
