import type { LanguageProfile } from "../../content/src/types/packs.js";

function normalized(value: string, profile: LanguageProfile, pos: string, hinted: boolean): string {
  let text = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  for (const rule of profile.normalization.equivalences) {
    if (hinted || rule.match === "accepted") text = text.split(rule.from).join(rule.to);
  }
  return profile.normalization.caseSensitivePos.includes(pos) ? text : text.toLocaleLowerCase(profile.locale);
}

export function gradeTextAnswer(answer: string, accepted: readonly string[], profile: LanguageProfile, pos: string): { outcome: "correct" | "almost" | "incorrect"; normalized: string } {
  const exact = normalized(answer, profile, pos, false);
  if (accepted.some(form => normalized(form, profile, pos, false) === exact)) return { outcome: "correct", normalized: exact };
  const hint = normalized(answer, profile, pos, true);
  const almost = accepted.some(form => normalized(form, profile, pos, true) === hint);
  return { outcome: almost ? "almost" : "incorrect", normalized: exact };
}
