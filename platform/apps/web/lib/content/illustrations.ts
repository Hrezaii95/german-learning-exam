export type LearnerIllustrationLabel = Readonly<{
  de: string;
  en: string;
  gender: "masculine" | "feminine";
}>;

/** One encoded file: a path under `/illustrations/` plus its real pixel box. */
export type LearnerIllustrationRendition = Readonly<{
  /** Root-relative path under `/illustrations/`, before the Pages base. */
  path: string;
  width: number;
  height: number;
}>;

export type LearnerIllustrationSourceSet = Readonly<{
  type: "image/avif" | "image/webp";
  renditions: readonly LearnerIllustrationRendition[];
}>;

/**
 * Everything one media slot needs to serve the right pixels: the modern
 * formats in preference order, the raster fallback every browser can read, and
 * the intrinsic box that fixes the aspect ratio so nothing shifts on load.
 */
export type LearnerIllustrationVariant = Readonly<{
  sizes: string;
  sources: readonly LearnerIllustrationSourceSet[];
  fallback: readonly LearnerIllustrationRendition[];
  /** The rendition whose width/height are written onto the `<img>`. */
  intrinsic: LearnerIllustrationRendition;
}>;

/**
 * The two slots the same artwork is painted into, each pre-cropped: the 1:1
 * hub card box and the 4:3 detail box. Both mirror the geometry the meaning
 * plate reserves, so a card that has a picture and a card that has a plate
 * still line up inside one grid row.
 */
export type LearnerIllustrationResponsive = Readonly<{
  card: LearnerIllustrationVariant;
  detail: LearnerIllustrationVariant;
}>;

export type LearnerIllustration = Readonly<{
  id: string;
  filename: string;
  eyebrow: string;
  title: string;
  /** Language of `title` — profession concepts are titled in learner English. */
  titleLang: "de" | "en";
  caption: string;
  alt: string;
  width: number;
  height: number;
  objectPosition: string;
  labels: readonly LearnerIllustrationLabel[];
  /** Optimized multi-format sources, or `null` for the single-file legacy set. */
  responsive: LearnerIllustrationResponsive | null;
}>;

/**
 * The lesson- and activity-level set was generated before the optimized
 * derivative pipeline existed: one large PNG each, titled in German, served
 * from a single `<img src>`. Kept as-is so this change stays scoped to the
 * profession concepts.
 */
function legacyIllustration(
  fields: Omit<LearnerIllustration, "titleLang" | "responsive">,
): LearnerIllustration {
  return Object.freeze({ ...fields, titleLang: "de", responsive: null });
}

