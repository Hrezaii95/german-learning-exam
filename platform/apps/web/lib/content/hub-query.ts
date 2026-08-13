import { queryMatchKeys } from "./match-keys";
import type { LearnerHubRecord } from "./hub-types";

export type HubLessonFilter = "all" | "01" | "02";

export type HubQueryState = {
  q: string;
  lesson: HubLessonFilter;
  category: string | null;
};

export type HubFilterResult = {
  query: HubQueryState;
  items: readonly LearnerHubRecord[];
  activeFilterCount: number;
  hasActiveFilters: boolean;
};

/** Bound for query string length (characters after sanitization). */
export const HUB_QUERY_MAX_LENGTH = 200;

const LESSON_FILTER_TO_ID: Readonly<Record<Exclude<HubLessonFilter, "all">, string>> =
  Object.freeze({
    "01": "lesson:01",
    "02": "lesson:02",
  });

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    // Duplicate keys often arrive as arrays; take the first scalar only.
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
 * flatten angle brackets so summaries never carry raw markup delimiters, bound length.
 */
export function sanitizeHubQueryText(raw: string): string {
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) continue;
    if (code >= 0xd800 && code <= 0xdfff) continue;
    if (ch === "<" || ch === ">") continue;
    out += ch;
    if (out.length >= HUB_QUERY_MAX_LENGTH) break;
  }
  return out;
}

function parseLesson(raw: string | undefined): HubLessonFilter {
  if (raw === "01" || raw === "02") return raw;
  return "all";
}

function parseCategory(
  raw: string | undefined,
  allowed: ReadonlySet<string>,
): string | null {
  if (raw == null || raw === "" || raw === "all") return null;
  const cleaned = sanitizeHubQueryText(raw).trim();
  if (cleaned.length === 0 || cleaned === "all") return null;
  if (!allowed.has(cleaned)) return null;
  return cleaned;
}

/** Unknown query values fail safely to defaults — never reflect unsafe input into logic crashes. */
export function parseHubSearchParams(
  params: Record<string, string | string[] | undefined>,
  availableCategories: readonly string[],
): HubQueryState {
  const allowed = new Set(availableCategories);
  const qRaw = firstParam(params.q) ?? "";
  const q =
    typeof qRaw === "string" ? sanitizeHubQueryText(qRaw) : "";
  return {
    q,
    lesson: parseLesson(firstParam(params.lesson)),
    category: parseCategory(firstParam(params.category), allowed),
  };
}

function matchesSearch(record: LearnerHubRecord, query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length === 0) return true;

  const queryKeys = queryMatchKeys(trimmed);
  if (queryKeys.length === 0) return true;

  const labelKeys = queryMatchKeys(record.displayLabel);
  for (const qk of queryKeys) {
    if (qk.length === 0) continue;
    if (labelKeys.some((lk) => lk === qk || lk.startsWith(qk) || (qk.length >= 2 && lk.includes(qk)))) {
      return true;
    }
    for (const field of record.searchFields) {
      if (
        field.matchKeys.some(
          (mk) => mk === qk || mk.startsWith(qk) || (qk.length >= 2 && mk.includes(qk)),
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function matchesLesson(
  record: LearnerHubRecord,
  lesson: HubLessonFilter,
): boolean {
  if (lesson === "all") return true;
  const lessonId = LESSON_FILTER_TO_ID[lesson];
  return record.lessonIds.includes(lessonId);
}

function matchesCategory(
  record: LearnerHubRecord,
  category: string | null,
): boolean {
  if (category == null) return true;
  return record.category === category;
}

export function filterHubRecords(
  records: readonly LearnerHubRecord[],
  query: HubQueryState,
): HubFilterResult {
  const items = records.filter(
    (record) =>
      matchesSearch(record, query.q) &&
      matchesLesson(record, query.lesson) &&
      matchesCategory(record, query.category),
  );

  let activeFilterCount = 0;
  if (query.q.trim().length > 0) activeFilterCount += 1;
  if (query.lesson !== "all") activeFilterCount += 1;
  if (query.category != null) activeFilterCount += 1;

  return {
    query,
    items,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}

export function hubClearHref(hubPath: string): string {
  return hubPath;
}

export function hubFilterSummary(query: HubQueryState): string[] {
  const parts: string[] = [];
  if (query.q.trim().length > 0) {
    // query.q is already sanitized; never re-inject raw request params.
    parts.push(`Search: ${query.q.trim()}`);
  }
  if (query.lesson !== "all") {
    parts.push(`Lesson ${query.lesson}`);
  }
  if (query.category != null) {
    parts.push(`Category: ${query.category}`);
  }
  return parts;
}

export function lessonFilterLabel(lesson: HubLessonFilter): string {
  if (lesson === "all") return "All lessons";
  return `Lesson ${lesson}`;
}
