import {
  applyBackup, BACKUP_KEYS, createCompleteBackup, parseBackup,
  type BackupStore, type CompleteBackup, type ImportedBackup,
} from "../study/backup";
import { createWortwerkStore, wortwerkStore, type WortwerkBackup, type WortwerkStore } from "./store";

export type WortwerkCompleteBackup = {
  format: "german-learning-wortwerk";
  version: 1;
  exportedAt: string;
  legacy: CompleteBackup;
  wortwerk: WortwerkBackup;
};
export type ImportedWortwerkBackup = {
  legacy: ImportedBackup;
  wortwerk?: WortwerkBackup;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function memoryStore(): BackupStore {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
  };
}

/** Reuse the existing validators without writing to the learner's browser storage. */
function validateLegacy(value: unknown): ImportedBackup {
  if (!record(value)) throw new Error("The learning section is invalid.");
  const selected: ImportedBackup = {};
  for (const key of ["learner", "study", "scope"] as const) {
    if (!Object.hasOwn(value, key)) continue;
    if (!record(value[key])) throw new Error(`The ${key} backup section is invalid.`);
  }
  const staging = memoryStore();
  applyBackup(staging, value as ImportedBackup);
  const normalised = createCompleteBackup(staging);
  if (Object.hasOwn(value, "learner")) selected.learner = normalised.learner;
  if (Object.hasOwn(value, "study")) selected.study = normalised.study;
  if (Object.hasOwn(value, "scope")) selected.scope = normalised.scope;
  return selected;
}

function validateWortwerk(value: unknown, current?: WortwerkBackup): WortwerkBackup {
  // An explicit isolated storage prevents fallback to browser localStorage.
  const staging = createWortwerkStore(memoryStore());
  if (current) staging.restoreBackup(current);
  staging.restoreBackup(value);
  return staging.exportBackup();
}

/** Combined export using the existing backup validators and serializer unchanged. */
export function createWortwerkCompleteBackup(
  legacyStorage: BackupStore, wortwerk: WortwerkStore = wortwerkStore,
): WortwerkCompleteBackup {
  return {
    format: "german-learning-wortwerk", version: 1, exportedAt: new Date().toISOString(),
    legacy: createCompleteBackup(legacyStorage), wortwerk: wortwerk.exportBackup(),
  };
}

/** Accept the combined format and every format already accepted by the study backup. */
export function parseWortwerkBackup(text: string): ImportedWortwerkBackup {
  if (new TextEncoder().encode(text).byteLength > 20_000_000) throw new Error("This backup exceeds 20 MB.");
  const value: unknown = JSON.parse(text);
  if (!record(value)) throw new Error("This is not a learning backup.");
  if (value.format !== "german-learning-wortwerk") return { legacy: parseBackup(text) };
  if (value.version !== 1 || !Object.hasOwn(value, "legacy") || !Object.hasOwn(value, "wortwerk")) {
    throw new Error("Unsupported or incomplete Wortwerk backup.");
  }
  return {
    legacy: parseBackup(JSON.stringify(value.legacy)),
    wortwerk: validateWortwerk(value.wortwerk),
  };
}

/** Validate both histories before any write. Restoring events merges rather than deleting newer answers. */
export function applyWortwerkBackup(
  legacyStorage: BackupStore, incoming: ImportedWortwerkBackup, wortwerk: WortwerkStore = wortwerkStore,
): void {
  if (!record(incoming)) throw new Error("This is not a learning backup.");
  const legacy = validateLegacy(incoming.legacy);
  const game = incoming.wortwerk === undefined ? undefined : validateWortwerk(incoming.wortwerk, wortwerk.exportBackup());
  const previous = new Map<string, string | null>();
  try { for (const key of BACKUP_KEYS) previous.set(key, legacyStorage.getItem(key)); }
  catch { throw new Error("The backup could not be read from browser storage. No data was changed."); }

  applyBackup(legacyStorage, legacy);
  try {
    if (game) wortwerk.restoreBackup(game);
  } catch {
    let restored = true;
    for (const [key, old] of previous) {
      try {
        if (old === null) legacyStorage.removeItem(key);
        else legacyStorage.setItem(key, old);
      } catch { restored = false; }
    }
    throw new Error(restored
      ? "Wortwerk import could not be applied. Your previous learning data was preserved."
      : "Storage failed during recovery. Keep your backup file and restore again when browser storage is available.");
  }
}
