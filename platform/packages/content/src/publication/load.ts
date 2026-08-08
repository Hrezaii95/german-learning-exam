import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContentBundle } from "../types/bundle.js";
import {
  issue,
  resultFromIssues,
  type ValidationIssue,
  type ValidationResult,
} from "../validation/errors.js";
import { CONTENT_SCHEMA_VERSION } from "../types/common.js";
import {
  AUTHORITY_WORKBOOK_PROJECTION_FILE,
  loadAndValidateWorkbookAuthorityProjection,
  resolveAuthorityProjectionPath,
  validateWorkbookAuthorityProjectionShape,
  type WorkbookAuthorityProjection,
} from "./authority.js";
import {
  FRAGMENT_FILE_TO_ID,
  PUBLICATION_FRAGMENT_FILES,
  type ContentFragment,
  type PublicationFragmentFile,
} from "./fragment.js";
import { validatePublicationCountGates } from "./gates.js";
import { mergePublicationFragments, validatePublicationFragments } from "./merge.js";

export type PublicationFragmentPath = {
  fileName: PublicationFragmentFile;
  path: string;
};

export type LoadPublicationOptions = {
  /** Directory containing the five required fragment filenames. */
  publishedDir?: string;
  /** Explicit absolute/relative paths for the five required fragments (order = PUBLICATION_FRAGMENT_FILES). */
  fragmentPaths?: string[];
  /**
   * Explicit path to workbook-audio-map.projection.json.
   * Required for fragmentPaths validation unless allowMissingAuthorityForTests is set.
   */
  authorityPath?: string;
  /** Preloaded authority projection (still structurally validated). */
  authority?: WorkbookAuthorityProjection;
  /**
   * Fixture/test-only opt-out: skip authority requirement and comparison.
   * Production CLI must never set this.
   */
  allowMissingAuthorityForTests?: boolean;
};

function resolveFragmentPaths(options: LoadPublicationOptions): PublicationFragmentPath[] {
  if (options.fragmentPaths != null) {
    if (options.fragmentPaths.length !== PUBLICATION_FRAGMENT_FILES.length) {
      throw new Error(
        `Expected exactly ${PUBLICATION_FRAGMENT_FILES.length} fragment paths, got ${options.fragmentPaths.length}`,
      );
    }
    const explicit = options.fragmentPaths;
    return PUBLICATION_FRAGMENT_FILES.map((fileName, i) => {
      const path = explicit[i];
      if (typeof path !== "string" || path.length === 0) {
        throw new Error(`Fragment path missing at index ${i} for ${fileName}`);
      }
      return { fileName, path };
    });
  }
  if (options.publishedDir == null || options.publishedDir.length === 0) {
    throw new Error("publishedDir or fragmentPaths is required");
  }
  return PUBLICATION_FRAGMENT_FILES.map((fileName) => ({
    fileName,
    path: join(options.publishedDir!, fileName),
  }));
}

export type LoadFragmentsResult = {
  ok: boolean;
  fragments: ContentFragment[];
  issues: ValidationIssue[];
  paths: PublicationFragmentPath[];
};

/**
 * Deterministic loader for the five required publication fragment paths.
 * Missing files yield stable MISSING_FRAGMENT diagnostics (no thrown ENOENT).
 */
export function loadPublicationFragments(
  options: LoadPublicationOptions,
): LoadFragmentsResult {
  const paths = resolveFragmentPaths(options);
  const issues: ValidationIssue[] = [];
  const fragments: ContentFragment[] = [];

  for (const entry of paths) {
    const expectedId = FRAGMENT_FILE_TO_ID[entry.fileName];
    if (!existsSync(entry.path)) {
      issues.push(
        issue("MISSING_FRAGMENT", `Missing required publication fragment file`, {
          objectId: expectedId,
          field: entry.fileName,
        }),
      );
      continue;
    }

    let json: unknown;
    try {
      const raw = readFileSync(entry.path, "utf8");
      json = JSON.parse(raw);
    } catch {
      issues.push(
        issue("INVALID_JSON", `Fragment JSON could not be parsed`, {
          objectId: expectedId,
          field: entry.fileName,
        }),
      );
      continue;
    }

    if (json == null || typeof json !== "object" || Array.isArray(json)) {
      issues.push(
        issue("INVALID_TYPE", `Fragment root must be an object`, {
          objectId: expectedId,
          field: entry.fileName,
        }),
      );
      continue;
    }

    const fragment = json as ContentFragment;
    if (fragment.fragmentId !== expectedId) {
      issues.push(
        issue(
          "INVALID_DISCRIMINANT",
          `Fragment fragmentId must be ${expectedId}`,
          {
            objectId: typeof fragment.fragmentId === "string" ? fragment.fragmentId : expectedId,
            field: "fragmentId",
          },
        ),
      );
      continue;
    }
    if (fragment.schemaVersion !== CONTENT_SCHEMA_VERSION) {
      issues.push(
        issue("SCHEMA_VERSION", `Fragment schemaVersion must be ${CONTENT_SCHEMA_VERSION}`, {
          objectId: expectedId,
          field: "schemaVersion",
        }),
      );
      continue;
    }

    fragments.push(fragment);
  }

  return {
    ok: !issues.some((i) => i.severity === "error"),
    fragments,
    issues,
    paths,
  };
}

