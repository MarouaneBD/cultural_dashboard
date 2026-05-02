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
    // Replace jsdom's FormData/Blob with Node's native implementations so that
    // NextRequest.formData() receives a proper multipart Content-Type with boundary.
    // jsdom's FormData does not set the boundary header, causing next/server to throw.
    this.global.FormData = globalThis.FormData
    this.global.Blob = globalThis.Blob
  }
}

module.exports = FetchJSDOMEnvironment
