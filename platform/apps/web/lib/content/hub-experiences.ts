import type { ContentIndexes } from "@german-learning/content";
import {
  workbookAudioForActivity,
  type WorkbookAudioTrack,
} from "../audio/workbook-audio";
import {
  activityCanonicalPath,
  isAbsoluteNormalizedPathname,
} from "./path-utils";
import type {
  LearnerConceptHubAction,
  LearnerConceptTopic,
  LearnerConceptsHubExperience,
  LearnerHubActivityAction,
  LearnerHubDefinition,
  LearnerHubExperience,
  LearnerListeningGroup,
  LearnerListeningHubExperience,
  LearnerListeningTrack,
} from "./hub-types";
import type { HubQueryState } from "./hub-query";
import { queryMatchKeys } from "./match-keys";

type LessonId = "lesson:01" | "lesson:02";

type ListeningGroupSeed = Readonly<{
  id: string;
  lessonId: LessonId;
  lessonNumber: 1 | 2;
  exercise: string;
  purpose: string;
  activityId: string;
  trackIds: readonly string[];
}>;

type ConceptTopicSeed = Readonly<{
  id: string;
  displayLabel: string;
  summary: string;
  lessonIds: readonly LessonId[];
  sourceEntityIds: readonly string[];
  activities: readonly Readonly<{
    activityId: string;
    lessonId: LessonId;
    lessonNumber: 1 | 2;
    label: string;
  }>[];
  hubActions: readonly LearnerConceptHubAction[];
}>;

const LISTENING_GROUP_SEEDS: readonly ListeningGroupSeed[] = Object.freeze([
  Object.freeze({
    id: "listening:lesson-01-ab-3",
    lessonId: "lesson:01",
    lessonNumber: 1,
    exercise: "AB 3",
    purpose: "Names and spelling",
    activityId: "activity:lesson-01-alphabet-listen-spell",
    trackIds: Object.freeze(["1_01", "1_02", "1_03", "1_04"]),
  }),
  Object.freeze({
    id: "listening:lesson-01-ab-9a",
    lessonId: "lesson:01",
    lessonNumber: 1,
    exercise: "AB 9a",
    purpose: "Sentence melody model",
    activityId: "activity:lesson-01-workbook-listening",
    trackIds: Object.freeze(["1_05"]),
  }),
  Object.freeze({
    id: "listening:lesson-01-ab-9b",
    lessonId: "lesson:01",
    lessonNumber: 1,
    exercise: "AB 9b",
    purpose: "Sentence melody comparison",
    activityId: "activity:lesson-01-workbook-listening",
    trackIds: Object.freeze(["1_06"]),
  }),
  Object.freeze({
    id: "listening:lesson-02-ab-6a",
    lessonId: "lesson:02",
    lessonNumber: 2,
    exercise: "AB 6a",
    purpose: "Telephone-number discrimination",
    activityId: "activity:lesson-02-numbers-0-100",
    trackIds: Object.freeze(["1_07", "1_08", "1_09", "1_10"]),
  }),
  Object.freeze({
    id: "listening:lesson-02-ab-6b",
    lessonId: "lesson:02",
    lessonNumber: 2,
    exercise: "AB 6b",
    purpose: "Telephone-number transcription",
    activityId: "activity:lesson-02-numbers-0-100",
    trackIds: Object.freeze(["1_11", "1_12", "1_13", "1_14"]),
  }),
  Object.freeze({
    id: "listening:lesson-02-ab-12",
    lessonId: "lesson:02",
    lessonNumber: 2,
    exercise: "AB 12",
    purpose: "Profession word stress and repetition",
    activityId: "activity:lesson-02-core-professions",
    trackIds: Object.freeze(["1_15"]),
  }),
]);

