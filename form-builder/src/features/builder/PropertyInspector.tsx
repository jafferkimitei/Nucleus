import { memo, useState } from 'react'

import type {
  AsyncValidationStatus,
  ConditionExpression,
  FieldSchema,
  FieldType,
  FieldValue,
  FormSchema,
  SelectOption,
  ValidationRule,
} from '@/types/schema'

import { FIELD_TYPE_META } from './fieldTypeMeta'
import { getRule, removeRuleType, upsertRule } from './validationRuleHelpers'

export interface PropertyInspectorProps {
  schema: FormSchema
  field: FieldSchema
  onUpdateField: (
    patch: Partial<Omit<FieldSchema, 'id' | 'name' | 'type'>>,
  ) => void
  onRenameField: (name: string) => boolean
  onChangeType: (type: FieldType) => void
  onSetValidation: (rules: ValidationRule[]) => void
  onClearVisibility: () => void
}

const STRING_RANGE_TYPES: FieldType[] = ['text', 'email', 'textarea', 'date']
const PLACEHOLDER_TYPES: FieldType[] = [
  'text',
  'email',
  'number',
  'textarea',
  'select',
  'date',
]
const CONDITION_OPERATORS: ConditionExpression['operator'][] = [
  'equals',
  'notEquals',
  'in',
  'notEmpty',
  'asyncStatus',
]
const ASYNC_STATUSES: AsyncValidationStatus[] = [
  'idle',
  'pending',
  'valid',
  'invalid',
]

/** The inspector's condition-value input is one text box regardless of
 * operator, so it needs to turn what the builder user typed back into a
 * `FieldValue`/`FieldValue[]` — "true"/"false" become booleans, anything
 * else that parses as a finite number becomes a number, everything else
 * stays a string. This is a heuristic, not a type-aware conversion (the
 * inspector doesn't know the referenced field's own value type), but it
 * covers the common cases (a select's string option, a checkbox's
 * boolean, a number field's number) without a full per-type UI. */
function parseConditionValue(raw: string): FieldValue {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw)
  return raw
}

function conditionValueToText(
  value: FieldValue | FieldValue[] | undefined,
): string {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return value === undefined || value === null ? '' : String(value)
}

/**
 * Edits everything about the selected field: identity (label/name/type),
 * content (placeholder/help text/options), validation rules, and its
 * `visibleWhen` condition. One file rather than the usual one-component
 * split — the sub-sections below are local, unexported components so
 * `react-refresh/only-export-components` doesn't flag the file (only
 * `PropertyInspector` is exported), and they're simple enough to not
 * need independent unit tests of their own; the composed behavior is
 * covered by PropertyInspector's own tests plus the builder E2E spec.
 */
