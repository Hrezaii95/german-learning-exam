/**
 * Learner-state storage adapters (C2D / C2DR1 / C2DR2).
 * Replace semantics: full overwrite — never silently merge.
 * Validation context is mandatory; load/replace always validate.
 * No direct window access; inject browser-like key-value store.
 */

import { serializeCanonicalLearnerState } from "./canonicalize.js";
import { persistenceError } from "./errors.js";
import { defaultMigrationRegistry, type MigrationRegistry } from "./migrate.js";
import type {
  ContentBundleIdentity,
  LearnerStateEnvelope,
  PublishedContentResolver,
} from "./types.js";
import { PERSISTENCE_LIMITS } from "./limits.js";
import {
  assertValidationContext,
  deepFreeze,
  parseLearnerStateEnvelope,
  utf8ByteLength,
} from "./validate.js";

export const LEARNER_STATE_STORAGE_KEY =
  "german-learning:learner-state:v1" as const;

/**
 * Async storage boundary. `replace` fully overwrites prior state (no merge).
 */
export type LearnerStateStorageAdapter = {
  load(): Promise<LearnerStateEnvelope | null>;
  /** Full replace — never merges events/cards/notes/tags. */
  replace(state: LearnerStateEnvelope): Promise<void>;
  clear(): Promise<void>;
};

/**
 * Browser-like key-value store (e.g. localStorage). Injected — no window access.
 */
export type BrowserLikeKeyValueStore = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
};

/** Mandatory validation context for production adapters. */
export type LearnerStateValidationContext = {
  readonly publishedIds: PublishedContentResolver;
  readonly expectedContentBundle: ContentBundleIdentity;
  /**
   * Composition-time migration registry only (trusted app wiring).
   * Defaults to identity-only defaultMigrationRegistry.
   */
  readonly migrationRegistry?: MigrationRegistry;
};

export type KeyValueAdapterOptions = LearnerStateValidationContext & {
  readonly store: BrowserLikeKeyValueStore;
  readonly key?: string;
};

export type InMemoryAdapterOptions = LearnerStateValidationContext;

function requireAdapterContext(
  options: LearnerStateValidationContext,
): {
  publishedIds: PublishedContentResolver;
  expectedContentBundle: ContentBundleIdentity;
  migrationRegistry: MigrationRegistry;
} {
  assertValidationContext(options);
  return {
    publishedIds: options.publishedIds,
    expectedContentBundle: options.expectedContentBundle,
    migrationRegistry: options.migrationRegistry ?? defaultMigrationRegistry,
  };
}

function parseOpts(ctx: {
  publishedIds: PublishedContentResolver;
  expectedContentBundle: ContentBundleIdentity;
}) {
  return {
    publishedIds: ctx.publishedIds,
    expectedContentBundle: ctx.expectedContentBundle,
  };
}

function cloneFreeze(state: LearnerStateEnvelope): LearnerStateEnvelope {
  const plain = JSON.parse(serializeCanonicalLearnerState(state)) as unknown;
  return deepFreeze(plain as LearnerStateEnvelope);
}

/**
 * Load path: UTF-8 byte cap → JSON.parse → migrate → revalidate.
 * Never cast/freeze raw parsed data.
 */
function loadFromJsonText(
  raw: string,
  ctx: {
    publishedIds: PublishedContentResolver;
    expectedContentBundle: ContentBundleIdentity;
    migrationRegistry: MigrationRegistry;
  },
): LearnerStateEnvelope {
  if (typeof raw !== "string") {
    throw persistenceError(
      "STORAGE_FAILURE",
      "Stored learner state must be a string",
      "storage",
    );
  }
  if (utf8ByteLength(raw) > PERSISTENCE_LIMITS.maxJsonBytes) {
    throw persistenceError(
      "OVERSIZE_JSON",
      "Stored learner state exceeds maxJsonBytes",
      "json",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw persistenceError(
      "INVALID_JSON",
      "Stored learner state is not valid JSON",
      "storage",
    );
  }
  return ctx.migrationRegistry.migrateToCurrent(parsed, parseOpts(ctx));
}

/**
 * Immutable in-memory adapter. Validation context is mandatory.
 */
export function createInMemoryLearnerStateAdapter(
  options: InMemoryAdapterOptions,
): LearnerStateStorageAdapter {
  const ctx = requireAdapterContext(options);
  let storedJson: string | null = null;

  return {
    async load() {
      if (storedJson === null) return null;
      return loadFromJsonText(storedJson, ctx);
    },
    async replace(state) {
      if (state === null || typeof state !== "object") {
        throw persistenceError(
          "INVALID_TYPE",
          "replace requires a LearnerStateEnvelope",
          "state",
        );
      }
      // Fully validate before any write; failure leaves prior state unchanged.
      const validated = parseLearnerStateEnvelope(state, parseOpts(ctx));
      const frozen = cloneFreeze(validated);
      storedJson = serializeCanonicalLearnerState(frozen);
    },
    async clear() {
      storedJson = null;
    },
  };
}

/**
 * Production-usable adapter over an injected browser-like key-value store.
 * Persists canonical JSON. Copy/freeze on read/write. Always validates.
 */
export function createKeyValueLearnerStateAdapter(
  options: KeyValueAdapterOptions,
): LearnerStateStorageAdapter {
  const ctx = requireAdapterContext(options);
  const key = options.key ?? LEARNER_STATE_STORAGE_KEY;
  const store = options.store;
  if (store === null || typeof store !== "object") {
    throw persistenceError(
      "REQUIRED_FIELD",
      "Key-value store is required",
      "store",
    );
  }

  return {
    async load() {
      let raw: string | null;
      try {
        raw = await store.getItem(key);
      } catch {
        throw persistenceError(
          "STORAGE_FAILURE",
          "Key-value getItem failed",
          "storage",
        );
      }
      if (raw === null) return null;
      if (typeof raw !== "string") {
        throw persistenceError(
          "STORAGE_FAILURE",
          "Key-value getItem returned non-string",
          "storage",
        );
      }
      return loadFromJsonText(raw, ctx);
    },
    async replace(state) {
      if (state === null || typeof state !== "object") {
        throw persistenceError(
          "INVALID_TYPE",
          "replace requires a LearnerStateEnvelope",
          "state",
        );
      }
      // Fully validate before any write; failure leaves prior state unchanged.
      const validated = parseLearnerStateEnvelope(state, parseOpts(ctx));
      const frozen = cloneFreeze(validated);
      const json = serializeCanonicalLearnerState(frozen);
      try {
        await store.setItem(key, json);
      } catch {
        throw persistenceError(
          "STORAGE_FAILURE",
          "Key-value setItem failed",
          "storage",
        );
      }
    },
    async clear() {
      try {
        await store.removeItem(key);
      } catch {
        throw persistenceError(
          "STORAGE_FAILURE",
          "Key-value removeItem failed",
          "storage",
        );
      }
    },
  };
}

/**
 * Re-parse a trusted envelope through the validator.
 */
export function revalidateStoredEnvelope(
  state: LearnerStateEnvelope,
  publishedIds: PublishedContentResolver,
  expectedContentBundle: ContentBundleIdentity,
): LearnerStateEnvelope {
  return parseLearnerStateEnvelope(state, {
    publishedIds,
    expectedContentBundle,
  });
}
