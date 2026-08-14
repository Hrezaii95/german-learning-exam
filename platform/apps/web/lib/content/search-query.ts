import { lessonLabel } from "./lesson-label";
import {
  caseFoldNfc,
  germanMatchKeys,
  nfc,
  tokenizeNormalized,
} from "./match-keys";
import type {
  LearnerSearchDocument,
  LearnerSearchHit,
  LearnerSearchMatch,
  LearnerSearchMatchField,
  LearnerSearchMatchReason,
  LearnerSearchProjection,
  LearnerSearchableKind,
} from "./search-types";

/** Bound for global search query length (characters after sanitization). */
export const SEARCH_QUERY_MAX_LENGTH = 200;

/** Default result limit — matches content searchContent default. */
export const SEARCH_RESULT_LIMIT = 50;

const FIELD_WEIGHT: Record<LearnerSearchMatchField, number> = {
  lemma: 100,
  infinitive: 100,
  intent: 95,
  label: 90,
  title: 90,
  realization: 85,
  form: 80,
  meaning: 70,
  category: 40,
};

const REASON_WEIGHT: Record<LearnerSearchMatchReason, number> = {
  exact: 1000,
  prefix: 700,
  token: 500,
  substring: 300,
  "normalized-alias": 200,
};

const KIND_TIEBREAK: Record<LearnerSearchableKind, number> = {
  Verb: 10,
  Lexeme: 20,
  QAPair: 30,
  PhrasePattern: 40,
  GrammarConcept: 50,
  Collection: 60,
  Dialogue: 70,
  ListeningAsset: 80,
  Lesson: 90,
  LearningActivity: 100,
};

/** Stable group order for UI (semantic hub/type). */
export const SEARCH_GROUP_ORDER: readonly LearnerSearchableKind[] = Object.freeze([
  "Lexeme",
  "Verb",
  "GrammarConcept",
  "PhrasePattern",
  "QAPair",
  "Dialogue",
  "ListeningAsset",
  "Collection",
  "Lesson",
  "LearningActivity",
]) as readonly LearnerSearchableKind[];

type Candidate = {
  doc: LearnerSearchDocument;
  score: number;
  match: LearnerSearchMatch;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") return entry;
    }
    return undefined;
  }
  if (typeof value === "string") return value;
  return undefined;
}

/**
 * Fail closed on adversarial query text: drop C0 controls / unpaired surrogates,
 * flatten angle brackets so UI never carries raw markup delimiters, bound length.
 */
export function sanitizeSearchQueryText(raw: string): string {
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) continue;
    if (code >= 0xd800 && code <= 0xdfff) continue;
    if (ch === "<" || ch === ">") continue;
    out += ch;
    if (out.length >= SEARCH_QUERY_MAX_LENGTH) break;
  }
  return out;
}

/** Unknown / array / duplicate query values fail safely to a sanitized scalar. */
export function parseSearchQueryParam(
  params: Record<string, string | string[] | undefined>,
): string {
  const raw = firstParam(params.q) ?? "";
  return typeof raw === "string" ? sanitizeSearchQueryText(raw) : "";
}

/**
 * Match reasons mirror content `searchContent`:
 * - exact: case-folded NFC equals
 * - normalized-alias: digraph/base folds — never upgraded to exact
 */
function bestMatchForField(
  queryDisplay: string,
  fieldDisplay: string,
  queryKeys: string[],
  queryTokens: string[],
  fieldKeys: readonly string[],
): LearnerSearchMatchReason | null {
  let best: LearnerSearchMatchReason | null = null;
  const rank = (r: LearnerSearchMatchReason): number => REASON_WEIGHT[r];

  const consider = (reason: LearnerSearchMatchReason): void => {
    if (best == null || rank(reason) > rank(best)) best = reason;
  };

  const qPrimary = caseFoldNfc(queryDisplay);
  const fPrimary = caseFoldNfc(fieldDisplay);

  if (qPrimary.length > 0 && qPrimary === fPrimary) {
    consider("exact");
  } else if (qPrimary.length > 0 && fPrimary.startsWith(qPrimary)) {
    consider("prefix");
  } else if (qPrimary.length >= 2 && fPrimary.includes(qPrimary)) {
    consider("substring");
  }

  if (qPrimary !== fPrimary) {
    for (const q of queryKeys) {
      if (q.length === 0) continue;
      for (const key of fieldKeys) {
        if (key === q) {
          consider("normalized-alias");
          continue;
        }
        if (key.startsWith(q)) {
          consider("normalized-alias");
          continue;
        }
        if (q.length >= 2 && key.includes(q)) {
          consider("normalized-alias");
        }
      }
    }
  }

  if (queryTokens.length > 0) {
    for (const key of fieldKeys) {
      const keyTokens = tokenizeNormalized(key);
      if (queryTokens.every((t) => keyTokens.some((kt) => kt === t || kt.startsWith(t)))) {
        if (qPrimary === fPrimary) consider("token");
        else consider("normalized-alias");
      }
    }
  }

  return best;
}

