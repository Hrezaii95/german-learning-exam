/** One password contract for Workers and the local seed process. */
export interface Argon2Parameters { memoryKiB: number; iterations: number; parallelism: number; hashLength: number }
export const CURRENT_ARGON2_PARAMETERS: Readonly<Argon2Parameters> = Object.freeze({ memoryKiB: 19456, iterations: 2, parallelism: 1, hashLength: 32 });
export type Argon2Computer = (password: string, salt: Uint8Array, parameters: Readonly<Argon2Parameters>) => Promise<Uint8Array>;
let workerComputer: Argon2Computer | undefined;

/** The Worker installs a precompiled Wasm loader; Node uses hash-wasm. */
export function configureArgon2(computer?: Argon2Computer): void { workerComputer = computer; }

export async function deriveArgon2(password: string, salt: Uint8Array, parameters: Readonly<Argon2Parameters> = CURRENT_ARGON2_PARAMETERS): Promise<Uint8Array> {
  // Bounded legacy verification is explicit: PHC strings never choose arbitrary
  // memory, time, threads or digest lengths. New hashes always use current costs.
  if (![8192, 19456].includes(parameters.memoryKiB) || ![1, 2].includes(parameters.iterations) || parameters.parallelism !== 1 || parameters.hashLength !== 32) throw new Error('unsupported_argon2_parameters');
  if (workerComputer) return workerComputer(password, salt, parameters);
  const { argon2id } = await import('hash-wasm');
  return argon2id({ password, salt, memorySize: parameters.memoryKiB, iterations: parameters.iterations,
    parallelism: parameters.parallelism, hashLength: parameters.hashLength, outputType: 'binary' });
}
