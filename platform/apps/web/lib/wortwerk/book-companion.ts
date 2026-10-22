import type { ContentPack, PackItem } from "../../../../packages/content/src/types/packs.js";
import { buildCapabilityIndex } from "../../../../packages/wortwerk/src/capabilities.js";
import type { PlayScope, StudySource } from "../study/scope";
import { matchesPlayScope } from "../study/scope";
import { encodeScope, parsePlayScope, playHref } from "./links";
import { positionScope, type BookPosition } from "../study/book-position";

export type ScopeSelectionMode = "position" | "one" | "multiple" | "through" | "topics" | "due" | "tricky";
export type ScopeSelection = {
  mode: ScopeSelectionMode; book: string; lessons: number[]; tags: string[]; sources: StudySource[];
  skills: string[]; includeWholeCurrentLesson: boolean;
};
export function bookLessons(pack: ContentPack, book: string): number[] {
  return [...new Set([...pack.items.filter(i => i.bookRef.book === book).map(i => i.bookRef.lesson),
    ...pack.units.flatMap(unit => unit.bookRef?.book === book ? [unit.bookRef.lesson] : [])])].sort((a, b) => a - b);
}
export function companionScope(selection: ScopeSelection, position: BookPosition | null,
  smartSets: { due?: readonly string[]; tricky?: readonly string[] } = {}): PlayScope | null {
  let base: PlayScope = { v: 1, book: selection.book };
  if (selection.mode === "position") {
    if (!position || position.book !== selection.book) return null;
    base = positionScope(position, selection.includeWholeCurrentLesson);
  } else if (selection.mode === "one" || selection.mode === "multiple" || selection.mode === "through") {
    const lessons = [...new Set(selection.lessons)].sort((a, b) => a - b);
    if (!lessons.length) return null;
    base.lessons = selection.mode === "through" ? Array.from({ length: lessons[0]! }, (_, index) => index + 1)
      : selection.mode === "one" ? [lessons[0]!] : lessons;
  } else if (selection.mode === "due" || selection.mode === "tricky") {
    const items = smartSets[selection.mode];
    if (!items?.length) return null;
    base.items = [...items];
  }
  if (selection.tags.length) base.tags = [...selection.tags];
  if (selection.sources.length) base.sources = [...selection.sources];
  if (selection.skills.length) base.skills = [...selection.skills];
  return parsePlayScope(base);
}
export function filterCompanionItems(pack: ContentPack, scope: PlayScope): PackItem[] {
  const index = scope.skills?.length ? buildCapabilityIndex(pack) : null;
  return pack.items.filter(item => matchesPlayScope(item, scope) && (!index || index.items[item.id]?.templateIds.some(id => {
    const template = index.templates[id];
    return !!template && scope.skills!.some(skill => skill === template.skill || skill === template.dimension);
  })));
}
export function lessonLoopLinks(pack: ContentPack, position: BookPosition): {
  preview: string | null; today: string; boss: string; dailyRun: string;
} {
  const lessons = bookLessons(pack, position.book);
  const next = lessons.find(lesson => lesson > position.lesson);
  const lessonScope: PlayScope = { v: 1, book: position.book, lessons: [position.lesson] };
  const bossQuery = new URLSearchParams({ pack: pack.id, unit: pack.units.find(unit => unit.bookRef?.book === position.book && unit.bookRef.lesson === position.lesson)?.id ?? "",
    scope: encodeScope(lessonScope) });
  const todayScope = positionScope(position);
  todayScope.lessons = position.page !== undefined || position.lessonDone ? [position.lesson] : [];
  return { preview: next === undefined ? null : playHref({ v: 1, book: position.book, lessons: [next], count: 15 }, { mode: "free", pack: pack.id }),
    today: playHref(todayScope, { pack: pack.id }),
    boss: `/play/boss?${bossQuery.toString()}`, dailyRun: playHref(positionScope(position), { pack: pack.id }) };
}
