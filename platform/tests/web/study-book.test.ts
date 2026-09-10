import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { dictionaryKey, emptyStudy, parseStudy, rateSavedItem } from "../../apps/web/lib/study/storage";
import { lessonFourWords, lessonFourQuiz } from "../../apps/web/lib/study/lesson-four";
import { lessonFourCards } from "../../apps/web/lib/study/word-cards";
import type { BookManifest, SavedItem } from "../../apps/web/lib/study/types";
import { parseHubSearchParams } from "../../apps/web/lib/content/hub-query";
import { buildHubNavigationContext, isSafeNavigationPath, resolveBackHref, parseNavigationContextParam } from "../../apps/web/lib/content/navigation-context";

const word: SavedItem = { id: "card-l4-stuhl", title: "der Stuhl", meaning: "chair", kind: "word", href: "/vocabulary/l4-stuhl", lesson: 4 };
describe("personal study persistence", () => {
  it("roundtrips saved selections, notes, bookmarks and reading progress", () => {
    const state = { ...emptyStudy(), saved: { [word.id]: { ...word, note: "Remember the umlaut in Stühle." } }, bookmarks: ["coursebook-29"], completedPages: ["workbook-26"], resume: "coursebook-30" };
    expect(parseStudy(JSON.stringify(state))).toEqual(state);
  });
  it("rejects corrupt or unsupported backups instead of silently deleting selections", () => {
    expect(() => parseStudy("{broken")).toThrow();
    expect(() => parseStudy('{"version":99}')).toThrow();
    expect(() => parseStudy(JSON.stringify({ ...emptyStudy(), saved: { x: word } }))).toThrow();
  });
  it("rejects imported external and script navigation", () => {
    for (const href of ["javascript:alert(1)", "//evil.test", "https://evil.test", "/\\evil.test"]) expect(() => parseStudy(JSON.stringify({ ...emptyStudy(), saved: { [word.id]: { ...word, href } } }))).toThrow();
  });
  it("schedules actual future dates for each recall rating", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    expect(rateSavedItem(word, "again", now).due).toBe("2026-09-10T12:10:00.000Z");
    expect(rateSavedItem(word, "good", now).due).toBe("2026-09-11T12:00:00.000Z");
    expect(rateSavedItem(word, "easy", now).due).toBe("2026-09-13T12:00:00.000Z");
    expect(rateSavedItem({ ...word, interval: 4 }, "good", now).interval).toBe(8);
  });
  it("supports article-free and transliterated dictionary lookup", () => {
    expect(dictionaryKey("die Stühle!")).toBe(dictionaryKey("Stuehle"));
    expect(dictionaryKey("groß")).toBe("gross");
  });
});
describe("Lesson 4 source and exercise integration", () => {
  const book = JSON.parse(readFileSync(resolve("apps/web/generated/interactive-book.json"), "utf8")) as BookManifest;
  it("has all four original coursebook and workbook pages for each lesson", () => {
    expect(book.pages).toHaveLength(32);
    for (const lesson of [1, 2, 3, 4]) for (const kind of ["coursebook", "workbook"]) expect(book.pages.filter(p => p.lesson === lesson && p.kind === kind)).toHaveLength(4);
    expect(book.pages.filter(p => p.lesson === 4 && p.kind === "coursebook").map(p => p.printedPage)).toEqual([29, 30, 31, 32]);
  });
  it("maps all original tracks to an existing page with a matching lesson and book", () => {
    expect(book.audio.filter(a => a.lesson === 4)).toHaveLength(18);
    for (const track of book.audio) {
      const page = book.pages.find(p => p.id === track.pageId)!;
      expect(page.lesson).toBe(track.lesson); expect(page.kind).toBe(track.kind);
      expect(page.audioIds).toContain(track.id);
      expect(existsSync(resolve(`apps/web/public${track.src}`))).toBe(true);
    }
    expect(book.audio.find(a => a.kind === "workbook" && a.lesson === 4 && a.exercise === 9)?.pageId).toBe("workbook-28");
  });
  it("has unique stable line IDs and real page images", () => {
    const lines = book.pages.flatMap(p => p.lines);
    expect(new Set(lines.map(l => l.id)).size).toBe(lines.length);
    for (const page of book.pages) expect(existsSync(resolve(`apps/web/public${page.image}`))).toBe(true);
    for (const line of lines) { expect(line.text).not.toMatch(/[\ue000-\uf8ff]/); expect(line.box).toHaveLength(4); }
  });
  it("gives every Lesson 4 word a study card and a checked quiz answer", () => {
    const cards = lessonFourCards(); expect(cards).toHaveLength(lessonFourWords.length);
    expect(cards.find(c => c.id === "l4-stuhl")?.rows[0]?.plurals[0]?.text).toBe("die Stühle");
    for (const q of lessonFourQuiz) expect(q.options.filter(o => o === q.answer)).toHaveLength(1);
  });
  it("accepts Lesson 4 in the existing vocabulary filters", () => {
    expect(parseHubSearchParams({ lesson: "04" }, []).lesson).toBe("04");
    const nav = buildHubNavigationContext({ hubId: "vocabulary", lesson: "04", q: "Stuhl" });
    expect(resolveBackHref(nav, "hub")).toBe("/vocabulary?q=Stuhl&lesson=04");
    expect(parseNavigationContextParam(JSON.stringify(nav))?.lesson).toBe("04");
    expect(isSafeNavigationPath("/vocabulary/l4-stuhl")).toBe(true);
    expect(isSafeNavigationPath("/vocabulary/l4-made-up")).toBe(false);
  });
  it("has exact file-backed speech for every readable line and new study utterance", () => {
    const speech = JSON.parse(readFileSync(resolve("apps/web/generated/study-speech.json"), "utf8")) as Record<string, string>;
    const texts = JSON.parse(readFileSync(resolve("apps/web/generated/study-speech-texts.json"), "utf8")) as string[];
    for (const text of texts) {
      expect(speech[text], text).toMatch(/^\/(audio|book)\//);
      expect(existsSync(resolve(`apps/web/public${speech[text]}`)), text).toBe(true);
    }
  });
});
