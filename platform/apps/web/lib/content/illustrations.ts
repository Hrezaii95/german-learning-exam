export type LearnerIllustrationLabel = Readonly<{
  de: string;
  en: string;
  gender: "masculine" | "feminine";
}>;

export type LearnerIllustration = Readonly<{
  id: string;
  filename: string;
  eyebrow: string;
  title: string;
  caption: string;
  alt: string;
  width: number;
  height: number;
  objectPosition: string;
  labels: readonly LearnerIllustrationLabel[];
}>;

const PROFESSION_ENSEMBLE: LearnerIllustration = Object.freeze({
  id: "illustration:l2-core-professions:v1",
  filename: "lesson-02-professions-ensemble.png",
  eyebrow: "Picture vocabulary",
  title: "Berufe in der Stadt",
  caption:
    "Six illustrated examples from the published profession set. Use the article colour and the person in the scene together; the complete word list remains below.",
  alt: "Six professionals standing in a city and workplace scene: a doctor, architect, teacher, journalist, waitress, and shop assistant.",
  width: 2048,
  height: 1152,
  objectPosition: "50% 46%",
  labels: Object.freeze([
    Object.freeze({ de: "die Ärztin", en: "doctor", gender: "feminine" }),
    Object.freeze({ de: "der Architekt", en: "architect", gender: "masculine" }),
    Object.freeze({ de: "die Lehrerin", en: "teacher", gender: "feminine" }),
    Object.freeze({ de: "der Journalist", en: "journalist", gender: "masculine" }),
    Object.freeze({ de: "die Kellnerin", en: "waitress", gender: "feminine" }),
    Object.freeze({ de: "der Verkäufer", en: "shop assistant", gender: "masculine" }),
  ]),
});

const ARCHITECT_STUDIO: LearnerIllustration = Object.freeze({
  id: "illustration:architekt-studio:v1",
  filename: "vocabulary-architekt-studio.png",
  eyebrow: "Vocabulary in context",
  title: "der Architekt",
  caption:
    "An architect works with plans, a scale ruler, and a building model. The image is a meaning cue; the published word forms below remain authoritative.",
  alt: "A male architect at a studio desk holding a scale ruler beside building plans and an architectural model.",
  width: 1536,
  height: 1152,
  objectPosition: "56% 46%",
  labels: Object.freeze([
    Object.freeze({ de: "der Architekt", en: "architect", gender: "masculine" }),
  ]),
});

const GREETINGS_DAYPARTS: LearnerIllustration = Object.freeze({
  id: "illustration:l1-greetings-dayparts:v1",
  filename: "lesson-01-greetings-dayparts.png",
  eyebrow: "Greeting in context",
  title: "Guten Morgen, guten Tag, guten Abend",
  caption: "The setting and time of day help you choose a greeting. The illustrated people are context cues; the published words and register rules remain authoritative.",
  alt: "Three friendly greeting scenes across morning, daytime, and evening in a European city.",
  width: 1536,
  height: 1024,
  objectPosition: "50% 50%",
  labels: Object.freeze([]),
});

const VERBS_CONTEXT: LearnerIllustration = Object.freeze({
  id: "illustration:arbeiten-sein-context:v1",
  filename: "verbs-arbeiten-sein-context.png",
  eyebrow: "Verb in context",
  title: "arbeiten und sein",
  caption: "One scene shows an observable action—working—while the other shows a state. Use the forms and examples below to learn the grammar precisely.",
  alt: "A woman working at a laptop and the same woman resting at home, contrasting an action with a state.",
  width: 1536,
  height: 1024,
  objectPosition: "50% 50%",
  labels: Object.freeze([]),
});

const CONVERSATION_CONTEXT: LearnerIllustration = Object.freeze({
  id: "illustration:conversation-qa:v1",
  filename: "conversation-question-answer.png",
  eyebrow: "Conversation in context",
  title: "Fragen und antworten",
  caption: "Follow the conversation ladder from a model exchange to your own answer. The image supplies social context; grading uses the published patterns.",
  alt: "Two adult learners smiling and speaking together at a table in a bright library cafe.",
  width: 1536,
  height: 1024,
  objectPosition: "50% 46%",
  labels: Object.freeze([]),
});

