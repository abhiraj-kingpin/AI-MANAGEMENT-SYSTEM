const NodeEnvironment = require('jest-environment-node').TestEnvironment;

/**
 * Jest's `node` test environment runs each test file inside its own VM
 * context — a real, separate JavaScript realm with its own intrinsics,
 * including its own `Float32Array` constructor, distinct from the actual
 * Node process's. `onnxruntime-node`'s native Tensor validation does a
 * strict `instanceof Float32Array` check against the *outer* process's
 * realm (it's a native addon, loaded once into the real process, not
 * re-evaluated per Jest sandbox) — so a `Float32Array` constructed inside
 * a normal Jest test file fails that check even though the exact same code
 * runs correctly outside Jest. Confirmed manually via a standalone `node
 * -e` script, and documented as a Jest-maintainer "closed as not planned"
 * limitation (jestjs/jest#11864), not something this project can fix
 * upstream.
 *
 * This environment (scoped to faceEmbedding.provider.test.ts only, via
 * that file's `@jest-environment` docblock — every other test file keeps
 * Jest's normal default) rebinds the sandbox's typed-array constructors to
 * the real process's own, so both sides of onnxruntime-node's check agree.
 * Production never runs inside a Jest sandbox at all (`node dist/server.js`
 * is a real process too) — this makes the test *more* accurate to
 * production, not a hack papering over a real bug.
 */
class RealGlobalsNodeEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    this.global.Float32Array = Float32Array;
    this.global.Float64Array = Float64Array;
    this.global.Uint8Array = Uint8Array;
    this.global.ArrayBuffer = ArrayBuffer;
  }
}

module.exports = RealGlobalsNodeEnvironment;