const CONCEPT_TOPIC_SEEDS: readonly ConceptTopicSeed[] = Object.freeze([
  Object.freeze({
    id: "concept:greetings-wellbeing",
    displayLabel: "Greetings, farewells & wellbeing",
    summary:
      "Lesson 1 greeting contexts, farewell vocabulary, and casual/formal wellbeing exchanges in one review path.",
    lessonIds: Object.freeze(["lesson:01"] as const),
    sourceEntityIds: Object.freeze([
      "lex:hallo",
      "lex:auf-wiedersehen",
      "qa:wellbeing-casual",
      "qa:wellbeing-formal",
    ]),
    activities: Object.freeze([
      Object.freeze({
        activityId: "activity:lesson-01-greetings-by-context",
        lessonId: "lesson:01",
        lessonNumber: 1,
        label: "Greeting contexts",
      }),
      Object.freeze({
        activityId: "activity:lesson-01-wellbeing-scale",
        lessonId: "lesson:01",
        lessonNumber: 1,
        label: "Wellbeing phrases",
      }),
    ]),
    hubActions: Object.freeze([
      Object.freeze({ label: "Greeting vocabulary", path: "/vocabulary?category=interjection" }),
      Object.freeze({ label: "Wellbeing Q&A", path: "/phrases?q=Wie%20geht" }),
    ]),
  }),
  Object.freeze({
    id: "concept:names-identity-spelling",
    displayLabel: "Names, identity & spelling",
    summary:
      "Lesson 1 name and identity question patterns connected to alphabet listening and spelling practice.",
    lessonIds: Object.freeze(["lesson:01"] as const),
    sourceEntityIds: Object.freeze([
      "qa:name-casual",
      "qa:name-formal",
      "qa:identity",
      "gram:w-questions-l1",
    ]),
    activities: Object.freeze([
      Object.freeze({
        activityId: "activity:lesson-01-name-model-dialogue",
        lessonId: "lesson:01",
        lessonNumber: 1,
        label: "Name model dialogue",
      }),
      Object.freeze({
        activityId: "activity:lesson-01-alphabet-listen-spell",
        lessonId: "lesson:01",
        lessonNumber: 1,
        label: "Listen and spell",
      }),
    ]),
    hubActions: Object.freeze([
      Object.freeze({ label: "Name phrases", path: "/phrases?q=hei%C3%9F" }),
      Object.freeze({ label: "W-questions", path: "/grammar?q=W-Fragen" }),
      Object.freeze({ label: "Workbook listening", path: "/listening?lesson=01&q=AB%203" }),
    ]),
  }),
  Object.freeze({
    id: "concept:origin-aus",
    displayLabel: "Origin, countries & aus",
    summary:
      "Lesson 1 origin questions and country vocabulary connected to the Herkunft mit aus grammar concept.",
    lessonIds: Object.freeze(["lesson:01"] as const),
    sourceEntityIds: Object.freeze([
      "gram:aus-origin-l1",
      "verb:kommen",
      "qa:origin-casual",
      "qa:origin-formal",
      "lex:deutschland",
    ]),
    activities: Object.freeze([
      Object.freeze({
        activityId: "activity:lesson-01-origin-aus-contrast",
        lessonId: "lesson:01",
        lessonNumber: 1,
        label: "Origin and aus contrast",
      }),
    ]),
    hubActions: Object.freeze([
      Object.freeze({ label: "Origin grammar", path: "/grammar?q=Herkunft" }),
      Object.freeze({ label: "Origin Q&A", path: "/phrases?q=Woher" }),
      Object.freeze({ label: "Country vocabulary", path: "/vocabulary?category=proper-noun" }),
    ]),
  }),
  Object.freeze({
    id: "concept:register-introductions",
    displayLabel: "du/Sie register & introductions",
    summary:
      "Lesson 1 informal and formal introductions connected to the du und Sie grammar distinction.",
    lessonIds: Object.freeze(["lesson:01"] as const),
    sourceEntityIds: Object.freeze([
      "gram:du-sie-register-l1",
      "qa:name-casual",
      "qa:name-formal",
      "gram:personal-pronouns-l1",
    ]),
    activities: Object.freeze([
      Object.freeze({
        activityId: "activity:lesson-01-register-qa-builder",
        lessonId: "lesson:01",
        lessonNumber: 1,
        label: "Casual/formal Q&A builder",
      }),
      Object.freeze({
        activityId: "activity:lesson-01-guided-intro-recording",
        lessonId: "lesson:01",
        lessonNumber: 1,
        label: "Guided introduction",
      }),
    ]),
    hubActions: Object.freeze([
      Object.freeze({ label: "du and Sie grammar", path: "/grammar?q=du%20und%20Sie" }),
      Object.freeze({ label: "Formal phrases", path: "/phrases?category=formal" }),
      Object.freeze({ label: "Informal phrases", path: "/phrases?category=informal" }),
    ]),
  }),
  Object.freeze({
    id: "concept:personal-profile",
    displayLabel: "Personal profile, numbers & status",
    summary:
      "Lesson 2 profile fields, age and residence exchanges, telephone-number listening, and nicht contrasts.",
    lessonIds: Object.freeze(["lesson:02"] as const),
    sourceEntityIds: Object.freeze([
      "lex:alter",
      "lex:familienstand",
      "qa:age-casual",
      "qa:residence-casual",
      "gram:nicht-profile-negation-l2",
    ]),
    activities: Object.freeze([
      Object.freeze({
        activityId: "activity:lesson-02-personal-profile",
        lessonId: "lesson:02",
        lessonNumber: 2,
        label: "Personal profile",
      }),
      Object.freeze({
        activityId: "activity:lesson-02-numbers-0-100",
        lessonId: "lesson:02",
        lessonNumber: 2,
        label: "Numbers and telephone listening",
      }),
      Object.freeze({
        activityId: "activity:lesson-02-relationship-status",
        lessonId: "lesson:02",
        lessonNumber: 2,
        label: "Relationship and status",
      }),
    ]),
    hubActions: Object.freeze([
      Object.freeze({ label: "Profile vocabulary", path: "/vocabulary?lesson=02" }),
      Object.freeze({ label: "Age and residence Q&A", path: "/phrases?lesson=02" }),
      Object.freeze({ label: "Number listening", path: "/listening?lesson=02&q=AB%206" }),
    ]),
  }),
  Object.freeze({
    id: "concept:professions-person-forms",
    displayLabel: "Professions, person forms & present tense",
    summary:
      "Lesson 2 profession vocabulary and expressions connected to feminine person forms and full present-tense person forms.",
    lessonIds: Object.freeze(["lesson:02"] as const),
    sourceEntityIds: Object.freeze([
      "lex:architekt",
      "lex:architektin",
      "gram:profession-expressions-l2",
      "gram:profession-feminine-forms-l2",
      "gram:full-present-person-forms-l2",
      "qa:profession-casual-main",
    ]),
    activities: Object.freeze([
      Object.freeze({
        activityId: "activity:lesson-02-core-professions",
        lessonId: "lesson:02",
        lessonNumber: 2,
        label: "Core professions",
      }),
      Object.freeze({
        activityId: "activity:lesson-02-person-form-morphology",
        lessonId: "lesson:02",
        lessonNumber: 2,
        label: "Person-form morphology",
      }),
      Object.freeze({
        activityId: "activity:lesson-02-full-person-conjugation",
        lessonId: "lesson:02",
        lessonNumber: 2,
        label: "Full-person conjugation",
      }),
      Object.freeze({
        activityId: "activity:lesson-02-profession-qa-builder",
        lessonId: "lesson:02",
        lessonNumber: 2,
        label: "Profession Q&A",
      }),
    ]),
    hubActions: Object.freeze([
      Object.freeze({ label: "Profession vocabulary", path: "/vocabulary?lesson=02&q=Beruf" }),
      Object.freeze({ label: "Profession grammar", path: "/grammar?lesson=02&q=Beruf" }),
      Object.freeze({ label: "Profession phrases", path: "/phrases?lesson=02&q=Beruf" }),
      Object.freeze({ label: "Verb hub", path: "/verbs" }),
      Object.freeze({ label: "Word-stress listening", path: "/listening?lesson=02&q=AB%2012" }),
    ]),
  }),
]);

