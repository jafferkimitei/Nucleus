# store

Zustand store definitions and selector hooks. Selectors are the
performance boundary described in the Phase 5 case study: components
subscribe to a single field's slice so typing in one field doesn't
re-render the rest of the canvas.
