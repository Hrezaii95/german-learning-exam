import { resolveIndexAudience, isVisiblePublicationStatus } from "./audience.js";
import { getIndexInternal } from "./internal.js";
import {
  caseFoldNfc,
  foldUmlautDigraph,
  germanMatchKeys,
  nfc,
  tokenizeNormalized,
} from "./normalize.js";
import type {
  ContentIndexes,
  SearchHit,
  SearchMatch,
  SearchMatchField,
  SearchMatchReason,
  SearchOptions,
  SearchDocument,
  SearchableKind,
} from "./types.js";

const FIELD_WEIGHT: Record<SearchMatchField, number> = {
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

const REASON_WEIGHT: Record<SearchMatchReason, number> = {
  exact: 1000,
  prefix: 700,
  token: 500,
  substring: 300,
  "normalized-alias": 200,
};

const KIND_TIEBREAK: Record<SearchableKind, number> = {
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

type Candidate = {
  doc: SearchDocument;
  score: number;
  match: SearchMatch;
};

/**
 * Match reasons:
 * - exact: case-folded NFC of query equals case-folded NFC of canonical field display
 * - normalized-alias: digraph/base folds (Gaertner, heissen, GARTNER) — never "exact"
 */
function bestMatchForField(
  queryDisplay: string,
  fieldDisplay: string,
  queryKeys: string[],
  queryTokens: string[],
  fieldKeys: readonly string[],
): SearchMatchReason | null {
  let best: SearchMatchReason | null = null;
  const rank = (r: SearchMatchReason): number => REASON_WEIGHT[r];

  const consider = (reason: SearchMatchReason): void => {
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

  // Transliterated / digraph / base-fold aliases — never upgrade to exact.
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

function scoreDocument(doc: SearchDocument, query: string): Candidate | null {
  const displayQuery = nfc(query).trim();
  if (displayQuery.length === 0) return null;

  const queryKeys = germanMatchKeys(displayQuery);
  const queryTokens = tokenizeNormalized(displayQuery);
  const idSlug = doc.id.includes(":") ? doc.id.slice(doc.id.indexOf(":") + 1) : doc.id;

  let best: Candidate | null = null;

  const consider = (
    field: SearchMatchField,
    reason: SearchMatchReason,
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

  // ID slugs are often ASCII transliterations (lex:gaertner) — never "exact"
  // against learner-facing orthography.
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
 * Normalized German-aware search over typed indexes.
 * Default audience is learner (published only); pass audience:"review" or
 * includeReview:true for author surfaces. Never returns blocked entities.
 * Explicit audience:"learner" + includeReview:true throws INDEX_AUDIENCE_CONFLICT.
 * Results never include raw HTML or assertion values.
 */
export function searchContent(
  indexes: ContentIndexes,
  query: string,
  options: SearchOptions = {},
): SearchHit[] {
  const audience = resolveIndexAudience(options.audience, options.includeReview);
  const includeReview = audience === "review";
  const limit = options.limit ?? 50;
  const kindFilter =
    options.kinds != null && options.kinds.length > 0
      ? new Set<SearchableKind>(options.kinds)
      : null;

  const trimmed = nfc(query).trim();
  if (trimmed.length === 0) return [];

  const candidates: Candidate[] = [];
  for (const doc of getIndexInternal(indexes).searchDocuments) {
    if (!isVisiblePublicationStatus(doc.publicationStatus, audience)) continue;
    if (kindFilter && !kindFilter.has(doc.kind)) continue;
    const scored = scoreDocument(doc, trimmed);
    if (scored) candidates.push(scored);
  }

  candidates.sort(compareHits);

  const internal = getIndexInternal(indexes);
  return candidates.slice(0, limit).map((c) => {
    const lessonIds = c.doc.lessonIds.filter((lid) => {
      const lesson = internal.byId.get(lid);
      return (
        lesson != null &&
        lesson.kind === "Lesson" &&
        isVisiblePublicationStatus(lesson.publicationStatus, audience)
      );
    });
    const hit: SearchHit = {
      id: c.doc.id,
      kind: c.doc.kind,
      displayLabel: c.doc.displayLabel,
      lessonIds,
      sourcePriority: c.doc.sourcePriority,
      publicationStatus: c.doc.publicationStatus,
      hubDestination: c.doc.hubDestination,
      backContext: {
        entryContext: "search",
        query: trimmed,
        includeReview,
        resultId: c.doc.id,
        resultKind: c.doc.kind,
      },
      score: c.score,
      match: c.match,
    };
    return hit;
  });
}

/** Exported for tests: case-fold helper stability. */
export function normalizeQueryForTest(query: string): {
  nfc: string;
  caseFolded: string;
  digraph: string;
  keys: string[];
} {
  const normalized = nfc(query);
  return {
    nfc: normalized,
    caseFolded: caseFoldNfc(normalized),
    digraph: foldUmlautDigraph(normalized),
    keys: germanMatchKeys(normalized),
  };
}