const PROFESSION_ENSEMBLE: LearnerIllustration = legacyIllustration({
  id: "illustration:l2-core-professions:v1",
  filename: "lesson-02-professions-ensemble.png",
  eyebrow: "Picture vocabulary",
  title: "Berufe in der Stadt",
  caption:
    "Six illustrated examples from the profession set. Use the article colour and the person in the scene together; the complete word list remains below.",
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

const ARCHITECT_STUDIO: LearnerIllustration = legacyIllustration({
  id: "illustration:architekt-studio:v1",
  filename: "vocabulary-architekt-studio.png",
  eyebrow: "Vocabulary in context",
  title: "der Architekt",
  caption:
    "An architect works with plans, a scale ruler, and a building model. The image is a meaning cue, not a course photo; the word forms below are the ones to learn.",
  alt: "A male architect at a studio desk holding a scale ruler beside building plans and an architectural model.",
  width: 1536,
  height: 1152,
  objectPosition: "56% 46%",
  labels: Object.freeze([
    Object.freeze({ de: "der Architekt", en: "architect", gender: "masculine" }),
  ]),
});

const GREETINGS_DAYPARTS: LearnerIllustration = legacyIllustration({
  id: "illustration:l1-greetings-dayparts:v1",
  filename: "lesson-01-greetings-dayparts.png",
  eyebrow: "Greeting in context",
  title: "Guten Morgen, guten Tag, guten Abend",
  caption: "The setting and time of day help you choose a greeting. The illustrated people are context cues; the words and register rules below are the ones to learn.",
  alt: "Three friendly greeting scenes across morning, daytime, and evening in a European city.",
  width: 1536,
  height: 1024,
  objectPosition: "50% 50%",
  labels: Object.freeze([]),
});

const VERBS_CONTEXT: LearnerIllustration = legacyIllustration({
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

const CONVERSATION_CONTEXT: LearnerIllustration = legacyIllustration({
  id: "illustration:conversation-qa:v1",
  filename: "conversation-question-answer.png",
  eyebrow: "Conversation in context",
  title: "Fragen und antworten",
  caption: "Follow the conversation ladder from a model exchange to your own answer. The image supplies social context; grading uses the taught answer patterns.",
  alt: "Two adult learners smiling and speaking together at a table in a bright library cafe.",
  width: 1536,
  height: 1024,
  objectPosition: "50% 46%",
  labels: Object.freeze([]),
});

const NAME_ORIGIN_CLASS: LearnerIllustration = legacyIllustration({
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

const WELLBEING_STATES: LearnerIllustration = legacyIllustration({
  id: "illustration:l1-wellbeing-five-states:v1",
  filename: "lesson-01-wellbeing-five-states.png",
  eyebrow: "Meaning in context",
  title: "Wie geht’s?",
  caption: "Compare five everyday wellbeing cues, then choose a taught response from very positive to not so good.",
  alt: "The same adult appears in five panels ranging from energized and happy through neutral, tired, and low mood.",
  width: 1536,
  height: 1024,
  objectPosition: "50% 50%",
  labels: Object.freeze([]),
});

const PERSONAL_PROFILE: LearnerIllustration = legacyIllustration({
  id: "illustration:l2-personal-profile:v1",
  filename: "lesson-02-personal-profile-context.png",
  eyebrow: "Profile in context",
  title: "Das bin ich",
  caption: "Connect residence, age, family, relationship status, and profession to the profile prompts without assuming any one life situation.",
  alt: "An adult completes a blank profile beside a house model, keys, birthday cake, inclusive family photo, ring, and work bag.",
  width: 1536,
  height: 1024,
  objectPosition: "48% 52%",
  labels: Object.freeze([]),
});

const PROFESSION_PAIRS: LearnerIllustration = legacyIllustration({
  id: "illustration:l2-profession-pairs:v1",
  filename: "lesson-02-core-profession-pairs-sheet.png",
  eyebrow: "Person-form pairs",
  title: "Berufe: männliche und weibliche Formen",
  caption: "Thirteen profession pairs share one coherent visual system. Use the HTML word cards below for exact articles, spelling, and morphology.",
  alt: "Thirteen matching masculine- and feminine-presenting profession pairs in a consistent illustrated card grid.",
  width: 1254,
  height: 1254,
  objectPosition: "50% 50%",
  labels: Object.freeze([]),
});

/* ---------------------------------------------------------------------------
 * Profession concept illustrations
 *
 * Original artwork commissioned for this app (`vocabulary-professions-v1`) —
 * not course material, which is why /references states that separately.
 *
 * One image per profession CONCEPT, shared by the masculine and the feminine
 * lexeme. That is the whole point of the set: every scene shows the work being
 * done — hands and tools, no face, no gendered body — so the picture cannot
 * imply which of the two words a learner is looking at. Grammatical gender is
 * carried where it can be read and checked: the article, the word ending, and
 * the gender badge.
 * ------------------------------------------------------------------------- */

const PROFESSION_ASSET_DIR = "professions";
const VOCABULARY_ASSET_DIR = "vocabulary";

/** Hub card media measures roughly 220–300 CSS px across 360 → 1440. */
const CARD_SIZES = "(min-width: 700px) 288px, 82vw";
/** Detail media is capped at the meaning plate's 32rem reserved box. */
const DETAIL_SIZES = "(min-width: 560px) 512px, 92vw";

const CARD_WIDTHS: readonly number[] = Object.freeze([240, 480]);
const DETAIL_WIDTHS: readonly number[] = Object.freeze([512, 1024]);

function rendition(
  dir: string,
  key: string,
  shape: "square" | "wide",
  extension: "avif" | "webp" | "jpg",
  width: number,
): LearnerIllustrationRendition {
  return Object.freeze({
    path: `${dir}/${key}-${shape}-${width}.${extension}`,
    width,
    height: shape === "square" ? width : Math.round((width * 3) / 4),
  });
}

function renditions(
  dir: string,
  key: string,
  shape: "square" | "wide",
  extension: "avif" | "webp" | "jpg",
  widths: readonly number[],
): readonly LearnerIllustrationRendition[] {
  return Object.freeze(widths.map((width) => rendition(dir, key, shape, extension, width)));
}

function variant(
  dir: string,
  key: string,
  shape: "square" | "wide",
  widths: readonly number[],
  sizes: string,
): LearnerIllustrationVariant {
  const largest = widths.reduce((a, b) => (b > a ? b : a), 0);
  return Object.freeze({
    sizes,
    sources: Object.freeze([
      Object.freeze({
        type: "image/avif" as const,
        renditions: renditions(dir, key, shape, "avif", widths),
      }),
      Object.freeze({
        type: "image/webp" as const,
        renditions: renditions(dir, key, shape, "webp", widths),
      }),
    ]),
    fallback: renditions(dir, key, shape, "jpg", widths),
    intrinsic: rendition(dir, key, shape, "jpg", largest),
  });
}

/** The card and detail slot pair every optimized batch is encoded into. */
function responsiveSlots(dir: string, key: string): LearnerIllustrationResponsive {
  return Object.freeze({
    card: variant(dir, key, "square", CARD_WIDTHS, CARD_SIZES),
    detail: variant(dir, key, "wide", DETAIL_WIDTHS, DETAIL_SIZES),
  });
}

type ProfessionConceptSeed = Readonly<{
  /** Asset key; also the derivative filename stem. */
  key: string;
  /** What the picture means, in learner English. Never a German word. */
  concept: string;
  /** Alt text taken verbatim from the accepted set's manifest. */
  alt: string;
  masculine: string;
  feminine: string;
  /** The two lexemes that share this one image: masculine first. */
  lexemeIds: readonly [string, string];
}>;

const PROFESSION_CAPTION =
  "One picture for both words, because it shows the work and not a person. The article, the word ending and the gender badge below are what tell the two forms apart.";

function professionConcept(seed: ProfessionConceptSeed): LearnerIllustration {
  const responsive = responsiveSlots(PROFESSION_ASSET_DIR, seed.key);
  const detail = responsive.detail;
  return Object.freeze({
    id: `illustration:profession-${seed.key}:v1`,
    filename: detail.intrinsic.path,
    eyebrow: "Vocabulary in context",
    title: seed.concept,
    titleLang: "en",
    caption: PROFESSION_CAPTION,
    alt: seed.alt,
    width: detail.intrinsic.width,
    height: detail.intrinsic.height,
    objectPosition: "50% 50%",
    labels: Object.freeze([
      Object.freeze({ de: seed.masculine, en: seed.concept, gender: "masculine" as const }),
      Object.freeze({ de: seed.feminine, en: seed.concept, gender: "feminine" as const }),
    ]),
    responsive,
  });
}

const PROFESSION_CONCEPT_SEEDS: readonly ProfessionConceptSeed[] = Object.freeze([
  Object.freeze({
    key: "arzt",
    concept: "Doctor",
    alt: "Cropped hands check a blood-pressure cuff and stethoscope on a patient’s forearm in a quiet examination room.",
    masculine: "der Arzt",
    feminine: "die Ärztin",
    lexemeIds: Object.freeze(["lex:arzt", "lex:aerztin"] as const),
  }),
  Object.freeze({
    key: "friseur",
    concept: "Hairdresser",
    alt: "Cropped hands use a comb and scissors to trim brown hair above a salon cape.",
    masculine: "der Friseur",
    feminine: "die Friseurin",
    lexemeIds: Object.freeze(["lex:friseur", "lex:friseurin"] as const),
  }),
  Object.freeze({
    key: "ingenieur",
    concept: "Engineer",
    alt: "Cropped hands measure a compact gear assembly with a caliper above an unlabeled technical drawing.",
    masculine: "der Ingenieur",
    feminine: "die Ingenieurin",
    lexemeIds: Object.freeze(["lex:ingenieur", "lex:ingenieurin"] as const),
  }),
  Object.freeze({
    key: "journalist",
    concept: "Journalist",
    alt: "Cropped hands hold a microphone and blank notebook during an interview, with a small recorder nearby.",
    masculine: "der Journalist",
    feminine: "die Journalistin",
    lexemeIds: Object.freeze(["lex:journalist", "lex:journalistin"] as const),
  }),
  Object.freeze({
    key: "kellner",
    concept: "Waiter",
    alt: "Cropped hands carry a tray with a covered dish and water while setting cutlery at a restaurant table.",
    masculine: "der Kellner",
    feminine: "die Kellnerin",
    lexemeIds: Object.freeze(["lex:kellner", "lex:kellnerin"] as const),
  }),
  Object.freeze({
    key: "kfz-mechatroniker",
    concept: "Car mechatronics technician",
    alt: "Cropped hands test a car battery with probes and a blank diagnostic meter in an open engine bay.",
    masculine: "der Kfz-Mechatroniker",
    feminine: "die Kfz-Mechatronikerin",
    lexemeIds: Object.freeze(["lex:kfz-mechatroniker", "lex:kfz-mechatronikerin"] as const),
  }),
  Object.freeze({
    key: "lehrer",
    concept: "Teacher",
    alt: "A cropped hand points to an unlabeled world map while two pupils raise their hands from classroom desks.",
    masculine: "der Lehrer",
    feminine: "die Lehrerin",
    lexemeIds: Object.freeze(["lex:lehrer", "lex:lehrerin"] as const),
  }),
  Object.freeze({
    key: "paketzusteller",
    concept: "Parcel delivery agent",
    alt: "Cropped hands pass a plain parcel at a doorway while a blank handheld scanner is held nearby.",
    masculine: "der Paketzusteller",
    feminine: "die Paketzustellerin",
    lexemeIds: Object.freeze(["lex:paketzusteller", "lex:paketzustellerin"] as const),
  }),
  Object.freeze({
    key: "rentner",
    concept: "Pensioner",
    alt: "Older hands tend a small flowering plant on a balcony table beside a mug and an unmarked book.",
    masculine: "der Rentner",
    feminine: "die Rentnerin",
    lexemeIds: Object.freeze(["lex:rentner", "lex:rentnerin"] as const),
  }),
  Object.freeze({
    key: "schueler",
    concept: "School student",
    alt: "Child-sized hands use a purple pencil and ruler to complete geometric shapes in an exercise book at a school desk.",
    masculine: "der Schüler",
    feminine: "die Schülerin",
    lexemeIds: Object.freeze(["lex:schueler", "lex:schuelerin"] as const),
  }),
  Object.freeze({
    key: "student",
    concept: "University student",
    alt: "Adult hands study an open diagram book beside a laptop with an unlabeled abstract diagram in a university library.",
    masculine: "der Student",
    feminine: "die Studentin",
    lexemeIds: Object.freeze(["lex:student", "lex:studentin"] as const),
  }),
  Object.freeze({
    key: "verkaeufer",
    concept: "Shop assistant",
    alt: "Cropped hands place a folded sweater into a plain shopping bag while a customer offers an unmarked card at a blank terminal.",
    masculine: "der Verkäufer",
    feminine: "die Verkäuferin",
    lexemeIds: Object.freeze(["lex:verkaeufer", "lex:verkaeuferin"] as const),
  }),
]);

/** lexeme id → the concept image its pair shares. Both forms resolve to one entry. */
const PROFESSION_CONCEPT_BY_LEXEME: ReadonlyMap<string, LearnerIllustration> = new Map(
  PROFESSION_CONCEPT_SEEDS.flatMap((seed) => {
    const illustration = professionConcept(seed);
    return seed.lexemeIds.map((lexemeId) => [lexemeId, illustration] as const);
  }),
);

/** The exact lexeme ids the concept set covers — read by the coverage test. */
export const PROFESSION_CONCEPT_LEXEME_IDS: readonly string[] = Object.freeze(
  PROFESSION_CONCEPT_SEEDS.flatMap((seed) => [...seed.lexemeIds]),
);

export function professionConceptIllustration(
  lexemeId: string,
): LearnerIllustration | null {
  return PROFESSION_CONCEPT_BY_LEXEME.get(lexemeId) ?? null;
}

/* ---------------------------------------------------------------------------
 * Vocabulary concept illustrations
 *
 * Original artwork commissioned for this app (`vocabulary-batch-v2`) — not
 * course material, which is why /references states that separately.
 *
 * One image per lexeme this time, because these words are not gendered pairs:
 * greetings and farewells, the wellbeing answers, and the work-and-study
 * nouns. Every scene stays a meaning cue — objects, light and cropped hands —
 * so the artwork never spells out the German word the learner is meant to
 * recall. The word itself, its article and its meaning stay in the HTML below
 * the picture, where they are selectable, searchable and readable aloud.
 *
 * Encoded from the same derivative recipe as the profession set: 1:1 at 240
 * and 480 for the hub card, 4:3 at 512 and 1024 for the detail slot, each in
 * AVIF, WebP and JPEG. The ~2MB source PNGs are never served.
 * ------------------------------------------------------------------------- */

type VocabularyConceptSeed = Readonly<{
  /** Asset key; also the derivative filename stem. */
  key: string;
  /** The single lexeme this picture belongs to. */
  lexemeId: string;
  /** The German word as a learner meets it, article included where there is one. */
  title: string;
  /** Alt text taken verbatim from the accepted set's manifest. */
  alt: string;
}>;

const VOCABULARY_CAPTION =
  "Original artwork made for this app. The picture is a meaning cue only — the word, its article and the examples below are what to learn.";

function vocabularyConcept(seed: VocabularyConceptSeed): LearnerIllustration {
  const responsive = responsiveSlots(VOCABULARY_ASSET_DIR, seed.key);
  return Object.freeze({
    id: `illustration:vocabulary-${seed.key}:v1`,
    filename: responsive.detail.intrinsic.path,
    eyebrow: "Vocabulary in context",
    title: seed.title,
    titleLang: "de",
    caption: VOCABULARY_CAPTION,
    alt: seed.alt,
    width: responsive.detail.intrinsic.width,
    height: responsive.detail.intrinsic.height,
    objectPosition: "50% 50%",
    // No label list: these entries are not masculine/feminine pairs, and the
    // article that some of them do carry is already in the title and in the
    // teaching sections underneath.
    labels: Object.freeze([]),
    responsive,
  });
}

const VOCABULARY_CONCEPT_SEEDS: readonly VocabularyConceptSeed[] = Object.freeze([
  Object.freeze({
    key: "hallo",
    lexemeId: "lex:hallo",
    title: "Hallo",
    alt: "An open hand waves against a warm neutral daylight background.",
  }),
  Object.freeze({
    key: "guten-morgen",
    lexemeId: "lex:guten-morgen",
    title: "Guten Morgen",
    alt: "Sunrise light falls across a breakfast table with a cup of coffee.",
  }),
  Object.freeze({
    key: "guten-tag",
    lexemeId: "lex:guten-tag",
    title: "Guten Tag",
    alt: "Two hands meet in a friendly handshake on a bright midday street.",
  }),
  Object.freeze({
    key: "guten-abend",
    lexemeId: "lex:guten-abend",
    title: "Guten Abend",
    alt: "A dusk sky shows through a window beside a warmly glowing lamp.",
  }),
  Object.freeze({
    key: "gute-nacht",
    lexemeId: "lex:gute-nacht",
    title: "Gute Nacht",
    alt: "A crescent moon shines through a night window beside a dim bedside lamp.",
  }),
  Object.freeze({
    key: "auf-wiedersehen",
    lexemeId: "lex:auf-wiedersehen",
    title: "Auf Wiedersehen",
    alt: "A hand waves from the window of a departing train.",
  }),
  Object.freeze({
    key: "tschues",
    lexemeId: "lex:tschues",
    title: "Tschüs",
    alt: "Two people exchange a casual wave at a cafe doorway.",
  }),
  Object.freeze({
    key: "super",
    lexemeId: "lex:super",
    title: "Super!",
    alt: "Two hands give thumbs up in bright sunburst light.",
  }),
  Object.freeze({
    key: "auch-super",
    lexemeId: "lex:auch-super",
    title: "Auch super.",
    alt: "A raised open palm pauses mid high-five in bright light.",
  }),
  Object.freeze({
    key: "sehr-gut-danke",
    lexemeId: "lex:sehr-gut-danke",
    title: "Sehr gut, danke.",
    alt: "Relaxed hands cradle a warm mug beside a sunny window.",
  }),
  Object.freeze({
    key: "gut-danke",
    lexemeId: "lex:gut-danke",
    title: "Gut, danke.",
    alt: "A steady hand gives a thumbs-up gesture in calm daylight.",
  }),
  Object.freeze({
    key: "es-geht",
    lexemeId: "lex:es-geht",
    title: "Es geht.",
    alt: "A flat hand tilts from side to side under neutral overcast light.",
  }),
  Object.freeze({
    key: "nicht-so-gut",
    lexemeId: "lex:nicht-so-gut",
    title: "Nicht so gut.",
    alt: "A hand rests against a forehead beside a grey rainy window.",
  }),
  Object.freeze({
    key: "beruf",
    lexemeId: "lex:beruf",
    title: "der Beruf",
    alt: "A workbench displays neatly arranged tools from several trades.",
  }),
  Object.freeze({
    key: "job",
    lexemeId: "lex:job",
    title: "der Job",
    alt: "A tidy desk holds a laptop, notebook, pen, and coffee cup.",
  }),
  Object.freeze({
    key: "firma",
    lexemeId: "lex:firma",
    title: "die Firma",
    alt: "A modern office building rises in repeating glass floors.",
  }),
  Object.freeze({
    key: "ausbildung",
    lexemeId: "lex:ausbildung",
    title: "die Ausbildung",
    alt: "Apprentice tools and an open instructional manual rest on a workshop bench.",
  }),
  Object.freeze({
    key: "praktikum",
    lexemeId: "lex:praktikum",
    title: "das Praktikum",
    alt: "A blank lanyard badge lies beside a notebook and pen on a desk.",
  }),
  Object.freeze({
    key: "studium",
    lexemeId: "lex:studium",
    title: "das Studium",
    alt: "An empty university lecture hall has tiered seating and books.",
  }),
]);

/** lexeme id → its own concept image. One picture, one word, no sharing. */
const VOCABULARY_CONCEPT_BY_LEXEME: ReadonlyMap<string, LearnerIllustration> = new Map(
  VOCABULARY_CONCEPT_SEEDS.map(
    (seed) => [seed.lexemeId, vocabularyConcept(seed)] as const,
  ),
);

/** The exact lexeme ids the vocabulary set covers — read by the coverage test. */
export const VOCABULARY_CONCEPT_LEXEME_IDS: readonly string[] = Object.freeze(
  VOCABULARY_CONCEPT_SEEDS.map((seed) => seed.lexemeId),
);

export function vocabularyConceptIllustration(
  lexemeId: string,
): LearnerIllustration | null {
  return VOCABULARY_CONCEPT_BY_LEXEME.get(lexemeId) ?? null;
}

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
  const concept = professionConceptIllustration(detailId);
  if (concept) return concept;
  const vocabulary = vocabularyConceptIllustration(detailId);
  if (vocabulary) return vocabulary;
  // `lex:architektin` deliberately does NOT share this asset. Every concept
  // image above is gender-neutral by construction, which is what makes one
  // picture safe for both forms. The older architect illustration shows a
  // male architect at a desk and its own alt text says so, so attaching it to
  // the feminine lexeme would assert with a picture exactly what the concept
  // set is built to avoid. `die Architektin` keeps the meaning plate until a
  // neutral architect scene exists in the same set.
  if (detailId === "lex:architekt") return ARCHITECT_STUDIO;
  if (detailId === "verb:sein" || detailId === "verb:arbeiten") return VERBS_CONTEXT;
  if (detailId.startsWith("qa:")) return CONVERSATION_CONTEXT;
  return null;
}
