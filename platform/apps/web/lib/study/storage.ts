import type { SavedItem, StudyState } from "./types";

export const STUDY_KEY = "german-learning-os:study-book:v1";
export const emptyStudy = (): StudyState => ({
  version: 1,
  saved: {},
  bookmarks: [],
  completedPages: [],
  resume: null,
});
const kinds = new Set(["word", "concept", "line", "phrase"]);
export function parseStudy(raw: string | null): StudyState {
  if (!raw) return emptyStudy();
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1
  )
    throw new Error("This file is not a supported study backup.");
  const data = value as Partial<StudyState>;
  if (
    !data.saved ||
    typeof data.saved !== "object" ||
    Array.isArray(data.saved)
  )
    throw new Error("Saved items are missing.");
  const saved: Record<string, SavedItem> = {};
  for (const [id, item] of Object.entries(data.saved)) {
    if (
      !item ||
      typeof item !== "object" ||
      item.id !== id ||
      typeof item.title !== "string" ||
      typeof item.meaning !== "string" ||
      !kinds.has(item.kind) ||
      typeof item.href !== "string" ||
      !/^\/(?!\/)/.test(item.href) ||
      item.href.includes("\\")
    )
      throw new Error("A saved item is invalid.");
    if (
      [id, item.title, item.meaning, item.note ?? ""].some(
        (text) => typeof text !== "string" || text.length > 10000,
      )
    )
      throw new Error("A saved item is too large.");
    saved[id] = {
      id,
      title: item.title,
      meaning: item.meaning,
      kind: item.kind,
      href: item.href,
      ...(typeof item.lesson === "number" &&
      item.lesson >= 1 &&
      item.lesson <= 4
        ? { lesson: item.lesson }
        : {}),
      ...(typeof item.due === "string" && Number.isFinite(Date.parse(item.due))
        ? { due: item.due }
        : {}),
      ...(typeof item.savedAt === "string" ? { savedAt: item.savedAt } : {}),
      ...(typeof item.interval === "number" &&
      item.interval >= 0 &&
      item.interval <= 365
        ? { interval: item.interval }
        : {}),
      ...(typeof item.note === "string" ? { note: item.note } : {}),
      ...(typeof item.audio === "string" &&
      /^\/(?!\/)/.test(item.audio) &&
      !item.audio.includes("\\")
        ? { audio: item.audio }
        : {}),
    };
  }
  const pages = (v: unknown): string[] =>
    Array.isArray(v)
      ? [
          ...new Set(
            v.filter(
              (p): p is string =>
                typeof p === "string" && /^(coursebook|workbook)-\d+$/.test(p),
            ),
          ),
        ]
      : [];
  return {
    version: 1,
    saved,
    bookmarks: pages(data.bookmarks),
    completedPages: pages(data.completedPages),
    resume:
      typeof data.resume === "string" &&
      /^(coursebook|workbook)-\d+$/.test(data.resume)
        ? data.resume
        : null,
  };
}

export function rateSavedItem(
  item: SavedItem,
  rating: "again" | "good" | "easy",
  now = new Date(),
): SavedItem {
  const interval =
    rating === "again"
      ? 0
      : rating === "easy"
        ? Math.min(365, Math.max(3, (item.interval ?? 1) * 3))
        : Math.min(365, Math.max(1, (item.interval ?? 0) * 2));
  return {
    ...item,
    interval,
    due: new Date(
      now.getTime() +
        (rating === "again" ? 10 * 60_000 : interval * 86_400_000),
    ).toISOString(),
  };
}

export function dictionaryKey(text: string): string {
  return text
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/^(der|die|das)\s+/, "")
    .replace(/[.,!?;:()[\]“”„]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}
