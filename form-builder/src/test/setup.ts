import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Ensure a clean DOM between tests so per-field render assertions
// (see Phase 5 performance case study) stay isolated.
afterEach(() => {
  cleanup()
})

// jsdom has no ResizeObserver. @hello-pangea/dnd (Phase 4's builder
// canvas) reads it to measure draggables/droppables — component tests
// only need it to exist, not to report real sizes, since they drive the
// builder through its button-based affordances rather than simulating
// pointer drags (that's covered by Playwright E2E, in a real browser).
// The empty methods are the correct implementation of a do-nothing
// stub, not an oversight, hence the blanket disable below.
/* eslint-disable @typescript-eslint/no-empty-function */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
/* eslint-enable @typescript-eslint/no-empty-function */
globalThis.ResizeObserver = ResizeObserverStub

// jsdom also has no requestAnimationFrame, which @hello-pangea/dnd's
// sensors set up on mount regardless of whether a drag ever happens —
// without a stand-in, merely rendering the builder's DragDropContext in
// a component test throws.
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
    setTimeout(() => {
      callback(performance.now())
    }, 0)
  globalThis.cancelAnimationFrame = (handle: number) => {
    clearTimeout(handle)
  }
}
