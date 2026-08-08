/**
 * Versioned export / transactional import (C2D / C2DR1 / C2DR2).
 * Export: deep-clone → validate detached clone → canonicalize/serialize.
 * Never freezes or mutates caller-owned objects.
 * Import: parse → migrate → validate → replay → one replace.
 * Failures leave adapter state unchanged.
 * Learner-facing import does not accept per-call migration registries.
 */

import { isIsoTimestampWithTimezone } from "../mastery/events.js";
import type { LearnerStateStorageAdapter } from "./adapters.js";
import { serializeCanonicalLearnerState } from "./canonicalize.js";
import { PersistenceError, persistenceError } from "./errors.js";
import {
  hydrateValidatedLearnerState,
  type HydrateOptions,
} from "./hydrate.js";
import { PERSISTENCE_LIMITS } from "./limits.js";
import { defaultMigrationRegistry } from "./migrate.js";
import type {
  ContentBundleIdentity,
  LearnerExportMetadata,
  LearnerStateEnvelope,
  LearnerStateHydration,
  PublishedContentResolver,
} from "./types.js";
import { LEARNER_STATE_SCHEMA_VERSION } from "./types.js";
import {
  assertValidationContext,
  deepClonePlain,
  parseLearnerStateEnvelope,
  utf8ByteLength,
} from "./validate.js";

export type ExportLearnerStateOptions = {
  /** Injected export timestamp (ISO-8601 with timezone). */
  readonly exportedAt: string;
  readonly publishedIds: PublishedContentResolver;
  readonly expectedContentBundle: ContentBundleIdentity;
};

/**
 * Export one consistent snapshot as deterministic canonical JSON.
 * Deep-clones caller state first, validates the detached clone completely,
 * then canonicalizes. Never freezes or mutates caller-owned objects.
 * Injects export metadata; excludes raw audio bytes (declared in metadata).
 */
export function exportLearnerStateJson(
  state: LearnerStateEnvelope,
  options: ExportLearnerStateOptions,
): string {
  assertValidationContext(options);

  if (!isIsoTimestampWithTimezone(options.exportedAt)) {
    throw persistenceError(
      "INVALID_DATE",
      "exportedAt must be ISO-8601 with timezone",
      "exportedAt",
    );
  }

  const clone = deepClonePlain(state) as Record<string, unknown>;
  const exportMeta: LearnerExportMetadata = {
    exportedAt: options.exportedAt,
    includesRawAudioBytes: false,
    schemaVersion: LEARNER_STATE_SCHEMA_VERSION,
  };
  clone.exportMeta = exportMeta;

  const parseOpts = {
    publishedIds: options.publishedIds,
    expectedContentBundle: options.expectedContentBundle,
  };

  // Full validation of the detached clone (unknown/secret/derived/unpublished/…).
  const validated = parseLearnerStateEnvelope(clone, parseOpts);

  // Ensure recordings never carry bytes (type system + runtime guard).
  for (const r of validated.recordings) {
    if (r.pronunciationAccuracy !== null) {
      throw persistenceError(
        "INVALID_RECORDING",
        "pronunciationAccuracy must be null on export",
        "recordings",
      );
    }
    if ("audioBytes" in (r as object)) {
      throw persistenceError(
        "SECRET_OR_BLOB_FORBIDDEN",
        "Raw audio bytes excluded from export",
        "recordings",
      );
    }
  }
  return serializeCanonicalLearnerState(validated);
}

export type ImportLearnerStateOptions = {
  readonly publishedIds: PublishedContentResolver;
  readonly expectedContentBundle: ContentBundleIdentity;
  readonly now: Date;
  readonly masteryPolicy?: HydrateOptions["masteryPolicy"];
};

/**
 * Transactional import: fully validate + hydrate before a single adapter.replace.
 * Uses the default (composition-trusted) migration registry only — no per-import
 * arbitrary migration code execution on the learner-facing API.
 * Any failure leaves existing adapter state unchanged.
 */
export async function importLearnerStateJson(
  adapter: LearnerStateStorageAdapter,
  jsonText: string,
  options: ImportLearnerStateOptions,
): Promise<LearnerStateHydration> {
  assertValidationContext(options);

  if (typeof jsonText !== "string") {
    throw persistenceError("INVALID_TYPE", "JSON text must be a string", "json");
  }
  if (utf8ByteLength(jsonText) > PERSISTENCE_LIMITS.maxJsonBytes) {
    throw persistenceError(
      "OVERSIZE_JSON",
      "Import JSON exceeds maxJsonBytes",
      "json",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch (err) {
    if (err instanceof PersistenceError) throw err;
    throw persistenceError("INVALID_JSON", "Import JSON is not valid JSON", "json");
  }

  const parseOpts = {
    publishedIds: options.publishedIds,
    expectedContentBundle: options.expectedContentBundle,
  };

  // Migrate (identity for current) + revalidate before any storage write.
  const state = defaultMigrationRegistry.migrateToCurrent(parsed, parseOpts);

  const hydration = hydrateValidatedLearnerState(state, {
    now: options.now,
    ...(options.masteryPolicy !== undefined
      ? { masteryPolicy: options.masteryPolicy }
      : {}),
  });

  // Single atomic replace after complete success (adapter re-validates).
  await adapter.replace(hydration.state);
  return hydration;
}
