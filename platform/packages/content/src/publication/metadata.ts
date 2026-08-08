/**
 * Fragment-specific publication metadata envelope.
 * Carries teacher row / workbook mapping records without widening ContentBundle.
 */

import { issue, type ValidationIssue } from "../validation/errors.js";

export type PublicationTeacherSourceRow = {
  /** Teacher list row number (expected coverage 1–48). */
  sourceRow: number;
  /** Canonical subject pointer; must resolve to a Lexeme. */
  subjectId: string;
};

/**
 * Rights-gated workbook audio mapping metadata.
 * Must not embed or expose a public publisher MP3 path.
 */
export type PublicationWorkbookMapping = {
  id: string;
  sourceAudioId: string;
  filename: string;
  exerciseRef?: string;
};

/**
 * Typed envelope attached to a publication fragment (`meta` extension).
 * ContentBundle validation ignores these fields; count gates consume them.
 */
export type PublicationFragmentEnvelope = {
  label?: string;
  generatedFor?: "fixture" | "publication";
  teacherSourceRows?: PublicationTeacherSourceRow[];
  workbookMappings?: PublicationWorkbookMapping[];
};

export type AggregatedPublicationMetadata = {
  /** Typed teacher rows preserved from fragment envelopes (no silent drop). */
  teacherSourceRows: PublicationTeacherSourceRow[];
  workbookMappings: PublicationWorkbookMapping[];
  /** Aggregation integrity issues (duplicates, incomplete, invalid subject IDs). */
  issues: ValidationIssue[];
};

const LEXEME_SUBJECT_PATTERN = /^lex:[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTeacherSubjectId(subjectId: string): boolean {
  return LEXEME_SUBJECT_PATTERN.test(subjectId);
}

function isCompleteTeacherRow(
  row: unknown,
): row is PublicationTeacherSourceRow {
  if (row == null || typeof row !== "object" || Array.isArray(row)) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.sourceRow === "number" &&
    Number.isInteger(r.sourceRow) &&
    typeof r.subjectId === "string" &&
    r.subjectId.length > 0
  );
}

function isCompleteWorkbookMapping(
  mapping: unknown,
): mapping is PublicationWorkbookMapping {
  if (mapping == null || typeof mapping !== "object" || Array.isArray(mapping)) {
    return false;
  }
  const m = mapping as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    m.id.length > 0 &&
    typeof m.sourceAudioId === "string" &&
    m.sourceAudioId.length > 0 &&
    typeof m.filename === "string" &&
    m.filename.length > 0
  );
}

/**
 * Aggregate fragment metadata envelopes without silent deduplication.
 * Duplicate rows/mapping IDs, incomplete records, and invalid subject IDs become issues.
 */
export function aggregatePublicationMetadata(
  envelopes: Array<PublicationFragmentEnvelope | undefined>,
): AggregatedPublicationMetadata {
  const teacherSourceRows: PublicationTeacherSourceRow[] = [];
  const workbookMappings: PublicationWorkbookMapping[] = [];
  const issues: ValidationIssue[] = [];
  const seenRows = new Set<number>();
  const seenMappingIds = new Set<string>();

  for (const envelope of envelopes) {
    if (!envelope) continue;

    for (const row of envelope.teacherSourceRows ?? []) {
      if (!isCompleteTeacherRow(row)) {
        issues.push(
          issue(
            "PUBLICATION_GATE",
            `Incomplete teacher source row metadata (require sourceRow + subjectId)`,
            { field: "meta.teacherSourceRows" },
          ),
        );
        continue;
      }
      if (!isValidTeacherSubjectId(row.subjectId)) {
        issues.push(
          issue(
            "PUBLICATION_GATE",
            `Invalid teacher subjectId shape (expected lex:…)`,
            { objectId: row.subjectId, field: "meta.teacherSourceRows.subjectId" },
          ),
        );
      }
      if (seenRows.has(row.sourceRow)) {
        issues.push(
          issue(
            "PUBLICATION_GATE",
            `Duplicate teacher sourceRow metadata`,
            {
              objectId: `sourceRow:${row.sourceRow}`,
              field: "meta.teacherSourceRows",
            },
          ),
        );
      } else {
        seenRows.add(row.sourceRow);
      }
      teacherSourceRows.push({
        sourceRow: row.sourceRow,
        subjectId: row.subjectId,
      });
    }

    for (const mapping of envelope.workbookMappings ?? []) {
      if (!isCompleteWorkbookMapping(mapping)) {
        issues.push(
          issue(
            "PUBLICATION_GATE",
            `Incomplete workbook mapping metadata (require id, sourceAudioId, filename)`,
            { field: "meta.workbookMappings" },
          ),
        );
        continue;
      }
      if (seenMappingIds.has(mapping.id)) {
        issues.push(
          issue(
            "PUBLICATION_GATE",
            `Duplicate workbook mapping id`,
            { objectId: mapping.id, field: "meta.workbookMappings" },
          ),
        );
      } else {
        seenMappingIds.add(mapping.id);
      }
      workbookMappings.push({
        id: mapping.id,
        sourceAudioId: mapping.sourceAudioId,
        filename: mapping.filename,
        ...(mapping.exerciseRef !== undefined
          ? { exerciseRef: mapping.exerciseRef }
          : {}),
      });
    }
  }

  teacherSourceRows.sort((a, b) => a.sourceRow - b.sourceRow);
  workbookMappings.sort((a, b) => a.id.localeCompare(b.id));

  return { teacherSourceRows, workbookMappings, issues };
}
