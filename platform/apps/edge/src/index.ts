// The Worker installs precompiled Wasm; portable route tests and the Node
// seed CLI use the independent hash-wasm implementation.
import "./auth/argon2-worker.js";
export { default } from "./app.js";
export type { Env } from "./app.js";
