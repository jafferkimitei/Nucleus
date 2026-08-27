/**
 * The store always keeps `errors` current for every field (that's what
 * gates step advancement - see createFormStore's `goToStep`), but showing
 * a red error under a field the user hasn't reached yet reads as the form
 * scolding them before they've done anything. FormRenderer masks errors
 * through this before handing them to StepRenderer: a field only
 * displays its error once it's been touched (blurred, or advancement was
 * attempted and the store touched it on the caller's behalf).
 */
export function maskUntouchedErrors(
  errors: Record<string, string | undefined>,
  touched: Record<string, boolean>,
): Record<string, string | undefined> {
  const visible: Record<string, string | undefined> = {}
  for (const name of Object.keys(errors)) {
    visible[name] = touched[name] ? errors[name] : undefined
  }
  return visible
}
