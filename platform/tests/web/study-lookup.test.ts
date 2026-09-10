import { describe, expect, it } from "vitest";
import { loadDictionary } from "../../apps/web/lib/study/catalog";
import { lookupEntries } from "../../apps/web/lib/study/lookup";

const dictionary = loadDictionary();
describe("word, phrase, and sentence meaning", () => {
  it("uses vocabulary card gender and plural metadata", () => {
    for (const [word, tone] of [["Stuhl", "male"], ["Lampe", "female"], ["Bett", "neuter"], ["Stühle", "plural"]]) {
      const result = lookupEntries(dictionary, word!);
      expect(result.exact).toBe(true);
      expect(result.entries.some(entry => entry.displayForms?.some(form => form.tone === tone))).toBe(true);
    }
  });
  it("finds an entire Lesson 4 phrase and preserves its review identity", () => {
    const entry = lookupEntries(dictionary, "Das finde ich auch!").entries.find(e => e.kind === "phrase")!;
    expect(entry.en).toBe("I think so too.");
    expect(entry.href).toBe("/lessons/04#phrases");
    expect(entry.saveId).toBe("l4-phrase-7");
  });
  it("opens a published conversation card for earlier phrases", () => {
    const entry = lookupEntries(dictionary, "Wie alt bist du?").entries.find(e => e.kind === "phrase")!;
    expect(entry.en).toContain("How old are you");
    expect(entry.href).toMatch(/^\/phrases\/id-/);
  });
  it("matches curly and straight apostrophes in phrases", () => {
    expect(lookupEntries(dictionary, "Wie geht's dir?").entries.some(e => e.en.includes("How are you"))).toBe(true);
  });
  it("finds translated sentences, not the word's dictionary gloss", () => {
    const sentence = dictionary.find(e => e.kind === "sentence" && e.de.split(" ").length > 3)!;
    const result = lookupEntries(dictionary, sentence.de);
    expect(result.exact).toBe(true);
    expect(result.entries.some(e => e.en === sentence.en && e.kind === "sentence")).toBe(true);
  });
  it("does not present a template or partial match as a sentence translation", () => {
    expect(lookupEntries(dictionary, "Ich bin 987 Jahre alt.").exact).toBe(false);
    expect(lookupEntries(dictionary, "finde ich").exact).toBe(false);
    expect(lookupEntries(dictionary, "zxq unbekannter Satz").entries).toEqual([]);
  });
  it("keeps distinct noun articles when resolving phrase meanings", () => {
    expect(lookupEntries(dictionary, "finde ich auch").exact).toBe(false);
  });
});
