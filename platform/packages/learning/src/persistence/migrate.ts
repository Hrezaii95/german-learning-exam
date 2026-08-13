/**
 * Explicit version-to-version migration registry (C2D / C2DR1).
 * Current version identity is supported. Unknown versions fail closed.
 * Do not invent silently lossy historical migrations.
 * Migration output is always revalidated.
 */

import { PersistenceError, persistenceError } from "./errors.js";
import {
  LEARNER_STATE_SCHEMA_VERSION,
  type LearnerStateSchemaVersion,
} from "./types.js";
import {
  parseLearnerStateEnvelope,
  type ParseLearnerStateOptions,
  type ValidatedLearnerState,
} from "./validate.js";

/**
 * Pure, bounded migration step. Output must be revalidated before storage.
 */
export type LearnerStateMigration = {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly migrate: (raw: unknown) => unknown;
};

export type MigrationRegistry = {
  readonly currentVersion: LearnerStateSchemaVersion;
  readonly migrations: readonly LearnerStateMigration[];
  /**
   * Walk version-to-version until current, then revalidate.
   * Identity when already at current version.
   */
  migrateToCurrent(
    raw: unknown,
    options: ParseLearnerStateOptions,
  ): ValidatedLearnerState;
};

function readSchemaVersion(raw: unknown): string {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw persistenceError(
      "INVALID_TYPE",
      "Migration source must be an object",
      "schemaVersion",
    );
  }
  const v = (raw as Record<string, unknown>).schemaVersion;
  if (typeof v !== "string" || v.length === 0) {
    throw persistenceError(
      "INVALID_SCHEMA_VERSION",
      "Missing schemaVersion for migration",
      "schemaVersion",
    );
  }
  return v;
}

/**
 * Build a registry. Only registers provided migrations; current identity always works.
 * Intended for trusted application composition — not per-import learner-facing options.
 */
export function createMigrationRegistry(
  migrations: readonly LearnerStateMigration[] = [],
): MigrationRegistry {
  // Validate migration chain edges are unique from→to pairs.
  const edgeKeys = new Set<string>();
  for (const m of migrations) {
    if (m.fromVersion === m.toVersion) {
      throw persistenceError(
        "MIGRATION_FAILED",
        "Migration fromVersion must differ from toVersion",
      );
    }
    const key = `${m.fromVersion}->${m.toVersion}`;
    if (edgeKeys.has(key)) {
      throw persistenceError(
        "MIGRATION_FAILED",
        "Duplicate migration edge",
      );
    }
    edgeKeys.add(key);
  }

  const byFrom = new Map<string, LearnerStateMigration>();
  for (const m of migrations) {
    if (byFrom.has(m.fromVersion)) {
      throw persistenceError(
        "MIGRATION_FAILED",
        "Ambiguous migration fromVersion",
      );
    }
    byFrom.set(m.fromVersion, m);
  }

  return {
    currentVersion: LEARNER_STATE_SCHEMA_VERSION,
    migrations,
    migrateToCurrent(raw, options) {
      let current = raw;
      let version = readSchemaVersion(current);
      const visited = new Set<string>();
      const maxSteps = migrations.length + 1;

      for (let step = 0; step <= maxSteps; step++) {
        if (version === LEARNER_STATE_SCHEMA_VERSION) {
          // Always revalidate migration output (identity included).
          return parseLearnerStateEnvelope(current, options);
        }
        if (visited.has(version)) {
          throw persistenceError(
            "MIGRATION_FAILED",
            "Migration cycle detected",
            "schemaVersion",
          );
        }
        visited.add(version);
        const edge = byFrom.get(version);
        if (edge === undefined) {
          throw persistenceError(
            "UNSUPPORTED_VERSION",
            "Unsupported learner-state schemaVersion",
            "schemaVersion",
          );
        }
        try {
          current = edge.migrate(current);
        } catch (err) {
          if (err instanceof PersistenceError) throw err;
          throw persistenceError(
            "MIGRATION_FAILED",
            "Migration step failed",
            "schemaVersion",
          );
        }
        version = readSchemaVersion(current);
        if (version !== edge.toVersion) {
          throw persistenceError(
            "MIGRATION_FAILED",
            "Migration did not produce declared toVersion",
            "schemaVersion",
          );
        }
      }

      throw persistenceError(
        "MIGRATION_FAILED",
        "Migration exceeded bounded step limit",
        "schemaVersion",
      );
    },
  };
}

const v1ToV11: LearnerStateMigration = Object.freeze({
  fromVersion: "1.0.0",
  toVersion: LEARNER_STATE_SCHEMA_VERSION,
  migrate(raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw persistenceError("MIGRATION_FAILED", "Legacy learner state must be an object");
    }
    const source = raw as Record<string, unknown>;
    if ("activityProgress" in source) {
      throw persistenceError("MIGRATION_FAILED", "Legacy learner state contains a future field");
    }
    const exportMeta = source.exportMeta;
    return {
      ...source,
      schemaVersion: LEARNER_STATE_SCHEMA_VERSION,
      activityProgress: [],
      ...(exportMeta !== null && typeof exportMeta === "object" && !Array.isArray(exportMeta)
        ? { exportMeta: { ...(exportMeta as Record<string, unknown>), schemaVersion: LEARNER_STATE_SCHEMA_VERSION } }
        : {}),
    };
  },
});

/** Default registry includes the lossless v1 navigation-state migration. */
export const defaultMigrationRegistry: MigrationRegistry =
  createMigrationRegistry([v1ToV11]);