const NAME_ORIGIN_CLASS: LearnerIllustration = Object.freeze({
  id: "illustration:l1-name-origin-class:v1",
  filename: "lesson-01-name-origin-class.png",
  eyebrow: "Introduction in context",
  title: "Name, Herkunft und Buchstabieren",
  caption: "Use the classroom cues to practise introducing yourself, spelling a name, and saying where you come from. Words and answers remain selectable HTML below.",
  alt: "Four adults in a language class use a blank name badge, symbol tiles, a globe, and a landscape postcard while introducing themselves.",
  width: 1536,
  height: 1024,
  objectPosition: "50% 45%",
  labels: Object.freeze([]),
});

const WELLBEING_STATES: LearnerIllustration = Object.freeze({
  id: "illustration:l1-wellbeing-five-states:v1",
  filename: "lesson-01-wellbeing-five-states.png",
  eyebrow: "Meaning in context",
  title: "Wie geht’s?",
  caption: "Compare five everyday wellbeing cues, then choose a published response from very positive to not so good.",
  alt: "The same adult appears in five panels ranging from energized and happy through neutral, tired, and low mood.",
  width: 1536,
  height: 1024,
  objectPosition: "50% 50%",
  labels: Object.freeze([]),
});

const PERSONAL_PROFILE: LearnerIllustration = Object.freeze({
  id: "illustration:l2-personal-profile:v1",
  filename: "lesson-02-personal-profile-context.png",
  eyebrow: "Profile in context",
  title: "Das bin ich",
  caption: "Connect residence, age, family, relationship status, and profession to the published profile prompts without assuming any one life situation.",
  alt: "An adult completes a blank profile beside a house model, keys, birthday cake, inclusive family photo, ring, and work bag.",
  width: 1536,
  height: 1024,
  objectPosition: "48% 52%",
  labels: Object.freeze([]),
});

const PROFESSION_PAIRS: LearnerIllustration = Object.freeze({
  id: "illustration:l2-profession-pairs:v1",
  filename: "lesson-02-core-profession-pairs-sheet.png",
  eyebrow: "Person-form pairs",
  title: "Berufe: männliche und weibliche Formen",
  caption: "Thirteen published profession pairs share one coherent visual system. Use the HTML word cards below for exact articles, spelling, and morphology.",
  alt: "Thirteen matching masculine- and feminine-presenting profession pairs in a consistent illustrated card grid.",
  width: 1254,
  height: 1254,
  objectPosition: "50% 50%",
  labels: Object.freeze([]),
});

export function illustrationForActivity(activityId: string): LearnerIllustration | null {
  if (activityId === "activity:lesson-02-core-professions") return PROFESSION_ENSEMBLE;
  if (activityId === "activity:lesson-01-greetings-by-context" || activityId === "activity:lesson-01-greeting-farewell-match") return GREETINGS_DAYPARTS;
  if (activityId === "activity:lesson-01-heissen-sein-notice" || activityId === "activity:lesson-02-full-person-conjugation" || activityId === "activity:lesson-02-sein-arbeiten-contrast") return VERBS_CONTEXT;
  if (activityId === "activity:lesson-01-register-qa-builder" || activityId === "activity:lesson-02-profession-qa-builder") return CONVERSATION_CONTEXT;
  if (["activity:lesson-01-name-model-dialogue", "activity:lesson-01-origin-aus-contrast", "activity:lesson-01-alphabet-listen-spell", "activity:lesson-01-guided-intro-recording", "activity:lesson-01-checkpoint-summary"].includes(activityId)) return NAME_ORIGIN_CLASS;
  if (activityId === "activity:lesson-01-wellbeing-scale") return WELLBEING_STATES;
  if (["activity:lesson-02-personal-profile", "activity:lesson-02-relationship-status", "activity:lesson-02-profile-reading-writing", "activity:lesson-02-checkpoint-summary"].includes(activityId)) return PERSONAL_PROFILE;
  if (["activity:lesson-02-person-form-morphology", "activity:lesson-02-sein-arbeiten-contrast"].includes(activityId)) return PROFESSION_PAIRS;
  return null;
}

export function illustrationForLesson(lessonId: string): LearnerIllustration | null {
  if (lessonId === "lesson:01") return NAME_ORIGIN_CLASS;
  if (lessonId === "lesson:02") return PROFESSION_ENSEMBLE;
  return null;
}

export function illustrationForDetail(detailId: string): LearnerIllustration | null {
  if (detailId === "lex:architekt") return ARCHITECT_STUDIO;
  if (detailId === "verb:sein" || detailId === "verb:arbeiten") return VERBS_CONTEXT;
  if (detailId.startsWith("qa:")) return CONVERSATION_CONTEXT;
  return null;
}
