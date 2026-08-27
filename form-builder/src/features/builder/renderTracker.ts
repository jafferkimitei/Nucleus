/**
 * Same purpose as form-renderer/renderTracker.ts, one level coarser: a
 * per-*component* (not per-field) render counter, so the Phase 5
 * render-isolation test can assert "FieldPalette's component function
 * did not re-execute" directly instead of inferring it from DOM
 * behavior. See BuilderPage.tsx's doc comment on its memoized handlers
 * for the mechanism this is guarding.
 */
export const builderRenderCounts: Record<string, number> = {}

export function trackBuilderRender(name: string): void {
  builderRenderCounts[name] = (builderRenderCounts[name] ?? 0) + 1
}

export function resetBuilderRenderCounts(): void {
  for (const key of Object.keys(builderRenderCounts)) {
    Reflect.deleteProperty(builderRenderCounts, key)
  }
}
