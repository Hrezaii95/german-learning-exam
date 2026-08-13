import {
  LEARNER_BUILT_IN_TAGS,
  MasteryError,
  PersistenceError,
  ReviewError,
  createAlphaReviewScheduler,
  createEmptyLearnerState,
  createKeyValueLearnerStateAdapter,
  createNewReviewCard,
  eventFingerprint,
  exportLearnerStateJson,
  hydrateLearnerState,
  importLearnerStateJson,
  mapObjectiveGradeToRating,
  mapSelfRatingToReviewRating,
  masteryError,
  parseLearnerEvent,
  parseLearnerStateEnvelope,
  type BrowserLikeKeyValueStore,
  type ActivityProgressRecord,
  type LearnerBuiltInTag,
  type LearnerEvent,
  type LearnerNoteRecord,
  type LearnerSettings,
  type LearnerStateEnvelope,
  type LearnerStateHydration,
  type LearnerStateStorageAdapter,
  type RecordingMetadata,
  type ResumeState,
  type ReviewRating,
} from "@german-learning/learning";
import { assertCurrentPersistentEventLink } from "./events";
import {
  ALPHA_CONTENT_BUNDLE,
  learnerPublishedContentResolver,
  reviewTemplateForId,
  reviewTemplatesForConcept,
  stableCardIdForTemplate,
} from "./registry";

export type LearnerStateCoreStatus = "loading" | "ready" | "error";

export type LearnerStateCoreError = Readonly<{
  code: string;
  field: string | null;
  message: string;
}>;

export type LearnerStateCoreSnapshot = Readonly<{
  status: LearnerStateCoreStatus;
  hydration: LearnerStateHydration | null;
  error: LearnerStateCoreError | null;
  recoveryRequired: boolean;
  statusMessage: string;
}>;

export type LearnerStateCoreListener = (snapshot: LearnerStateCoreSnapshot) => void;

export type LearnerStateController = Readonly<{
  getSnapshot(): LearnerStateCoreSnapshot;
  subscribe(listener: LearnerStateCoreListener): () => void;
  initialize(): Promise<LearnerStateCoreSnapshot>;
  reloadFromStorage(): Promise<LearnerStateCoreSnapshot>;
  appendEvent(event: LearnerEvent): Promise<LearnerStateCoreSnapshot>;
  appendMissionEvent(event: LearnerEvent): Promise<LearnerStateCoreSnapshot>;
  addReviewCardsForConcept(conceptId: string): Promise<LearnerStateCoreSnapshot>;
  toggleTag(contentId: string, tag: LearnerBuiltInTag): Promise<LearnerStateCoreSnapshot>;
  saveNote(contentId: string, text: string): Promise<LearnerStateCoreSnapshot>;
  deleteNote(contentId: string): Promise<LearnerStateCoreSnapshot>;
  setResume(resume: ResumeState): Promise<LearnerStateCoreSnapshot>;
  startActivity(target: ActivityProgressTarget): Promise<LearnerStateCoreSnapshot>;
  completeActivity(
    target: ActivityProgressTarget,
    nextResume: ResumeState | null,
  ): Promise<LearnerStateCoreSnapshot>;
  clearResume(): Promise<LearnerStateCoreSnapshot>;
  addRecording(recording: RecordingMetadata): Promise<LearnerStateCoreSnapshot>;
  updateSettings(settings: LearnerSettings): Promise<LearnerStateCoreSnapshot>;
  exportJson(exportedAt?: string): string;
  importJson(jsonText: string, confirmed: true): Promise<LearnerStateCoreSnapshot>;
  reset(confirmed: true): Promise<LearnerStateCoreSnapshot>;
}>;

export type ActivityProgressTarget = Readonly<{
  lessonId: string;
  stageId: string;
  activityId: string;
}>;

export type CreateLearnerStateControllerOptions = Readonly<{
  store: BrowserLikeKeyValueStore;
  now?: () => Date;
  uuid?: () => string;
  adapter?: LearnerStateStorageAdapter;
}>;

function safeError(error: unknown): LearnerStateCoreError {
  if (
    error instanceof PersistenceError ||
    error instanceof ReviewError ||
    error instanceof MasteryError
  ) {
    return Object.freeze({
      code: error.code,
      field: error.field ?? null,
      message: `Learner state operation failed (${error.code}).`,
    });
  }
  return Object.freeze({
    code: "STATE_OPERATION_FAILED",
    field: null,
    message: "Learner state operation failed.",
  });
}

function defaultUuid(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("Secure UUID generation is unavailable");
  }
  return crypto.randomUUID();
}