function assertPublished(indexes: ContentIndexes, id: string, expectedKind?: string): void {
  const record = indexes.byId.get(id);
  if (!record || record.publicationStatus !== "published") {
    throw new Error("HUB_EXPERIENCE_REQUIRES_PUBLISHED_SOURCE");
  }
  if (expectedKind && record.kind !== expectedKind) {
    throw new Error("HUB_EXPERIENCE_SOURCE_KIND_MISMATCH");
  }
}

function projectActivityAction(
  indexes: ContentIndexes,
  activity: {
    activityId: string;
    lessonId: LessonId;
    lessonNumber: 1 | 2;
    label: string;
  },
): LearnerHubActivityAction {
  assertPublished(indexes, activity.activityId, "LearningActivity");
  const record = indexes.byId.get(activity.activityId)!;
  if (!record.lessonIds.includes(activity.lessonId)) {
    throw new Error("HUB_EXPERIENCE_ACTIVITY_LESSON_MISMATCH");
  }
  const path = activityCanonicalPath(activity.lessonNumber, activity.activityId);
  if (!isAbsoluteNormalizedPathname(path)) {
    throw new Error("HUB_EXPERIENCE_ACTIVITY_PATH_UNSAFE");
  }
  return Object.freeze({
    activityId: activity.activityId,
    label: activity.label,
    lessonId: activity.lessonId,
    path,
  });
}

