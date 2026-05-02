import '@testing-library/jest-dom'

// Polyfill Web Fetch API globals missing from jsdom (needed by next/server in tests)
// Node 18+ exposes these on `globalThis` in a normal context, but jsdom sandboxes
// the global — so we re-inject them from the module scope where they ARE available.
if (typeof globalThis.Request === 'undefined') {
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore – accessing outer Node globals from inside jsdom realm
  const g = global as Record<string, unknown>
  // These are available on the outer Node process (Node 18+) even inside jsdom
  // because ts-jest evaluates jest.setup.ts before the jsdom realm is sealed.
  ;(globalThis as Record<string, unknown>).Request = g.Request
  ;(globalThis as Record<string, unknown>).Response = g.Response
  ;(globalThis as Record<string, unknown>).Headers = g.Headers
  ;(globalThis as Record<string, unknown>).fetch = g.fetch
}
