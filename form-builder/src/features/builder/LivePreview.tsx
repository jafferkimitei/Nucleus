import { memo } from 'react'

import { FormRenderer } from '@/features/form-renderer'
import { useWorkflowFormController } from '@/features/workflow'
import type { FormSchema } from '@/types/schema'

/**
 * Proves the schema the builder produces is exactly what the runtime
 * (Phases 1-3) consumes: this mounts the real `FormRenderer` against a
 * real `useWorkflowFormController`, not a mock. `key`d by BuilderPage on
 * the store's `version` counter, so every edit remounts a fresh
 * controller — editing the schema mid-fill (renaming/removing the very
 * field the controller was tracking) has no well-defined "patch the
 * running session" behavior, so this deliberately doesn't try to
 * preserve one across edits.
 */
function LivePreviewImpl({ schema }: { schema: FormSchema }) {
  const controller = useWorkflowFormController(schema)
  return (
    <div className="builder-preview">
      <FormRenderer schema={schema} controller={controller} />
    </div>
  )
}

export const LivePreview = memo(LivePreviewImpl)
