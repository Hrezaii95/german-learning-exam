export type LearnerInfographic = Readonly<{
  id: string;
  filename: string;
  title: string;
  textAlternative: string;
}>;

const INFOGRAPHICS = Object.freeze({
  greetings: Object.freeze({
    id: "info:l1-greetings-day:v1",
    filename: "greetings-context-day-v1.svg",
    title: "Greetings across the day",
    textAlternative: "Use Guten Morgen in the morning, Guten Tag during the day, Guten Abend in the evening, and Gute Nacht at bedtime. Hallo and Tschüs are flexible or casual; Auf Wiedersehen is a formal farewell.",
  }),
  qaRegister: Object.freeze({
    id: "info:l1-l2-qa-register:v1",
    filename: "qa-register-casual-formal-v1.svg",
    title: "Casual and formal question patterns",
    textAlternative: "Use Wie heißt du and Was bist du von Beruf in casual contexts. Use Wie heißen Sie and Was sind Sie von Beruf in formal contexts. W-questions follow W-word, finite verb, person, complement.",
  }),
  verbs: Object.freeze({
    id: "info:l2-verb-patterns:v1",
    filename: "verb-endings-regular-special-irregular-v1.svg",
    title: "Regular, spelling-adjusted, and irregular verb forms",
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
