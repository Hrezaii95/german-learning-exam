export type LearnerInfographic = Readonly<{
  id: string;
  filename: string;
  title: string;
  textAlternative: string;
  steps?: readonly Readonly<{ label: string; german: string; explanation: string }>[];
}>;

const INFOGRAPHICS = Object.freeze({
  greetings: Object.freeze({
    id: "info:l1-greetings-day:v1",
    filename: "greetings-context-day-v1.svg",
    title: "Greetings across the day",
    steps: [
      { label: "Morning", german: "Guten Morgen!", explanation: "Greet someone in the morning." },
      { label: "Daytime", german: "Guten Tag!", explanation: "A greeting during the day." },
      { label: "Evening", german: "Guten Abend!", explanation: "Greet someone in the evening." },
      { label: "Bedtime", german: "Gute Nacht!", explanation: "A farewell when someone is going to bed." },
      { label: "Casual", german: "Hallo! / Tschüs!", explanation: "Say hello or goodbye in a casual situation." },
      { label: "Formal farewell", german: "Auf Wiedersehen!", explanation: "A polite way to say goodbye." },
    ],
    textAlternative: "Use Guten Morgen in the morning, Guten Tag during the day, Guten Abend in the evening, and Gute Nacht at bedtime. Hallo and Tschüs are flexible or casual; Auf Wiedersehen is a formal farewell.",
  }),
  qaRegister: Object.freeze({
    id: "info:l1-l2-qa-register:v1",
    filename: "qa-register-casual-formal-v1.svg",
    title: "Casual and formal question patterns",
    steps: [
      { label: "Casual · du", german: "Wie heißt du?", explanation: "Ask someone's name in a casual conversation." },
      { label: "Formal · Sie", german: "Wie heißen Sie?", explanation: "Use the formal form when speaking politely to someone you do not know." },
      { label: "Casual · profession", german: "Was bist du von Beruf?", explanation: "Ask what someone does for work." },
      { label: "Formal · profession", german: "Was sind Sie von Beruf?", explanation: "The question changes with du or Sie." },
      { label: "Word order", german: "Was → sind → Sie → von Beruf?", explanation: "Question word → finite verb → person → rest of the question." },
    ],
    textAlternative: "Use Wie heißt du and Was bist du von Beruf in casual contexts. Use Wie heißen Sie and Was sind Sie von Beruf in formal contexts. W-questions follow W-word, finite verb, person, complement.",
  }),
  verbs: Object.freeze({
    id: "info:l2-verb-patterns:v1",
    filename: "verb-endings-regular-special-irregular-v1.svg",
    title: "Regular, spelling-adjusted, and irregular verb forms",
    steps: [
      { label: "Regular endings · wohnen", german: "ich wohne · du wohnst · er wohnt", explanation: "Keep wohn- and change the ending: -e, -st, -t." },
      { label: "Plural persons", german: "wir wohnen · ihr wohnt · sie wohnen", explanation: "The endings are -en, -t, -en. Formal Sie also uses wohnen." },
      { label: "Spelling bridge · arbeiten", german: "du arbeitest · er arbeitet · ihr arbeitet", explanation: "Insert e between arbeit- and the endings -st or -t." },
      { label: "Irregular · sein", german: "ich bin · du bist · er ist", explanation: "Learn each complete form: the stem changes." },
      { label: "Plural persons · sein", german: "wir sind · ihr seid · sie sind", explanation: "Formal Sie also uses sind." },
    ],
    textAlternative: "Arbeiten uses the stem arbeit with regular endings and an inserted e before st or t. Wohnen shows the regular pattern. Sein forms bin, bist, ist, sind, seid, sind are irregular.",
  }),
});

const ACTIVITY_INFOGRAPHICS: Readonly<Record<string, LearnerInfographic>> = Object.freeze({
  "activity:lesson-01-greetings-by-context": INFOGRAPHICS.greetings,
  "activity:lesson-01-greeting-farewell-match": INFOGRAPHICS.greetings,
  "activity:lesson-01-register-qa-builder": INFOGRAPHICS.qaRegister,
  "activity:lesson-01-heissen-sein-notice": INFOGRAPHICS.verbs,
  "activity:lesson-02-full-person-conjugation": INFOGRAPHICS.verbs,
  "activity:lesson-02-sein-arbeiten-contrast": INFOGRAPHICS.verbs,
  "activity:lesson-02-profession-qa-builder": INFOGRAPHICS.qaRegister,
});

export function infographicForActivity(activityId: string): LearnerInfographic | null {
  return ACTIVITY_INFOGRAPHICS[activityId] ?? null;
}

export function infographicForDetail(detailId: string): LearnerInfographic | null {
  if (detailId === "verb:sein" || detailId === "verb:arbeiten") return INFOGRAPHICS.verbs;
  if (detailId.startsWith("qa:")) return INFOGRAPHICS.qaRegister;
  return null;
}