function allWorkbookTracksForId(trackId: string): readonly WorkbookAudioTrack[] {
  const ownerActivities = [
    "activity:lesson-01-alphabet-listen-spell",
    "activity:lesson-01-workbook-listening",
    "activity:lesson-02-numbers-0-100",
    "activity:lesson-02-core-professions",
  ] as const;
  return ownerActivities
    .flatMap((activityId) => workbookAudioForActivity(activityId))
    .filter((track) => track.id === trackId);
}

export function publicWorkbookTrackForId(trackId: string): WorkbookAudioTrack | null {
  return allWorkbookTracksForId(trackId)[0] ?? null;
}

function projectListeningTrack(seed: ListeningGroupSeed, trackId: string): LearnerListeningTrack {
  const matches = allWorkbookTracksForId(trackId);
  const track = matches[0];
  if (!track || track.exercise !== seed.exercise || track.purpose !== seed.purpose) {
    throw new Error("LISTENING_HUB_TRACK_REGISTRY_MISMATCH");
  }
  return Object.freeze({
    id: `workbook:${track.id}`,
    trackId: track.id,
    lessonId: seed.lessonId,
    exercise: track.exercise,
    purpose: track.purpose,
    durationSeconds: track.durationSeconds,
  });
}

export function projectListeningHubExperience(
  indexes: ContentIndexes,
): LearnerListeningHubExperience {
  const groups: LearnerListeningGroup[] = LISTENING_GROUP_SEEDS.map((seed) => {
    const activity = projectActivityAction(indexes, {
      activityId: seed.activityId,
      lessonId: seed.lessonId,
      lessonNumber: seed.lessonNumber,
      label: `Open ${seed.exercise} activity`,
    });
    return Object.freeze({
      id: seed.id,
      lessonId: seed.lessonId,
      lessonLabel: `Lesson ${String(seed.lessonNumber).padStart(2, "0")}`,
      exercise: seed.exercise,
      purpose: seed.purpose,
      activity,
      tracks: Object.freeze(seed.trackIds.map((id) => projectListeningTrack(seed, id))),
    });
  });
  const tracks = groups.flatMap((group) => group.tracks);
  const uniqueIds = new Set(tracks.map((track) => track.trackId));
  if (tracks.length !== 15 || uniqueIds.size !== tracks.length) {
    throw new Error("LISTENING_HUB_APPROVED_TRACK_SET_MISMATCH");
  }
  return Object.freeze({
    kind: "listening",
    itemCount: tracks.length,
    groups: Object.freeze(groups),
  });
}

