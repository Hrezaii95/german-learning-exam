import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPackRegistry } from "../../packages/wortwerk/src/loader.server.js";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import items from "../fixtures/packs/de-b2-sample/items/all.json";
import profile from "../../content/languages/de.json";
import difficulty from "../fixtures/packs/de-b2-sample/difficulty.json";

describe("server-side authored resource admission", () => {
  it("loads valid referenced resources and rejects future versions or bad references before exposing them", () => {
    const root = mkdtempSync(join(tmpdir(), "wortwerk-resources-"));
    const directory = join(root, "packs", manifest.id);
    try {
      mkdirSync(join(root, "languages")); mkdirSync(join(root, "difficulty")); mkdirSync(directory, { recursive: true });
      const save = (file: string, value: unknown) => writeFileSync(file, JSON.stringify(value));
      save(join(root, "languages", `${profile.id}.json`), profile);
      save(join(root, "difficulty", `${difficulty.id}.json`), difficulty);
      const { itemFiles: _itemFiles, ...embedded } = manifest;
      save(join(directory, "pack.json"), { ...embedded, items, story: "story.json", exam: "exam.json" });
      const story = { schemaVersion: 1, title: "Source story", chapters: [{ id: "one", title: "Source chapter", unitId: "u1", itemRefs: ["dialogue1"] }] };
      const exam = { schemaVersion: 1, title: "Source exam", taskRefs: ["exam1"] };
      save(join(directory, "story.json"), story); save(join(directory, "exam.json"), exam);
      expect(loadPackRegistry(root).packs[0]?.resources).toEqual({ story, exam });
      for (const invalid of [{ ...story, schemaVersion: 2 }, { ...story, chapters: [{ ...story.chapters[0], itemRefs: ["missing"] }] }]) {
        save(join(directory, "story.json"), invalid);
        expect(() => loadPackRegistry(root)).toThrow("Invalid story resource");
      }
      save(join(directory, "story.json"), story);
      save(join(directory, "exam.json"), { ...exam, taskRefs: ["w0"] });
      expect(() => loadPackRegistry(root)).toThrow("Invalid exam resource");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