function assertValidNow(now: Date): Date {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Invalid learner-state clock");
  }
  return now;
}

function withoutExportMetadata(
  state: LearnerStateEnvelope,
): Omit<LearnerStateEnvelope, "exportMeta"> {
  const { exportMeta: _exportMeta, ...rest } = state;
  return rest;
}

function eventRating(event: LearnerEvent): ReviewRating {
  switch (event.kind) {
    case "objectiveAttempt":
      return mapObjectiveGradeToRating(event.graderOutcome);
    case "selfRatedAttempt":
      return mapSelfRatingToReviewRating(event.rating);
    case "recordingCycle":
      if (event.selfRating === undefined) {
        throw new Error("A review recording requires an explicit self-rating");
      }
      return mapSelfRatingToReviewRating(event.selfRating);
    case "exposure":
    case "audioInteraction":
      throw new Error("This event kind cannot schedule a review card");
  }
}

function assertIanaTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
  } catch {
    throw new Error("Invalid learner timezone");
  }
}

function makeSnapshot(input: {
  status: LearnerStateCoreStatus;
  hydration: LearnerStateHydration | null;
  error?: LearnerStateCoreError | null;
  recoveryRequired?: boolean;
  statusMessage: string;
}): LearnerStateCoreSnapshot {
  return Object.freeze({
    status: input.status,
    hydration: input.hydration,
    error: input.error ?? null,
    recoveryRequired: input.recoveryRequired ?? false,
    statusMessage: input.statusMessage,
  });
}

