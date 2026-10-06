import type { WordCard } from "../content/word-card-types";
import { translate } from "./catalog";
import { germanStudyGloss } from "./german-study-glosses";

/** German definitions keep a translated gloss from becoming its own answer. */
export function germanWordCardCue(card: WordCard, index: number): string {
  const prompt = card.prompts[index]!;
  const meaning = /“([^”]+)”/.exec(prompt.question)?.[1];
  const definition = meaning ? germanStudyGloss(meaning, prompt.answers[0]) : null;
  if (definition) return /plural/i.test(prompt.question)
    ? `Nenne die Pluralform: ${definition}.`
    : `Nenne den deutschen Ausdruck: ${definition}.`;

  const translated = translate(prompt.question, "de");
  const words = translated.toLocaleLowerCase("de-DE").match(/[\p{L}\p{N}]+/gu)?.join(" ") ?? "";
  const exposesAnswer = prompt.answers.some(answer => {
    const target = answer.replace(/^(der|die|das) /, "").toLocaleLowerCase("de-DE")
      .match(/[\p{L}\p{N}]+/gu)?.join(" ");
    return target && ` ${words} `.includes(` ${target} `);
  });
  if (!exposesAnswer) return translated;

  // These cards open in Learn mode. Where no authored definition exists, ask
  // for the form just studied instead of showing it in a translated title.
  const row = card.rows.find(item => prompt.answers.some(answer =>
    item.singular.text.split(/\s+\/\s+/).includes(answer)
    || item.plurals.some(plural => plural.text === answer),
  ));
  const form = row ? translate(row.label, "de") : "Wortform";
  const number = /plural/i.test(prompt.question) ? " · Plural" : "";
  return `Erinnere dich an die gerade gelernte Wortfamilie. Gesuchte Form: ${form}${number}.`;
}
