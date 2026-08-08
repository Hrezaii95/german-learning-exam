/**
 * Pinned non-published authority projection for workbook audio mappings.
 * Derived from content/source-index/alpha-workbook-audio-map.json without
 * original source paths or MP3 file copies.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { issue, type ValidationIssue } from "../validation/errors.js";
import type { PublicationWorkbookMapping } from "./metadata.js";

export const AUTHORITY_WORKBOOK_PROJECTION_FILE =
  "workbook-audio-map.projection.json" as const;

export type WorkbookAuthorityMapping = {
  sourceAudioId: string;
  filename: string;
  sha256: string;
  lessonId: string;
  exercise: string;
  durationSeconds: number;
  status: string;
};

export type WorkbookAuthorityProjection = {
  schemaVersion: number;
  derivedFrom: string;
  sourcePack: string;
  publicBundleStatus: string;
  trackCount: number;
  mappings: WorkbookAuthorityMapping[];
};

export type SourceAudioMapTrack = {
  sourceAudioId: string;
  originalPath?: string;
  filename: string;
  durationSeconds: number;
  sha256: string;
  lessonId: string;
  exercise: string;
  purpose?: string;
  evidence?: string[];
  status: string;
};

export type SourceAudioMap = {
  schemaVersion?: number;
  sourcePack?: string;
  publicBundleStatus?: string;
  trackCount?: number;
  tracks: SourceAudioMapTrack[];
};

/** Project authority mappings without originalPath or any path-like MP3 fields. */
export function projectWorkbookAuthority(
  audioMap: SourceAudioMap,
  derivedFrom = "content/source-index/alpha-workbook-audio-map.json",
): WorkbookAuthorityProjection {
  return {
    schemaVersion: 1,
    derivedFrom,
    sourcePack: audioMap.sourcePack ?? "unknown",
    publicBundleStatus: audioMap.publicBundleStatus ?? "unknown",
    trackCount: audioMap.tracks.length,
    mappings: audioMap.tracks.map((t) => ({
      sourceAudioId: t.sourceAudioId,
      filename: t.filename,
      sha256: t.sha256,
      lessonId: t.lessonId,
      exercise: t.exercise,
      durationSeconds: t.durationSeconds,
      status: t.status,
    })),
  };
}

export function resolveAuthorityProjectionPath(publishedDir: string): string {
  return join(dirname(publishedDir), "authority", AUTHORITY_WORKBOOK_PROJECTION_FILE);
}

export function loadWorkbookAuthorityProjection(
  path: string,
): WorkbookAuthorityProjection | null {
  const loaded = loadAndValidateWorkbookAuthorityProjection(path);
  return loaded.authority;
}

export type LoadAuthorityResult = {
  ok: boolean;
  authority: WorkbookAuthorityProjection | null;
  issues: ValidationIssue[];
};

/**
 * Fail-closed authority loader: missing, unreadable, or structurally invalid
 * projections yield stable PUBLICATION_AUTHORITY errors (never silent null skip).
 */
