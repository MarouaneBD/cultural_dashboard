/**
 * Polyfill Web Fetch API globals for jsdom environment.
 * jsdom does not include the Fetch API; Next.js `next/server` requires it.
 * Node 18+ provides Request/Response/Headers/fetch globally; we copy them into
 * the jsdom realm here, which runs before any module imports.
 */

// Polyfill TextEncoder / TextDecoder — next/server internals (e.g. URL parsing,
// cookie handling) rely on these; jsdom does not expose them on globalThis.
import { TextEncoder, TextDecoder } from 'util'
if (typeof (globalThis as Record<string, unknown>).TextEncoder === 'undefined') {
  ;(globalThis as Record<string, unknown>).TextEncoder = TextEncoder
  ;(globalThis as Record<string, unknown>).TextDecoder = TextDecoder
}

// Access outer Node.js globals (they exist at this point regardless of jsdom)
const nodeGlobal = global as Record<string, unknown>

if (!nodeGlobal.Request) {
  // Nothing to do — shouldn't happen on Node 18+
} else {
  ;(globalThis as Record<string, unknown>).Request = nodeGlobal.Request
  ;(globalThis as Record<string, unknown>).Response = nodeGlobal.Response
  ;(globalThis as Record<string, unknown>).Headers = nodeGlobal.Headers
  ;(globalThis as Record<string, unknown>).fetch = nodeGlobal.fetch
}