function scoreDocument(
  doc: LearnerSearchDocument,
  query: string,
): Candidate | null {
  const displayQuery = nfc(query).trim();
  if (displayQuery.length === 0) return null;

  const queryKeys = germanMatchKeys(displayQuery);
  const queryTokens = tokenizeNormalized(displayQuery);
  const idSlug = doc.id.includes(":") ? doc.id.slice(doc.id.indexOf(":") + 1) : doc.id;

  let best: Candidate | null = null;

  const consider = (
    field: LearnerSearchMatchField,
    reason: LearnerSearchMatchReason,
    keys: readonly string[],
  ): void => {
    const score =
      FIELD_WEIGHT[field] +
      REASON_WEIGHT[reason] +
      Math.min(50, Math.max(...keys.map((k) => k.length), 0));
    if (
      best == null ||
      score > best.score ||
      (score === best.score && field < best.match.field)
    ) {
      best = {
        doc,
        score,
        match: { field, reason },
      };
    }
  };

  for (const f of doc.fields) {
    const reason = bestMatchForField(
      displayQuery,
      f.displayText,
      queryKeys,
      queryTokens,
      f.matchKeys,
    );
    if (reason) consider(f.field, reason, f.matchKeys);
  }

  const idKeys = germanMatchKeys(idSlug);
  const idReason = bestMatchForField(
    displayQuery,
    idSlug,
    queryKeys,
    queryTokens,
    idKeys,
  );
  if (idReason) {
    const reason =
      idReason === "exact" || idReason === "prefix" || idReason === "substring"
        ? "normalized-alias"
        : idReason;
    consider("label", reason, idKeys);
  }

  return best;
}

function compareHits(a: Candidate, b: Candidate): number {
  if (b.score !== a.score) return b.score - a.score;
  const kindDelta =
    (KIND_TIEBREAK[a.doc.kind] ?? 999) - (KIND_TIEBREAK[b.doc.kind] ?? 999);
  if (kindDelta !== 0) return kindDelta;
  return a.doc.id.localeCompare(b.doc.id);
}

/**
 * Learner-safe search over the generated search artifact.
 * Semantics match content `searchContent` (learner audience, default limit 50).
 * Empty / whitespace-only queries return [] — never every item as fake results.
 */
export function searchLearnerContent(
  projection: LearnerSearchProjection,
  query: string,
  options: { limit?: number } = {},
): LearnerSearchHit[] {
  const limit = options.limit ?? SEARCH_RESULT_LIMIT;
  const trimmed = nfc(query).trim();
  if (trimmed.length === 0) return [];

  const candidates: Candidate[] = [];
  for (const doc of projection.documents) {
    if (doc.publicationStatus !== "published") continue;
    const scored = scoreDocument(doc, trimmed);
    if (scored) candidates.push(scored);
  }

  candidates.sort(compareHits);

  return candidates.slice(0, limit).map((c) => ({
    id: c.doc.id,
    kind: c.doc.kind,
    displayLabel: c.doc.displayLabel,
    lessonIds: c.doc.lessonIds,
    sourcePriority: c.doc.sourcePriority,
    hubDestination: c.doc.hubDestination,
    canonicalHref: c.doc.canonicalHref,
    score: c.score,
    match: c.match,
  }));
}

export type SearchResultGroup = {
  kind: LearnerSearchableKind;
  label: string;
  hits: readonly LearnerSearchHit[];
};

export function groupSearchHits(
  hits: readonly LearnerSearchHit[],
): SearchResultGroup[] {
  const byKind = new Map<LearnerSearchableKind, LearnerSearchHit[]>();
  for (const hit of hits) {
    const list = byKind.get(hit.kind) ?? [];
    list.push(hit);
    byKind.set(hit.kind, list);
  }
  const groups: SearchResultGroup[] = [];
  for (const kind of SEARCH_GROUP_ORDER) {
    const list = byKind.get(kind);
    if (list && list.length > 0) {
      groups.push({
        kind,
        label: kindGroupLabel(kind),
        hits: list,
      });
    }
  }
  return groups;
}

export function kindGroupLabel(kind: LearnerSearchableKind): string {
  switch (kind) {
    case "Lexeme":
      return "Vocabulary";
    case "Verb":
      return "Verbs";
    case "GrammarConcept":
      return "Grammar";
    case "PhrasePattern":
      return "Phrases";
    case "QAPair":
      return "Q&A";
    case "Dialogue":
      return "Dialogues";
    case "ListeningAsset":
      return "Listening";
    case "Collection":
      return "Concepts";
    case "Lesson":
      return "Lessons";
    case "LearningActivity":
      return "Activities";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

const MATCH_FIELD_LABELS: Readonly<Record<LearnerSearchMatch["field"], string>> =
  Object.freeze({
    label: "the name",
    lemma: "the German word",
    infinitive: "the verb",
    meaning: "the English meaning",
    intent: "what it is used for",
    title: "the title",
    realization: "the phrase",
    form: "a word form",
    category: "the category",
  });

/** Learner-readable summary of why a search hit matched (no internal codes). */
export function matchMetaLabel(match: LearnerSearchMatch): string {
  return `Found in ${MATCH_FIELD_LABELS[match.field]}`;
}

const SOURCE_PRIORITY_LABELS: Readonly<Record<1 | 2 | 3 | 4, string>> =
  Object.freeze({
    1: "Core vocabulary",
    2: "From the coursebook",
    3: "Teacher material",
    4: "Extra material",
  });

/** Learner-readable source label (never a raw priority number). */
export function sourcePriorityLabel(
  priority: 1 | 2 | 3 | 4 | null,
): string {
  if (priority == null) return "Course material";
  return SOURCE_PRIORITY_LABELS[priority];
}

export function lessonMembershipLabel(lessonIds: readonly string[]): string {
  if (lessonIds.length === 0) return "No lesson link";
  return lessonIds.map((id) => lessonLabel(id)).join(", ");
}
