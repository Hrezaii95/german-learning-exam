import type { WordCard } from "../content/word-card-types";
import { lessonFourWords } from "./lesson-four";

export function lessonFourCards(): WordCard[] {
  return lessonFourWords.map((word) => {
    const noun = /^(der|die|das) /.test(word.de);
    const tone = word.de.startsWith("der ")
      ? "male"
      : word.de.startsWith("das ")
        ? "neuter"
        : word.de.startsWith("die ")
          ? word.plural === "plural only"
            ? "plural"
            : "female"
          : "plain";
    return {
      id: word.id,
      path: `/vocabulary/${word.id}`,
      aliases: [],
      sourceIds: ["momente-glossary-l04"],
      teacherRows: [],
      title: word.en,
      category: noun
        ? "Noun"
        : word.category === "Verbs"
          ? "Verb"
          : word.category === "Adjectives"
            ? "Adjective"
            : "Expression",
      lessons: ["4"],
      priorities: ["Core"],
      rows: [
        {
          label:
            tone === "male"
              ? "Masculine"
              : tone === "neuter"
                ? "Neuter"
                : tone === "female"
                  ? "Feminine"
                  : tone === "plural"
                    ? "Plural"
                    : "Expression",
          meaning: word.en,
          singular: { text: word.de, label: "German", tone, audio: null },
          plurals:
            word.plural && word.plural !== "plural only"
              ? [
                  {
                    text: word.plural,
                    label: "Plural",
                    tone: "plural",
                    audio: null,
                  },
                ]
              : [],
          usage:
            word.plural === "plural only"
              ? "Used in the plural in German."
              : "",
        },
      ],
      pattern: [
        word.de,
        ...(word.plural && word.plural !== "plural only" ? [word.plural] : []),
      ],
      tip: noun
        ? "Recall the article together with the noun."
        : "Say the whole expression aloud.",
      examples: [{ de: word.example, en: word.translation, audio: null }],
      note: "Vocabulary follows the Lesson 4 glossary; examples and English explanations are study aids.",
      sources: [
        "Momente A1.1 Deutsch–Englisch glossary, pp. 5–6; coursebook pp. 29–32. © Hueber Verlag.",
      ],
      image: null,
      visual: "word",
      prompts: [
        {
          question: `How do you say ‘${word.en}’ in German?`,
          answers: [word.de],
          hint: noun ? "Include the article." : "Recall the expression.",
        },
        ...(word.plural && word.plural !== "plural only"
          ? [
              {
                question: `What is the plural of ${word.de}?`,
                answers: [word.plural],
                hint: "Plural nouns use die.",
              },
            ]
          : []),
      ],
      searchText: `${word.de} ${word.en} ${word.plural} Lesson 4`,
    };
  });
}
