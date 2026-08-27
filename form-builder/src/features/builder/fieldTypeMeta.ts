import type { FieldSchema, FieldType, SelectOption } from '@/types/schema'

/**
 * Everything the palette and the property inspector need to know about a
 * field type that isn't already in `FieldSchema` itself: what to call it
 * for a non-technical builder user, and what a freshly-dragged-in field
 * of that type should look like by default. Adding a `FieldType` means
 * adding a case in `fieldRegistry.tsx` (Phase 1), the validation engine
 * if the type needs special handling (Phase 3 — none currently do), and
 * an entry here so the builder can offer it. Nowhere else changes.
 */
export interface FieldTypeMeta {
  type: FieldType
  label: string
  /** Short description shown in the palette as a hint, not persisted. */
  description: string
}

export const FIELD_TYPE_META: FieldTypeMeta[] = [
  { type: 'text', label: 'Text', description: 'A single line of text' },
  { type: 'email', label: 'Email', description: 'Text validated as email' },
  { type: 'number', label: 'Number', description: 'Numeric input' },
  { type: 'textarea', label: 'Paragraph', description: 'Multi-line text' },
  { type: 'select', label: 'Dropdown', description: 'Choose one from a list' },
  {
    type: 'radio',
    label: 'Radio group',
    description: 'Choose one, all visible',
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    description: 'A single yes/no toggle',
  },
  { type: 'date', label: 'Date', description: 'A calendar date' },
]

const FIELD_TYPE_LABEL = new Map(
  FIELD_TYPE_META.map((meta) => [meta.type, meta.label]),
)

export function labelForFieldType(type: FieldType): string {
  return FIELD_TYPE_LABEL.get(type) ?? type
}

/** `palette-<type>` draggable ids so BuilderPage's onDragEnd can recover
 * the field type being dragged in from `result.draggableId` without a
 * lookup table — the id *is* the type, prefixed to stay out of the way
 * of canvas fields' own (UUID) draggable ids. */
export function paletteDraggableId(type: FieldType): string {
  return `palette-${type}`
}

/** `select`/`radio` need at least one option to render meaningfully —
 * seed two generic ones so a freshly-added field previews as something
 * real instead of an empty control the builder user has to guess at.
 * Exported so `changeFieldType` can re-derive `options` when switching a
 * field's type, not just when first creating one. */
export function defaultOptionsFor(type: FieldType): SelectOption[] | undefined {
  if (type !== 'select' && type !== 'radio') {
    return undefined
  }
  return [
    { value: 'option-1', label: 'Option 1' },
    { value: 'option-2', label: 'Option 2' },
  ]
}

/**
 * Builds a new field of `type` with a unique `id`/`name` (supplied by
 * the caller — the builder store owns id/name allocation so it can
 * guarantee uniqueness across the whole schema, not just this factory)
 * and reasonable defaults for everything else.
 */
export function createDefaultField(
  type: FieldType,
  id: string,
  name: string,
): FieldSchema {
  const options = defaultOptionsFor(type)
  return {
    id,
    name,
    type,
    label: labelForFieldType(type),
    // `exactOptionalPropertyTypes` treats an explicit `options: undefined`
    // as different from the key being absent — spread it in only when
    // there's something to put there.
    ...(options ? { options } : {}),
  }
}