/** Convenience: load all fragments from a published directory. */
export function loadAllPublicationFragments(publishedDir: string): ContentFragment[] {
  const loaded = loadPublicationFragments({ publishedDir });
  if (!loaded.ok) {
    const summary = loaded.issues
      .map((i) => `${i.code}@${i.objectId ?? ""}:${i.field ?? ""}`)
      .join("; ");
    throw new Error(`Publication fragment load failed: ${summary}`);
  }
  return loaded.fragments;
}

export function loadAndMergePublicationBundle(publishedDir: string): {
  fragments: ContentFragment[];
  bundle: ContentBundle;
} {
  const loaded = loadPublicationFragments({ publishedDir });
  if (!loaded.ok) {
    const summary = loaded.issues
      .map((i) => `${i.code}@${i.objectId ?? ""}:${i.field ?? ""}`)
      .join("; ");
    throw new Error(`Publication fragment load failed: ${summary}`);
  }
  const merged = mergePublicationFragments(loaded.fragments);
  if (!merged.ok || !merged.bundle) {
    const summary = merged.issues
      .map((i) => `${i.code}@${i.objectId ?? ""}:${i.field ?? ""}`)
      .join("; ");
    throw new Error(`Publication merge failed: ${summary}`);
  }
  return { fragments: loaded.fragments, bundle: merged.bundle };
}

export type ValidatePublicationResult = ValidationResult & {
  bundle: ContentBundle | null;
  fragments: ContentFragment[];
  paths: PublicationFragmentPath[];
  authority: WorkbookAuthorityProjection | null;
};

/**
 * Resolve workbook authority fail-closed unless the deliberate test-only opt-out is set.
 * publishedDir defaults to the sibling content/authority projection; fragmentPaths
 * require an explicit authorityPath (or preloaded authority).
 */
export function resolvePublicationAuthority(
  opts: LoadPublicationOptions,
): {
  authority: WorkbookAuthorityProjection | null;
  issues: ValidationIssue[];
} {
  if (opts.allowMissingAuthorityForTests === true) {
    if (opts.authority != null) {
      const shape = validateWorkbookAuthorityProjectionShape(opts.authority);
      return { authority: shape.authority, issues: shape.issues };
    }
    if (opts.authorityPath != null && opts.authorityPath.length > 0) {
      const loaded = loadAndValidateWorkbookAuthorityProjection(opts.authorityPath);
      return { authority: loaded.authority, issues: loaded.issues };
    }
    return { authority: null, issues: [] };
  }

  if (opts.authority != null) {
    const shape = validateWorkbookAuthorityProjectionShape(opts.authority);
    if (!shape.ok || !shape.authority) {
      return {
        authority: null,
        issues:
          shape.issues.length > 0
            ? shape.issues
            : [
                issue(
                  "PUBLICATION_AUTHORITY",
                  `Workbook authority projection is invalid`,
                  { field: AUTHORITY_WORKBOOK_PROJECTION_FILE },
                ),
              ],
      };
    }
    return { authority: shape.authority, issues: [] };
  }

  const authorityPath =
    opts.authorityPath != null && opts.authorityPath.length > 0
      ? opts.authorityPath
      : opts.publishedDir != null && opts.publishedDir.length > 0
        ? resolveAuthorityProjectionPath(opts.publishedDir)
        : null;

  if (authorityPath == null) {
    return {
      authority: null,
      issues: [
        issue(
          "PUBLICATION_AUTHORITY",
          `Workbook authority projection path was not supplied`,
          { field: AUTHORITY_WORKBOOK_PROJECTION_FILE },
        ),
      ],
    };
  }

  const loaded = loadAndValidateWorkbookAuthorityProjection(authorityPath);
  if (!loaded.ok || !loaded.authority) {
    return {
      authority: null,
      issues:
        loaded.issues.length > 0
          ? loaded.issues
          : [
              issue(
                "PUBLICATION_AUTHORITY",
                `Workbook authority projection is missing or invalid`,
                { field: AUTHORITY_WORKBOOK_PROJECTION_FILE },
              ),
            ],
    };
  }
  return { authority: loaded.authority, issues: [] };
}

/**
 * Load → merge (duplicate IDs rejected before normal validation) → ContentBundle
 * validators → publication count gates (authority required fail-closed by default).
 */
export function loadAndValidatePublication(
  options: LoadPublicationOptions | string,
): ValidatePublicationResult {
  const opts: LoadPublicationOptions =
    typeof options === "string" ? { publishedDir: options } : options;

  const authorityResolved = resolvePublicationAuthority(opts);
  const authority = authorityResolved.authority;
  const authorityIssues = authorityResolved.issues;

  const loaded = loadPublicationFragments(opts);
  if (!loaded.ok) {
    return {
      ...resultFromIssues([...authorityIssues, ...loaded.issues]),
      bundle: null,
      fragments: loaded.fragments,
      paths: loaded.paths,
      authority,
    };
  }

  const validated = validatePublicationFragments(loaded.fragments);
  if (!validated.ok || !validated.bundle) {
    const issues = [...authorityIssues, ...validated.issues];
    return {
      ...resultFromIssues(issues),
      bundle: validated.bundle,
      fragments: loaded.fragments,
      paths: loaded.paths,
      authority,
    };
  }

  const gates = validatePublicationCountGates(validated.bundle, loaded.fragments, {
    authority,
    // Authority fail-closed is resolved above; avoid duplicate PUBLICATION_AUTHORITY.
    requireAuthority: false,
  });
  const issues = [...authorityIssues, ...validated.issues, ...gates.issues];
  const result = resultFromIssues(issues);
  return {
    ...result,
    bundle: validated.bundle,
    fragments: loaded.fragments,
    paths: loaded.paths,
    authority,
  };
}
