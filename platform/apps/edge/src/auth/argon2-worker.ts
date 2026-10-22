import setupWasm from 'argon2id/lib/setup.js';
import simdModule from 'argon2id/dist/simd.wasm';
import scalarModule from 'argon2id/dist/no-simd.wasm';
import { configureArgon2 } from './argon2-runtime.js';
import { computeWithWipedMemory } from './wasm-memory.js';

// Workers instantiate uploaded modules; they cannot compile Wasm bytes. Cache
// one instance per isolate. The library clears only its utility prefix, so our
// wrapper clears the entire imported memory, including the Argon2 block state.
let computer: ReturnType<typeof setupWasm> | undefined;
let instanceMemory: WebAssembly.Memory | undefined;
async function load(module: WebAssembly.Module, imports: WebAssembly.Imports): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  const memory = imports.env?.memory;
  if (!(memory instanceof WebAssembly.Memory)) throw new Error('argon2_memory_unavailable');
  instanceMemory = memory;
  return { instance: await WebAssembly.instantiate(module, imports), module };
}
configureArgon2(async (password, salt, parameters) => {
  computer ??= setupWasm(imports => load(simdModule, imports), imports => load(scalarModule, imports));
  const compute = await computer;
  if (!instanceMemory) throw new Error('argon2_memory_unavailable');
  const encoded = new TextEncoder().encode(password);
  return computeWithWipedMemory(instanceMemory, encoded, () => compute({ password: encoded, salt,
    parallelism: parameters.parallelism, passes: parameters.iterations, memorySize: parameters.memoryKiB, tagLength: parameters.hashLength }));
});
