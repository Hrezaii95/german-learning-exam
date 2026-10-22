import { describe, expect, it } from "vitest";
import { articleTone } from "../../apps/web/lib/study/article-tone.js";

describe("article presentation tones", () => {
  it.each([
    ["masculine", "male"],
    ["feminine", "female"],
    ["neuter", "neuter"],
    ["plural", "plural"],
    [null, "plain"],
    [undefined, "plain"],
  ] as const)("maps published gender %s to %s without changing source values", (gender, tone) => {
    expect(articleTone(gender)).toBe(tone);
  });
});
