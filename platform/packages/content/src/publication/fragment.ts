import type { ContentBundle } from "../types/bundle.js";
import type { ContentSchemaVersion } from "../types/common.js";
import { CONTENT_SCHEMA_VERSION } from "../types/common.js";
import type { PublicationFragmentEnvelope } from "./metadata.js";

/** Stable fragment filenames under platform/content/published/. */
export const PUBLICATION_FRAGMENT_FILES = [
  "lesson-01.json",
  "lesson-02.json",
  "teacher-professions.json",
  "activities.json",
  "listening-assets.json",
] as const;

export type PublicationFragmentFile = (typeof PUBLICATION_FRAGMENT_FILES)[number];

export const PUBLICATION_FRAGMENT_IDS = [
  "lesson-01",
  "lesson-02",
  "teacher-professions",
  "activities",
  "listening-assets",
] as const;

export type PublicationFragmentId = (typeof PUBLICATION_FRAGMENT_IDS)[number];

export const FRAGMENT_FILE_TO_ID: Record<PublicationFragmentFile, PublicationFragmentId> = {
  "lesson-01.json": "lesson-01",
  "lesson-02.json": "lesson-02",
  "teacher-professions.json": "teacher-professions",
  "activities.json": "activities",
  "listening-assets.json": "listening-assets",
};

/**
 * Human-reviewable publication fragment. Owns a disjoint ID set;
 * merged by {@link mergePublicationFragments} into one ContentBundle.
 * `meta` may carry a publication metadata envelope (rows/mappings) that is
 * not copied into the ContentBundle.
 */
export type ContentFragment = {
  schemaVersion: ContentSchemaVersion;
  fragmentId: PublicationFragmentId;
  meta?: PublicationFragmentEnvelope;
} & Partial<
  Pick<
    ContentBundle,
    | "sources"
    | "sourceAssertions"
    | "mediaAssets"
    | "lessons"
    | "lexemes"
    | "verbs"
    | "grammarConcepts"
    | "phrasePatterns"
    | "qaPairs"
    | "dialogues"
    | "listeningAssets"
    | "collections"
    | "learningActivities"
    | "examples"
    | "relationships"
    | "contentGaps"
  >
>;

export const BUNDLE_ARRAY_KEYS = [
  "sources",
  "sourceAssertions",
  "mediaAssets",
  "lessons",
  "lexemes",
  "verbs",
  "grammarConcepts",
  "phrasePatterns",
  "qaPairs",
  "dialogues",
  "listeningAssets",
  "collections",
  "learningActivities",
  "examples",
  "relationships",
  "contentGaps",
] as const;

export type BundleArrayKey = (typeof BUNDLE_ARRAY_KEYS)[number];

export function emptyBundleSkeleton(
  label = "C1 merged publication bundle",
): ContentBundle {
  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    meta: { label, generatedFor: "publication" },
    sources: [],
    sourceAssertions: [],
    mediaAssets: [],
    lessons: [],
    lexemes: [],
    verbs: [],
    grammarConcepts: [],
    phrasePatterns: [],
    qaPairs: [],
    dialogues: [],
    listeningAssets: [],
    collections: [],
    learningActivities: [],
    examples: [],
    relationships: [],
    contentGaps: [],
  };
}