function validateHubAction(action: LearnerConceptHubAction): LearnerConceptHubAction {
  const [pathname] = action.path.split("?", 1);
  if (!pathname || !isAbsoluteNormalizedPathname(pathname)) {
    throw new Error("CONCEPT_HUB_ACTION_PATH_UNSAFE");
  }
  return Object.freeze({ ...action });
}

export function projectConceptsHubExperience(
  indexes: ContentIndexes,
): LearnerConceptsHubExperience {
  const topics: LearnerConceptTopic[] = CONCEPT_TOPIC_SEEDS.map((seed) => {
    for (const sourceId of seed.sourceEntityIds) assertPublished(indexes, sourceId);
    const activities = seed.activities.map((activity) =>
      projectActivityAction(indexes, activity),
    );
    const topic: LearnerConceptTopic = {
      id: seed.id,
      publicationStatus: "published",
      displayLabel: seed.displayLabel,
      summary: seed.summary,
      lessonIds: Object.freeze([...seed.lessonIds]),
      sourceEntityIds: Object.freeze([...seed.sourceEntityIds]),
      activities: Object.freeze(activities),
      hubActions: Object.freeze(seed.hubActions.map(validateHubAction)),
    };
    return Object.freeze(topic);
  });
  if (topics.length !== 6 || new Set(topics.map((topic) => topic.id)).size !== topics.length) {
    throw new Error("CONCEPTS_HUB_TOPIC_SET_MISMATCH");
  }
  return Object.freeze({
    kind: "concepts",
    itemCount: topics.length,
    topics: Object.freeze(topics),
  });
}

export function projectHubExperience(
  indexes: ContentIndexes,
  hubId: LearnerHubDefinition["id"],
): LearnerHubExperience | null {
  if (hubId === "listening") return projectListeningHubExperience(indexes);
  if (hubId === "concepts") return projectConceptsHubExperience(indexes);
  return null;
}

export function hubVisibleItemCount(hub: LearnerHubDefinition): number {
  return hub.experience?.itemCount ?? hub.itemCount;
}

function matchesQuery(haystack: readonly string[], query: string): boolean {
  const queryKeys = queryMatchKeys(query.trim());
  if (queryKeys.length === 0) return true;
  const haystackKeys = haystack.flatMap(queryMatchKeys);
  return queryKeys.every((queryKey) =>
    haystackKeys.some(
      (key) =>
        key === queryKey ||
        key.startsWith(queryKey) ||
        (queryKey.length >= 2 && key.includes(queryKey)),
    ),
  );
}

function matchesLesson(lessonIds: readonly LessonId[], lesson: HubQueryState["lesson"]): boolean {
  if (lesson === "all") return true;
  return lessonIds.includes(`lesson:${lesson}`);
}

export function filterListeningGroups(
  experience: LearnerListeningHubExperience,
  query: HubQueryState,
): readonly LearnerListeningGroup[] {
  return experience.groups.filter(
    (group) =>
      matchesLesson([group.lessonId], query.lesson) &&
      matchesQuery(
        [group.lessonLabel, group.exercise, group.purpose, ...group.tracks.map((track) => track.trackId)],
        query.q,
      ),
  );
}

export function filterConceptTopics(
  experience: LearnerConceptsHubExperience,
  query: HubQueryState,
): readonly LearnerConceptTopic[] {
  return experience.topics.filter(
    (topic) =>
      matchesLesson(topic.lessonIds, query.lesson) &&
      matchesQuery(
        [
          topic.displayLabel,
          topic.summary,
          ...topic.activities.map((activity) => activity.label),
          ...topic.hubActions.map((action) => action.label),
        ],
        query.q,
      ),
  );
}