export function createLearnerStateController(
  options: CreateLearnerStateControllerOptions,
): LearnerStateController {
  const now = options.now ?? (() => new Date());
  const uuid = options.uuid ?? defaultUuid;
  const adapter = options.adapter ?? createKeyValueLearnerStateAdapter({
    store: options.store,
    publishedIds: learnerPublishedContentResolver,
    expectedContentBundle: ALPHA_CONTENT_BUNDLE,
  });
  const listeners = new Set<LearnerStateCoreListener>();
  let snapshot = makeSnapshot({
    status: "loading",
    hydration: null,
    statusMessage: "Loading local learner state.",
  });
  let writeTail: Promise<void> = Promise.resolve();

  function publish(next: LearnerStateCoreSnapshot): LearnerStateCoreSnapshot {
    snapshot = next;
    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch {
        // Observer failures cannot roll back or corrupt an already-committed state.
      }
    }
    return snapshot;
  }

  function publishFailure(error: unknown, recoveryRequired = false): void {
    const safe = safeError(error);
    publish(makeSnapshot({
      status: "error",
      hydration: snapshot.hydration,
      error: safe,
      recoveryRequired,
      statusMessage: safe.message,
    }));
  }

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = writeTail.then(operation, operation);
    writeTail = run.then(() => undefined, () => undefined);
    return run;
  }

  function hydrate(state: LearnerStateEnvelope): LearnerStateHydration {
    return hydrateLearnerState(state, {
      publishedIds: learnerPublishedContentResolver,
      expectedContentBundle: ALPHA_CONTENT_BUNDLE,
      now: assertValidNow(now()),
    });
  }

  async function commit(
    build: (current: LearnerStateEnvelope) => LearnerStateEnvelope,
    message: string,
  ): Promise<LearnerStateCoreSnapshot> {
    return enqueue(async () => {
      const prior = snapshot.hydration;
      if (prior === null) throw new Error("Learner state is not initialized");
      try {
        const candidate = build(prior.state);
        if (candidate === prior.state) {
          return publish(makeSnapshot({
            status: "ready",
            hydration: prior,
            statusMessage: message,
          }));
        }
        const validated = parseLearnerStateEnvelope(candidate, {
          publishedIds: learnerPublishedContentResolver,
          expectedContentBundle: ALPHA_CONTENT_BUNDLE,
        });
        await adapter.replace(validated);
        return publish(makeSnapshot({
          status: "ready",
          hydration: hydrate(validated),
          statusMessage: message,
        }));
      } catch (error) {
        publishFailure(error);
        throw error;
      }
    });
  }

  async function initialize(): Promise<LearnerStateCoreSnapshot> {
    return enqueue(async () => {
      publish(makeSnapshot({
        status: "loading",
        hydration: null,
        statusMessage: "Loading local learner state.",
      }));
      try {
        let state = await adapter.load();
        if (state === null) {
          state = createEmptyLearnerState({ contentBundle: ALPHA_CONTENT_BUNDLE });
          await adapter.replace(state);
        }
        return publish(makeSnapshot({
          status: "ready",
          hydration: hydrate(state),
          statusMessage: "Local learner state is ready.",
        }));
      } catch (error) {
        publishFailure(error, true);
        return snapshot;
      }
    });
  }

  async function reloadFromStorage(): Promise<LearnerStateCoreSnapshot> {
    return enqueue(async () => {
      try {
        const state = await adapter.load();
        if (state === null) throw new Error("External learner state is missing");
        return publish(makeSnapshot({
          status: "ready",
          hydration: hydrate(state),
          statusMessage: "Local learner state was refreshed.",
        }));
      } catch (error) {
        publishFailure(error, true);
        return snapshot;
      }
    });
  }

  function appendEvent(eventInput: LearnerEvent): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => {
      const event = assertCurrentPersistentEventLink(parseLearnerEvent(eventInput));
      if (event.cardId !== undefined) {
        throw new Error("Card-linked events require appendMissionEvent");
      }
      const existing = current.events.find((row) => row.eventId === event.eventId);
      if (existing !== undefined) {
        if (eventFingerprint(existing) === eventFingerprint(event)) return current;
        throw masteryError("CONFLICTING_EVENT_ID", "Conflicting learner event ID", "eventId");
      }
      return { ...withoutExportMetadata(current), events: [...current.events, event] };
    }, "Practice evidence saved.");
  }

  function appendMissionEvent(eventInput: LearnerEvent): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => {
      const event = assertCurrentPersistentEventLink(parseLearnerEvent(eventInput));
      if (event.cardId === undefined || event.sourceActivityMode !== "mission") {
        throw new Error("Mission event must include a review card");
      }
      const existing = current.events.find((row) => row.eventId === event.eventId);
      if (existing !== undefined) {
        if (eventFingerprint(existing) === eventFingerprint(event)) return current;
        throw masteryError("CONFLICTING_EVENT_ID", "Conflicting learner event ID", "eventId");
      }
      const cardIndex = current.reviewCards.findIndex((card) => card.cardId === event.cardId);
      const card = current.reviewCards[cardIndex];
      if (card === undefined) throw new Error("Mission review card is missing");
      const template = reviewTemplateForId(card.templateId);
      if (
        template === null ||
        template.conceptId !== event.conceptId ||
        template.activityId !== event.activityId ||
        card.cardId !== stableCardIdForTemplate(template.id)
      ) {
        throw new Error("Mission event does not match its review template");
      }
      const reviewedAt = new Date(event.timestamp);
      const nextCard = createAlphaReviewScheduler().review(
        card,
        eventRating(event),
        reviewedAt,
      ).card;
      const reviewCards = [...current.reviewCards];
      reviewCards[cardIndex] = nextCard;
      return {
        ...withoutExportMetadata(current),
        events: [...current.events, event],
        reviewCards,
      };
    }, "Review evidence and schedule saved.");
  }

  function addReviewCardsForConcept(conceptId: string): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => {
      const templates = reviewTemplatesForConcept(conceptId);
      if (templates.length === 0) throw new Error("No review templates for this concept");
      const existing = new Set(current.reviewCards.map((card) => card.cardId));
      const createdAt = assertValidNow(now());
      const additions = templates
        .filter((template) => !existing.has(stableCardIdForTemplate(template.id)))
        .map((template) => createNewReviewCard({
          cardId: stableCardIdForTemplate(template.id),
          conceptId: template.conceptId,
          templateId: template.id,
          measuredDimension: template.modality,
          now: createdAt,
        }));
      if (additions.length === 0) return current;
      return {
        ...withoutExportMetadata(current),
        reviewCards: [...current.reviewCards, ...additions],
      };
    }, "Review cards added.");
  }

  function toggleTag(
    contentId: string,
    tag: LearnerBuiltInTag,
  ): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => {
      if (!(LEARNER_BUILT_IN_TAGS as readonly string[]).includes(tag)) {
        throw new Error("Unknown learner tag");
      }
      const exists = current.tags.some((row) => row.contentId === contentId && row.tag === tag);
      const tags = exists
        ? current.tags.filter((row) => !(row.contentId === contentId && row.tag === tag))
        : [...current.tags, { contentId, tag }];
      return { ...withoutExportMetadata(current), tags };
    }, "Tag updated.");
  }

  function saveNote(contentId: string, text: string): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => {
      const existing = current.notes.find((note) => note.contentId === contentId);
      const note: LearnerNoteRecord = {
        noteId: existing?.noteId ?? uuid(),
        contentId,
        text,
        updatedAt: assertValidNow(now()).toISOString(),
      };
      return {
        ...withoutExportMetadata(current),
        notes: [...current.notes.filter((row) => row.contentId !== contentId), note],
      };
    }, "Note saved.");
  }

  function deleteNote(contentId: string): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => ({
      ...withoutExportMetadata(current),
      notes: current.notes.filter((row) => row.contentId !== contentId),
    }), "Note deleted.");
  }

  function setResume(resume: ResumeState): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => ({ ...withoutExportMetadata(current), resume }), "Resume point saved.");
  }

  function startActivity(target: ActivityProgressTarget): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => {
      if (current.activityProgress.some((item) => item.activityId === target.activityId)) {
        return current;
      }
      const progress: ActivityProgressRecord = {
        ...target,
        progressState: "inProgress",
        startedAt: assertValidNow(now()).toISOString(),
      };
      return {
        ...withoutExportMetadata(current),
        activityProgress: [...current.activityProgress, progress],
        resume: { ...target, position: 0 },
      };
    }, "Activity started.");
  }

  function completeActivity(
    target: ActivityProgressTarget,
    nextResume: ResumeState | null,
  ): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => {
      const existing = current.activityProgress.find((item) => item.activityId === target.activityId);
      if (existing?.progressState === "completed") return current;
      const timestamp = assertValidNow(now()).toISOString();
      const progress: ActivityProgressRecord = {
        ...target,
        progressState: "completed",
        startedAt: existing?.startedAt ?? timestamp,
        completedAt: timestamp,
      };
      return {
        ...withoutExportMetadata(current),
        activityProgress: [
          ...current.activityProgress.filter((item) => item.activityId !== target.activityId),
          progress,
        ],
        resume: nextResume,
      };
    }, "Activity completed.");
  }

  function clearResume(): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => ({ ...withoutExportMetadata(current), resume: null }), "Resume point cleared.");
  }

  function addRecording(recording: RecordingMetadata): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => ({
      ...withoutExportMetadata(current),
      recordings: [...current.recordings, recording],
    }), "Recording metadata saved. Raw audio remains local and is not exported.");
  }

  function updateSettings(settings: LearnerSettings): Promise<LearnerStateCoreSnapshot> {
    return commit((current) => {
      assertIanaTimezone(settings.timezone);
      return { ...withoutExportMetadata(current), settings };
    }, "Settings saved.");
  }

  function exportJson(exportedAt = assertValidNow(now()).toISOString()): string {
    const state = snapshot.hydration?.state;
    if (state === undefined) throw new Error("Learner state is not initialized");
    return exportLearnerStateJson(state, {
      exportedAt,
      publishedIds: learnerPublishedContentResolver,
      expectedContentBundle: ALPHA_CONTENT_BUNDLE,
    });
  }

  function importJson(
    jsonText: string,
    confirmed: true,
  ): Promise<LearnerStateCoreSnapshot> {
    if (confirmed !== true) return Promise.reject(new Error("Import confirmation is required"));
    return enqueue(async () => {
      try {
        const imported = await importLearnerStateJson(adapter, jsonText, {
          publishedIds: learnerPublishedContentResolver,
          expectedContentBundle: ALPHA_CONTENT_BUNDLE,
          now: assertValidNow(now()),
        });
        return publish(makeSnapshot({
          status: "ready",
          hydration: imported,
          statusMessage: "Learner state imported.",
        }));
      } catch (error) {
        publishFailure(error);
        throw error;
      }
    });
  }

  function reset(confirmed: true): Promise<LearnerStateCoreSnapshot> {
    if (confirmed !== true) return Promise.reject(new Error("Reset confirmation is required"));
    return enqueue(async () => {
      try {
        const empty = createEmptyLearnerState({ contentBundle: ALPHA_CONTENT_BUNDLE });
        const validated = parseLearnerStateEnvelope(empty, {
          publishedIds: learnerPublishedContentResolver,
          expectedContentBundle: ALPHA_CONTENT_BUNDLE,
        });
        await adapter.replace(validated);
        return publish(makeSnapshot({
          status: "ready",
          hydration: hydrate(validated),
          statusMessage: "Local learner state reset.",
        }));
      } catch (error) {
        publishFailure(error, snapshot.recoveryRequired);
        throw error;
      }
    });
  }

  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener: LearnerStateCoreListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize,
    reloadFromStorage,
    appendEvent,
    appendMissionEvent,
    addReviewCardsForConcept,
    toggleTag,
    saveNote,
    deleteNote,
    setResume,
    startActivity,
    completeActivity,
    clearResume,
    addRecording,
    updateSettings,
    exportJson,
    importJson,
    reset,
  });
}
