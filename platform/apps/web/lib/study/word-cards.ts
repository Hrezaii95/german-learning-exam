import type { WordCard } from "../content/word-card-types";
import { lessonFourWords,type StudyWord } from "./lesson-four";

export function lessonFourCards(): WordCard[] {
  return studyWordCards(lessonFourWords,4,"Momente A1.1 Deutsch–Englisch glossary, pp. 5–6; coursebook pp. 29–32. © Hueber Verlag.");
}
export function studyWordCards(words:StudyWord[],lesson:number,source:string):WordCard[]{
  return words.map((word) => {
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
      sourceIds: [`momente-glossary-l${String(lesson).padStart(2,"0")}`],
      teacherRows: [],
      title: word.en,
      category: noun
        ? "Noun"
        : word.category === "Verbs"
          ? "Verb"
          : ["Adjectives","Colours"].includes(word.category)
            ? "Adjective"
            : "Expression",
      lessons: [String(lesson)],
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
        ...(word.variants??[]).map(text=>({label:text.startsWith('das ')?'Neuter alternative':text.startsWith('der ')?'Masculine alternative':'Feminine alternative',meaning:word.en,singular:{text,label:'German alternative',tone:text.startsWith('das ')?'neuter' as const:text.startsWith('der ')?'male' as const:'female' as const,audio:null},plurals:[],usage:'Both articles are accepted; learn both forms.'})),
      ],
      pattern: [
        word.de,
        ...(word.variants??[]),
        ...(word.plural && word.plural !== "plural only" ? [word.plural] : []),
      ],
      tip: word.variants?.length?'Both article forms are accepted. Each form keeps its own gender colour.':noun
        ? "Recall the article together with the noun."
        : "Say the whole expression aloud.",
      examples: [{ de: word.example, en: word.translation, audio: null }],
      note: `Vocabulary follows the Lesson ${lesson} glossary and exercises; examples and English explanations are study aids.`,
      sources: [
        source,
      ],
      image: null,
      visual: "word",
      prompts: [
        {
          question: `How do you say ‘${word.en}’ in German?`,
          answers: [word.de,...(word.variants??[])],
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
      searchText: `${word.de} ${(word.variants??[]).join(' ')} ${word.en} ${word.plural} Lesson ${lesson}`,
    };
  });
}
