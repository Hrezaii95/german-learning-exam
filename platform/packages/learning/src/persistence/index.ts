/**
 * Versioned learner-state persistence, export/import, and storage adapters (C2D / C2DR1 / C2DR2 / C2DR3).
 */

export { PersistenceError, persistenceError } from "./errors.js";
export type { PersistenceErrorCode } from "./errors.js";

export { PERSISTENCE_LIMITS } from "./limits.js";
export type { PersistenceLimits } from "./limits.js";

export {
  DEFAULT_LEARNER_SETTINGS,
  EXPECTED_CONTENT_BUNDLE_SCHEMA_VERSION,
  LEARNER_BUILT_IN_TAGS,
  LEARNER_STATE_SCHEMA_VERSION,
} from "./types.js";
export type {
  ContentBundleIdentity,
  CreateEmptyLearnerStateInput,
  LearnerBuiltInTag,
  LearnerExportMetadata,
  LearnerNoteRecord,
  LearnerSettings,
  LearnerStateEnvelope,
  LearnerStateHydration,
  LearnerStateSchemaVersion,
  LearnerTagRecord,
  PublishedContentEntityKind,
  PublishedContentResolver,
  PublishedIdResolver,
  RecordingMetadata,
  ResumeState,
} from "./types.js";

export {
  canonicalizeValue,
  serializeCanonicalLearnerState,
  sortEnvelopeEntities,
  toCanonicalPlainObject,
} from "./canonicalize.js";

export {
  assertValidationContext,
  createEmptyLearnerState,
  parseLearnerStateEnvelope,
  parseLearnerStateJson,
  utf8ByteLength,
} from "./validate.js";
export type { ParseLearnerStateOptions } from "./validate.js";
// ValidatedLearnerState intentionally not re-exported (opaque internal brand).

export {
  createMigrationRegistry,
  defaultMigrationRegistry,
} from "./migrate.js";
export type { LearnerStateMigration, MigrationRegistry } from "./migrate.js";

export {
  LEARNER_STATE_STORAGE_KEY,
  createInMemoryLearnerStateAdapter,
  createKeyValueLearnerStateAdapter,
  revalidateStoredEnvelope,
} from "./adapters.js";
export type {
  BrowserLikeKeyValueStore,
  InMemoryAdapterOptions,
  KeyValueAdapterOptions,
  LearnerStateStorageAdapter,
  LearnerStateValidationContext,
} from "./adapters.js";

export {
  hydrateLearnerState,
  loadAndHydrateLearnerState,
  selectDueReviewCards,
} from "./hydrate.js";
export type { HydrateOptions } from "./hydrate.js";
// hydrateValidatedLearnerState intentionally not re-exported.

export {
  exportLearnerStateJson,
  importLearnerStateJson,
} from "./io.js";
export type {
  ExportLearnerStateOptions,
  ImportLearnerStateOptions,
} from "./io.js";
