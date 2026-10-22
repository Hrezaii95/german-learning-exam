// Test-only workerd entry. Never routed from the production Worker.
import "../src/auth/argon2-worker.js";
import { deriveArgon2 } from "../src/auth/argon2-runtime.js";
export default { async fetch(): Promise<Response> {
  const timings: number[] = [];
  let digest = "";
  for (let index = 0; index < 4; index++) {
    const start = performance.now();
    const bytes = await deriveArgon2("public interoperability vector", new Uint8Array(16).fill(7));
    timings.push(performance.now() - start);
    digest = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  }
  return Response.json({ timings, digest, parameters: { m: 19456, t: 2, p: 1 } });
} };
