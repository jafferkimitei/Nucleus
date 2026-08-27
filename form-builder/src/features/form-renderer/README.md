# features/form-renderer

The metadata-driven renderer: given a `FormSchema`, renders the current
step's fields via a field-type registry (text, number, select, checkbox,
radio, date, ...). No business logic beyond "schema in, DOM out." Lands in
Phase 1.
