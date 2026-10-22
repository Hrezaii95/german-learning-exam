/** Copy the digest before clearing all reusable Wasm state and encoded input. */
export function computeWithWipedMemory(memory: WebAssembly.Memory, password: Uint8Array, compute: () => Uint8Array): Uint8Array {
  try { return compute().slice(); }
  finally {
    password.fill(0);
    new Uint8Array(memory.buffer).fill(0);
  }
}