function PropertyInspectorImpl({
  schema,
  field,
  onUpdateField,
  onRenameField,
  onChangeType,
  onSetValidation,
  onClearVisibility,
}: PropertyInspectorProps) {
  const [nameDraft, setNameDraft] = useState(field.name)
  const [nameError, setNameError] = useState<string | null>(null)
  // Tracks which field the draft/error above belong to. Selecting a
  // different field should reset both — not via useEffect (that's a
  // cascading extra render for something derivable during the render
  // that's already happening), but the same "adjust state during
  // render when a prop changes" pattern NumberFieldControl.tsx uses.
  const [trackedFieldId, setTrackedFieldId] = useState(field.id)
  if (field.id !== trackedFieldId) {
    setTrackedFieldId(field.id)
    setNameDraft(field.name)
    setNameError(null)
  }

  function commitName() {
    if (nameDraft.trim() === field.name) {
      setNameDraft(field.name)
      setNameError(null)
      return
    }
    const ok = onRenameField(nameDraft)
    setNameError(ok ? null : 'Must be non-empty and unique across the form.')
  }

  const usesPlaceholder = PLACEHOLDER_TYPES.includes(field.type)
  const usesOptions = field.type === 'select' || field.type === 'radio'
  const usesStringRange = STRING_RANGE_TYPES.includes(field.type)
  const usesNumberRange = field.type === 'number'

  const otherFields = schema.steps
    .flatMap((s) => s.fields)
    .filter((f) => f.id !== field.id)

  return (
    <div className="builder-inspector">
      <h3 className="builder-panel__title">Field properties</h3>

      <label className="builder-inspector__row">
        <span>Label</span>
        <input
          type="text"
          value={field.label}
          onChange={(event) => {
            onUpdateField({ label: event.target.value })
          }}
        />
      </label>

      <label className="builder-inspector__row">
        <span>Name (data key)</span>
        <input
          type="text"
          value={nameDraft}
          onChange={(event) => {
            setNameDraft(event.target.value)
          }}
          onBlur={commitName}
        />
        {nameError && (
          <span className="builder-inspector__error" role="alert">
            {nameError}
          </span>
        )}
      </label>

      <label className="builder-inspector__row">
        <span>Type</span>
        <select
          value={field.type}
          onChange={(event) => {
            onChangeType(event.target.value as FieldType)
          }}
        >
          {FIELD_TYPE_META.map((meta) => (
            <option key={meta.type} value={meta.type}>
              {meta.label}
            </option>
          ))}
        </select>
      </label>

      {usesPlaceholder && (
        <label className="builder-inspector__row">
          <span>Placeholder</span>
          <input
            type="text"
            value={field.placeholder ?? ''}
            onChange={(event) => {
              onUpdateField({ placeholder: event.target.value })
            }}
          />
        </label>
      )}

      <label className="builder-inspector__row">
        <span>Help text</span>
        <input
          type="text"
          value={field.helpText ?? ''}
          onChange={(event) => {
            onUpdateField({ helpText: event.target.value })
          }}
        />
      </label>

      {usesOptions && (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(options) => {
            onUpdateField({ options })
          }}
        />
      )}

      <fieldset className="builder-inspector__fieldset">
        <legend>Validation</legend>

        <label className="builder-inspector__checkbox">
          <input
            type="checkbox"
            checked={Boolean(getRule(field.validation, 'required'))}
            onChange={(event) => {
              onSetValidation(
                event.target.checked
                  ? upsertRule(field.validation, { type: 'required' })
                  : removeRuleType(field.validation, 'required'),
              )
            }}
          />
          Required
        </label>

        {usesStringRange && (
          <>
            <NumberRuleRow
              label="Min length"
              value={getRule(field.validation, 'minLength')?.value}
              onChange={(value) => {
                onSetValidation(
                  value === null
                    ? removeRuleType(field.validation, 'minLength')
                    : upsertRule(field.validation, {
                        type: 'minLength',
                        value,
                      }),
                )
              }}
            />
            <NumberRuleRow
              label="Max length"
              value={getRule(field.validation, 'maxLength')?.value}
              onChange={(value) => {
                onSetValidation(
                  value === null
                    ? removeRuleType(field.validation, 'maxLength')
                    : upsertRule(field.validation, {
                        type: 'maxLength',
                        value,
                      }),
                )
              }}
            />
            <label className="builder-inspector__row">
              <span>Pattern (regex)</span>
              <input
                type="text"
                value={getRule(field.validation, 'pattern')?.value ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  onSetValidation(
                    value === ''
                      ? removeRuleType(field.validation, 'pattern')
                      : upsertRule(field.validation, {
                          type: 'pattern',
                          value,
                        }),
                  )
                }}
              />
            </label>
          </>
        )}

        {usesNumberRange && (
          <>
            <NumberRuleRow
              label="Min"
              value={getRule(field.validation, 'min')?.value}
              onChange={(value) => {
                onSetValidation(
                  value === null
                    ? removeRuleType(field.validation, 'min')
                    : upsertRule(field.validation, { type: 'min', value }),
                )
              }}
            />
            <NumberRuleRow
              label="Max"
              value={getRule(field.validation, 'max')?.value}
              onChange={(value) => {
                onSetValidation(
                  value === null
                    ? removeRuleType(field.validation, 'max')
                    : upsertRule(field.validation, { type: 'max', value }),
                )
              }}
            />
          </>
        )}

        <AsyncRuleEditor
          rule={getRule(field.validation, 'async')}
          onChange={(rule) => {
            onSetValidation(
              rule
                ? upsertRule(field.validation, rule)
                : removeRuleType(field.validation, 'async'),
            )
          }}
        />
      </fieldset>

      <VisibilityEditor
        condition={field.visibleWhen}
        otherFields={otherFields}
        onSet={(condition) => {
          onUpdateField({ visibleWhen: condition })
        }}
        onClear={onClearVisibility}
      />
    </div>
  )
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: SelectOption[]
  onChange: (options: SelectOption[]) => void
}) {
  return (
    <div className="builder-inspector__row">
      <span>Options</span>
      <ul className="builder-inspector__options">
        {options.map((option, index) => (
          // Options have no stable id of their own; index as key is
          // fine since rows are never reordered independently of a
          // full-list replacement here (add/remove/edit all rebuild
          // the whole array via onChange).
          <li key={index} className="builder-inspector__option-row">
            <input
              type="text"
              aria-label={`Option ${String(index + 1)} label`}
              value={option.label}
              onChange={(event) => {
                const next = [...options]
                next[index] = { ...option, label: event.target.value }
                onChange(next)
              }}
            />
            <input
              type="text"
              aria-label={`Option ${String(index + 1)} value`}
              value={option.value}
              onChange={(event) => {
                const next = [...options]
                next[index] = { ...option, value: event.target.value }
                onChange(next)
              }}
            />
            <button
              type="button"
              aria-label={`Remove option ${String(index + 1)}`}
              onClick={() => {
                onChange(options.filter((_, i) => i !== index))
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          const n = options.length + 1
          onChange([
            ...options,
            { value: `option-${String(n)}`, label: `Option ${String(n)}` },
          ])
        }}
      >
        Add option
      </button>
    </div>
  )
}

function NumberRuleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | undefined
  onChange: (value: number | null) => void
}) {
  return (
    <label className="builder-inspector__row">
      <span>{label}</span>
      <input
        type="number"
        value={value ?? ''}
        onChange={(event) => {
          const raw = event.target.value
          onChange(raw === '' ? null : Number(raw))
        }}
      />
    </label>
  )
}

function AsyncRuleEditor({
  rule,
  onChange,
}: {
  rule: Extract<ValidationRule, { type: 'async' }> | undefined
  onChange: (rule: Extract<ValidationRule, { type: 'async' }> | null) => void
}) {
  return (
    <div className="builder-inspector__row">
      <span>Async check endpoint</span>
      <input
        type="text"
        placeholder="/api/check-something"
        value={rule?.endpoint ?? ''}
        onChange={(event) => {
          const endpoint = event.target.value
          onChange(
            endpoint === ''
              ? null
              : {
                  type: 'async',
                  endpoint,
                  ...(rule?.message ? { message: rule.message } : {}),
                },
          )
        }}
      />
      {rule && (
        <input
          type="text"
          placeholder="Error message if it comes back invalid"
          value={rule.message ?? ''}
          onChange={(event) => {
            const message = event.target.value
            onChange({
              type: 'async',
              endpoint: rule.endpoint,
              ...(message ? { message } : {}),
            })
          }}
        />
      )}
    </div>
  )
}

function VisibilityEditor({
  condition,
  otherFields,
  onSet,
  onClear,
}: {
  condition: ConditionExpression | undefined
  otherFields: FieldSchema[]
  onSet: (condition: ConditionExpression) => void
  onClear: () => void
}) {
  const isEnabled = condition !== undefined

  return (
    <fieldset className="builder-inspector__fieldset">
      <legend>Visibility</legend>
      <label className="builder-inspector__checkbox">
        <input
          type="checkbox"
          checked={isEnabled}
          disabled={otherFields.length === 0}
          onChange={(event) => {
            if (event.target.checked) {
              const target = otherFields[0]
              if (target) {
                onSet({ fieldName: target.name, operator: 'notEmpty' })
              }
            } else {
              onClear()
            }
          }}
        />
        Only show this field conditionally
      </label>

      {condition && (
        <>
          <label className="builder-inspector__row">
            <span>When field</span>
            <select
              value={condition.fieldName}
              onChange={(event) => {
                onSet({ ...condition, fieldName: event.target.value })
              }}
            >
              {otherFields.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.label || f.name}
                </option>
              ))}
            </select>
          </label>

          <label className="builder-inspector__row">
            <span>Operator</span>
            <select
              value={condition.operator}
              onChange={(event) => {
                const operator = event.target
                  .value as ConditionExpression['operator']
                onSet(
                  operator === 'notEmpty'
                    ? { fieldName: condition.fieldName, operator }
                    : {
                        fieldName: condition.fieldName,
                        operator,
                        value: operator === 'asyncStatus' ? 'valid' : '',
                      },
                )
              }}
            >
              {CONDITION_OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </label>

          {condition.operator === 'asyncStatus' && (
            <label className="builder-inspector__row">
              <span>Status equals</span>
              <select
                value={String(condition.value ?? 'valid')}
                onChange={(event) => {
                  onSet({ ...condition, value: event.target.value })
                }}
              >
                {ASYNC_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          )}

          {(condition.operator === 'equals' ||
            condition.operator === 'notEquals' ||
            condition.operator === 'in') && (
            <label className="builder-inspector__row">
              <span>
                {condition.operator === 'in'
                  ? 'Value(s), comma-separated'
                  : 'Value'}
              </span>
              <input
                type="text"
                value={conditionValueToText(condition.value)}
                onChange={(event) => {
                  const raw = event.target.value
                  onSet({
                    ...condition,
                    value:
                      condition.operator === 'in'
                        ? raw
                            .split(',')
                            .map((v) => parseConditionValue(v.trim()))
                        : parseConditionValue(raw),
                  })
                }}
              />
            </label>
          )}
        </>
      )}
    </fieldset>
  )
}

export const PropertyInspector = memo(PropertyInspectorImpl)
