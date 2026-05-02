/**
 * Custom Jest environment that extends jsdom with Web Fetch API globals.
 * Node 18+ provides Request/Response/Headers natively; jsdom does not.
 * next/server requires these globals to load successfully.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JSDOMEnvironment = require('jest-environment-jsdom').default

class FetchJSDOMEnvironment extends JSDOMEnvironment {
  async setup() {
    await super.setup()
    // Inject Node's native Fetch API into the jsdom global VM context
    if (typeof this.global.Request === 'undefined') {
      this.global.Request = globalThis.Request
      this.global.Response = globalThis.Response
      this.global.Headers = globalThis.Headers
      this.global.fetch = globalThis.fetch
    }
  }
}

module.exports = FetchJSDOMEnvironment