export function loadAndValidateWorkbookAuthorityProjection(
  path: string,
): LoadAuthorityResult {
  if (!existsSync(path)) {
    return {
      ok: false,
      authority: null,
      issues: [
        issue(
          "PUBLICATION_AUTHORITY",
          `Workbook authority projection is missing`,
          { field: AUTHORITY_WORKBOOK_PROJECTION_FILE },
        ),
      ],
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {
      ok: false,
      authority: null,
      issues: [
        issue(
          "PUBLICATION_AUTHORITY",
          `Workbook authority projection JSON could not be parsed`,
          { field: AUTHORITY_WORKBOOK_PROJECTION_FILE },
        ),
      ],
    };
  }

  const structural = validateWorkbookAuthorityProjectionShape(raw);
  if (!structural.ok || !structural.authority) {
    return structural;
  }

  const forbidden = collectForbiddenMp3PathStrings(structural.authority);
  if (forbidden.length > 0) {
    return {
      ok: false,
      authority: null,
      issues: [
        issue(
          "PUBLICATION_AUTHORITY",
          `Workbook authority projection contains forbidden MP3 path/URL strings`,
          { field: AUTHORITY_WORKBOOK_PROJECTION_FILE },
        ),
      ],
    };
  }

  return structural;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Structural validation for the pinned workbook authority projection. */
export function validateWorkbookAuthorityProjectionShape(
  raw: unknown,
): LoadAuthorityResult {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      authority: null,
      issues: [
        issue(
          "PUBLICATION_AUTHORITY",
          `Workbook authority projection root must be an object`,
          { field: AUTHORITY_WORKBOOK_PROJECTION_FILE },
        ),
      ],
    };
  }

  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== 1) {
    return {
      ok: false,
      authority: null,
      issues: [
        issue(
          "PUBLICATION_AUTHORITY",
          `Workbook authority projection schemaVersion must be 1`,
          { field: "authority.schemaVersion" },
        ),
      ],
    };
  }
  if (!Array.isArray(obj.mappings)) {
    return {
      ok: false,
      authority: null,
      issues: [
        issue(
          "PUBLICATION_AUTHORITY",
          `Workbook authority projection mappings must be an array`,
          { field: "authority.mappings" },
        ),
      ],
    };
  }
  if (typeof obj.trackCount !== "number" || !Number.isInteger(obj.trackCount)) {
    return {
      ok: false,
      authority: null,
      issues: [
        issue(
          "PUBLICATION_AUTHORITY",
          `Workbook authority projection trackCount must be an integer`,
          { field: "authority.trackCount" },
        ),
      ],
    };
  }
  if (
    !isNonEmptyString(obj.derivedFrom) ||
    !isNonEmptyString(obj.sourcePack) ||
    !isNonEmptyString(obj.publicBundleStatus)
  ) {
    return {
      ok: false,
      authority: null,
      issues: [
        issue(
          "PUBLICATION_AUTHORITY",
          `Workbook authority projection is missing required string fields`,
          { field: AUTHORITY_WORKBOOK_PROJECTION_FILE },
        ),
      ],
    };
  }

  const mappings: WorkbookAuthorityMapping[] = [];
  for (let i = 0; i < obj.mappings.length; i++) {
    const entry = obj.mappings[i];
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
      return {
        ok: false,
        authority: null,
        issues: [
          issue(
            "PUBLICATION_AUTHORITY",
            `Workbook authority mapping must be an object`,
            { field: `authority.mappings[${i}]` },
          ),
        ],
      };
    }
    const m = entry as Record<string, unknown>;
    if (
      !isNonEmptyString(m.sourceAudioId) ||
      !isNonEmptyString(m.filename) ||
      !isNonEmptyString(m.sha256) ||
      !isNonEmptyString(m.lessonId) ||
      !isNonEmptyString(m.exercise) ||
      !isNonEmptyString(m.status) ||
      typeof m.durationSeconds !== "number"
    ) {
      return {
        ok: false,
        authority: null,
        issues: [
          issue(
            "PUBLICATION_AUTHORITY",
            `Workbook authority mapping has invalid or incomplete fields`,
            { field: `authority.mappings[${i}]` },
          ),
        ],
      };
    }
    mappings.push({
      sourceAudioId: m.sourceAudioId,
      filename: m.filename,
      sha256: m.sha256,
      lessonId: m.lessonId,
      exercise: m.exercise,
      durationSeconds: m.durationSeconds,
      status: m.status,
    });
  }

  const authority: WorkbookAuthorityProjection = {
    schemaVersion: 1,
    derivedFrom: obj.derivedFrom,
    sourcePack: obj.sourcePack,
    publicBundleStatus: obj.publicBundleStatus,
    trackCount: obj.trackCount,
    mappings,
  };

  return { ok: true, authority, issues: [] };
}

/**
 * Compare publication workbook mapping projections to the pinned authority set.
 * Does not echo private original paths (authority never carries them).
 */
