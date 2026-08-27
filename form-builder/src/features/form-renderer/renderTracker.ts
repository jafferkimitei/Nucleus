/**
 * A per-field render counter, existing solely so the render-isolation
 * test can assert "this field's component function did not re-execute"
 * directly, instead of inferring it indirectly from DOM node identity
 * (which reconciliation can preserve even when a component *did*
 * re-render). Cheap enough (one object-key increment) to leave wired in
 * Field.tsx unconditionally rather than gating it behind an env check.
 */
export const fieldRenderCounts: Record<string, number> = {}

export function trackFieldRender(name: string): void {
  fieldRenderCounts[name] = (fieldRenderCounts[name] ?? 0) + 1
}

export function resetFieldRenderCounts(): void {
  for (const key of Object.keys(fieldRenderCounts)) {
    Reflect.deleteProperty(fieldRenderCounts, key)
  }
}