export function compareWorkbookMappingsToAuthority(
  mappings: PublicationWorkbookMapping[],
  authority: WorkbookAuthorityProjection,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (authority.mappings.length !== 15 || authority.trackCount !== 15) {
    issues.push(
      issue(
        "PUBLICATION_GATE",
        `Authority workbook projection must contain exactly 15 mappings`,
        { field: "authority.mappings" },
      ),
    );
  }

  if (mappings.length !== authority.mappings.length) {
    issues.push(
      issue(
        "PUBLICATION_GATE",
        `Workbook mapping count must match authority projection`,
        { field: "meta.workbookMappings" },
      ),
    );
  }

  const byAudioId = new Map(
    authority.mappings.map((m) => [m.sourceAudioId, m] as const),
  );

  for (const mapping of mappings) {
    const auth = byAudioId.get(mapping.sourceAudioId);
    if (!auth) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Workbook mapping sourceAudioId not present in authority projection`,
          { objectId: mapping.id, field: "meta.workbookMappings.sourceAudioId" },
        ),
      );
      continue;
    }
    if (mapping.filename !== auth.filename) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Workbook mapping filename disagrees with authority projection`,
          { objectId: mapping.id, field: "meta.workbookMappings.filename" },
        ),
      );
    }
    if ((mapping.exerciseRef ?? "") !== auth.exercise) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Workbook mapping exerciseRef disagrees with authority projection`,
          { objectId: mapping.id, field: "meta.workbookMappings.exerciseRef" },
        ),
      );
    }
  }

  const publishedIds = new Set(mappings.map((m) => m.sourceAudioId));
  for (const auth of authority.mappings) {
    if (!publishedIds.has(auth.sourceAudioId)) {
      issues.push(
        issue(
          "PUBLICATION_GATE",
          `Authority mapping missing from publication workbook metadata`,
          {
            objectId: auth.sourceAudioId,
            field: "meta.workbookMappings",
          },
        ),
      );
    }
  }

  return issues;
}

/** True when any authority mapping still embeds a forbidden path-like MP3 string. */
export function authorityContainsForbiddenMp3Paths(
  authority: WorkbookAuthorityProjection,
): string[] {
  const hits: string[] = [];
  const walk = (value: unknown, path: string): void => {
    if (typeof value === "string") {
      if (isForbiddenMp3PathString(value)) hits.push(`${path}:${value}`);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        walk(v, path ? `${path}.${k}` : k);
      }
    }
  };
  walk(authority, "");
  return hits;
}

/**
 * Forbidden MP3 path/URL strings (shared with publication package scan).
 * Bare filenames like `track.mp3` are allowed; path/URL forms are not.
 * Exact `rights-gated:` scheme references are exempt.
 */
export function isForbiddenMp3PathString(value: string): boolean {
  if (/^rights-gated:/i.test(value)) return false;
  const normalized = value.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  if (!lower.includes(".mp3")) return false;

  // Strip query/fragment for path-component checks.
  const pathOnly = normalized.split(/[?#]/, 1)[0] ?? normalized;
  const pathLower = pathOnly.toLowerCase();

  if (
    pathLower.startsWith("http://") ||
    pathLower.startsWith("https://") ||
    pathLower.startsWith("file:")
  ) {
    return pathLower.includes(".mp3");
  }

  if (/^[a-zA-Z]:\//.test(pathOnly)) return pathLower.endsWith(".mp3");
  if (pathOnly.includes("/") && pathLower.endsWith(".mp3")) return true;
  if (value.includes("\\") && pathLower.endsWith(".mp3")) return true;
  if ((value.includes("?") || value.includes("#")) && pathLower.endsWith(".mp3")) {
    return true;
  }
  return false;
}

export function collectForbiddenMp3PathStrings(
  value: unknown,
  path = "",
): string[] {
  const hits: string[] = [];
  if (typeof value === "string") {
    if (isForbiddenMp3PathString(value)) hits.push(path ? `${path}=${value}` : value);
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      hits.push(...collectForbiddenMp3PathStrings(v, `${path}[${i}]`));
    });
    return hits;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const next = path ? `${path}.${k}` : k;
      hits.push(...collectForbiddenMp3PathStrings(v, next));
    }
  }
  return hits;
}
