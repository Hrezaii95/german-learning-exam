import {
  eventFingerprint,
  isIsoTimestampWithTimezone,
  parseLearnerEvent,
} from "../mastery/events.js";
import type { LearnerEvent, MasteryDimension } from "../mastery/index.js";
import { rewardsError } from "./errors.js";
import type {
  DailyXpRow,
  DeriveRewardsOptions,
  DerivedRewardBadge,
  DerivedRewardsView,
  RewardBadgeId,
} from "./types.js";

const XP_BY_OUTCOME = Object.freeze({
  incorrect: 2,
  partial: 5,
  correct: 10,
} as const);

const MAX_AWARDED_EVENTS_PER_SIGNATURE_DAY = 3;
const THREE_DIMENSION_TARGET = 3;
const TWO_DATE_TARGET = 2;
const SEVEN_DAY_TARGET = 7;

type AwardedEvent = {
  readonly event: LearnerEvent;
  readonly localDate: string;
  readonly xp: number;
};

type MutableDailyXp = {
  xp: number;
  meaningfulEventCount: number;
};

type ParsedNow = {
  readonly date: Date;
  readonly instantNanoseconds: bigint;
};

const FRACTION_RE = /\.(\d{1,9})(?=Z|[+-]\d{2}:\d{2}$)/;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function instantNanoseconds(timestamp: string): bigint {
  const milliseconds = Date.parse(timestamp);
  const fractionalDigits = FRACTION_RE.exec(timestamp)?.[1] ?? "";
  const nanosecondsWithinSecond = Number(fractionalDigits.padEnd(9, "0"));
  const nanosecondsBeyondMilliseconds = nanosecondsWithinSecond % 1_000_000;
  return BigInt(milliseconds) * 1_000_000n + BigInt(nanosecondsBeyondMilliseconds);
}

function parseNow(now: Date | string): ParsedNow {
  if (now instanceof Date) {
    const milliseconds = now.getTime();
    if (!Number.isFinite(milliseconds)) {
      throw rewardsError("INVALID_NOW", "now must be a valid date", "now");
    }
    return {
      date: new Date(milliseconds),
      instantNanoseconds: BigInt(milliseconds) * 1_000_000n,
    };
  }

  if (!isIsoTimestampWithTimezone(now)) {
    throw rewardsError(
      "INVALID_NOW",
      "now must be an ISO-8601 timestamp with timezone",
      "now",
    );
  }
  return {
    date: new Date(now),
    instantNanoseconds: instantNanoseconds(now),
  };
}

function createLocalDateFormatter(timezone: string): Intl.DateTimeFormat {
  if (
    typeof timezone !== "string" ||
    timezone.length === 0 ||
    timezone.trim() !== timezone ||
    timezone.startsWith("+") ||
    timezone.startsWith("-")
  ) {
    throw rewardsError("INVALID_TIMEZONE", "timezone must be a valid IANA timezone", "timezone");
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      calendar: "gregory",
      numberingSystem: "latn",
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      era: "short",
    });
  } catch {
    throw rewardsError("INVALID_TIMEZONE", "timezone must be a valid IANA timezone", "timezone");
  }
}

function toLocalDate(date: Date, formatter: Intl.DateTimeFormat): string {
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const era = parts.find((part) => part.type === "era")?.value;

  if (year === undefined || month === undefined || day === undefined || era === undefined) {
    throw rewardsError("INVALID_TIMEZONE", "timezone could not produce a calendar date", "timezone");
  }
  const displayedYear = Number(year);
  const astronomicalYear = era === "BC" ? 1 - displayedYear : displayedYear;
  if (
    !Number.isInteger(astronomicalYear) ||
    astronomicalYear < 0 ||
    astronomicalYear > 9999
  ) {
    throw rewardsError(
      "INVALID_TIMEZONE",
      "timezone produced a date outside the supported four-digit calendar range",
      "timezone",
    );
  }
  return `${String(astronomicalYear).padStart(4, "0")}-${month}-${day}`;
}

function localDateOrdinal(localDate: string): number {
  const [yearText, monthText, dayText] = localDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  // Proleptic Gregorian days-from-civil avoids Date.UTC's special handling of years 0–99.
  const adjustedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const adjustedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146_097 + dayOfEra;
}

function eventXp(event: LearnerEvent): number {
  switch (event.kind) {
    case "exposure":
      return 0;
    case "objectiveAttempt":
      return XP_BY_OUTCOME[event.graderOutcome];
    case "selfRatedAttempt":
      return 3;
    case "audioInteraction":
      return event.hasLinkedTask ? XP_BY_OUTCOME[event.graderOutcome] : 0;
    case "recordingCycle":
      return event.recordCompleted && event.playbackCompleted && event.selfCheckCompleted ? 8 : 0;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

function antiFarmSignature(event: LearnerEvent): string {
  switch (event.kind) {
    case "objectiveAttempt":
    case "selfRatedAttempt":
      return `${event.conceptId}\u0000${event.kind}\u0000${event.taskFamily}`;
    case "audioInteraction":
      return `${event.conceptId}\u0000${event.kind}\u0000${
        event.hasLinkedTask ? "linked-task" : "unlinked-audio"
      }`;
    case "recordingCycle":
      return `${event.conceptId}\u0000${event.kind}\u0000recording`;
    case "exposure":
      return `${event.conceptId}\u0000${event.kind}\u0000${event.exposureKind}`;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

function normalizedUniqueEvents(inputs: readonly unknown[]): LearnerEvent[] {
  if (!Array.isArray(inputs)) {
    throw rewardsError("INVALID_EVENTS", "events must be an array", "events");
  }

  const parsed = inputs.map((event) => parseLearnerEvent(event));
  parsed.sort((left, right) => {
    const leftInstant = instantNanoseconds(left.timestamp);
    const rightInstant = instantNanoseconds(right.timestamp);
    return leftInstant !== rightInstant
      ? leftInstant < rightInstant
        ? -1
        : 1
      : left.eventId < right.eventId
        ? -1
        : left.eventId > right.eventId
          ? 1
          : 0;
  });

  const fingerprintsById = new Map<string, string>();
  const unique: LearnerEvent[] = [];
  for (const event of parsed) {
    const fingerprint = eventFingerprint(event);
    const priorFingerprint = fingerprintsById.get(event.eventId);
    if (priorFingerprint !== undefined) {
      if (priorFingerprint !== fingerprint) {
        throw rewardsError(
          "CONFLICTING_EVENT_ID",
          "Conflicting learner events share an eventId",
          "events",
        );
      }
      continue;
    }
    fingerprintsById.set(event.eventId, fingerprint);
    unique.push(event);
  }
  return unique;
}

function awardedEvents(
  events: readonly LearnerEvent[],
  formatter: Intl.DateTimeFormat,
): AwardedEvent[] {
  const signatureCounts = new Map<string, number>();
  const awarded: AwardedEvent[] = [];

  for (const event of events) {
    const xp = eventXp(event);
    if (xp === 0) continue;

    const localDate = toLocalDate(new Date(event.timestamp), formatter);
    const signatureDay = `${localDate}\u0000${antiFarmSignature(event)}`;
    const priorCount = signatureCounts.get(signatureDay) ?? 0;
    if (priorCount >= MAX_AWARDED_EVENTS_PER_SIGNATURE_DAY) continue;

    signatureCounts.set(signatureDay, priorCount + 1);
    awarded.push({ event, localDate, xp });
  }
  return awarded;
}

function buildDailyRows(events: readonly AwardedEvent[]): DailyXpRow[] {
  const byDate = new Map<string, MutableDailyXp>();
  for (const awarded of events) {
    const row = byDate.get(awarded.localDate) ?? { xp: 0, meaningfulEventCount: 0 };
    row.xp += awarded.xp;
    row.meaningfulEventCount += 1;
    byDate.set(awarded.localDate, row);
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([localDate, row]) => ({ localDate, ...row }));
}

function streaks(
  dates: readonly string[],
  today: string,
): { currentStreak: number; longestStreak: number; firstSevenDayDate: string | null } {
  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, firstSevenDayDate: null };
  }

  let run = 1;
  let longestStreak = 1;
  let firstSevenDayDate: string | null = null;
  for (let index = 1; index < dates.length; index += 1) {
    const currentDate = dates[index]!;
    const priorDate = dates[index - 1]!;
    run = localDateOrdinal(currentDate) - localDateOrdinal(priorDate) === 1 ? run + 1 : 1;
    if (run >= SEVEN_DAY_TARGET && firstSevenDayDate === null) {
      firstSevenDayDate = currentDate;
    }
    longestStreak = Math.max(longestStreak, run);
  }

  const latestDate = dates[dates.length - 1]!;
  const gapFromToday = localDateOrdinal(today) - localDateOrdinal(latestDate);
  let currentStreak = 0;
  if (gapFromToday === 0 || gapFromToday === 1) {
    currentStreak = 1;
    for (let index = dates.length - 1; index > 0; index -= 1) {
      if (localDateOrdinal(dates[index]!) - localDateOrdinal(dates[index - 1]!) !== 1) break;
      currentStreak += 1;
    }
  }

  return { currentStreak, longestStreak, firstSevenDayDate };
}

function badge(
  id: RewardBadgeId,
  earnedLocalDate: string | null,
  evidenceCount: number,
  targetCount: number,
): DerivedRewardBadge {
  return {
    id,
    earned: earnedLocalDate !== null,
    locked: earnedLocalDate === null,
    earnedLocalDate,
    evidenceCount: Math.min(evidenceCount, targetCount),
    targetCount,
  };
}

function buildBadges(
  events: readonly AwardedEvent[],
  longestStreak: number,
  firstSevenDayDate: string | null,
): DerivedRewardBadge[] {
  const practisedDimensions = new Set<MasteryDimension>();
  const datesByConcept = new Map<string, Set<string>>();
  let dimensionsEarnedDate: string | null = null;
  let repeatedConceptEarnedDate: string | null = null;
  let completedRecordingEarnedDate: string | null = null;
  let completedRecordingCount = 0;
  let maximumConceptDateCount = 0;

  for (const { event, localDate } of events) {
    for (const dimension of event.measuredDimensions) {
      practisedDimensions.add(dimension);
    }
    if (
      practisedDimensions.size >= THREE_DIMENSION_TARGET &&
      dimensionsEarnedDate === null
    ) {
      dimensionsEarnedDate = localDate;
    }

    const conceptDates = datesByConcept.get(event.conceptId) ?? new Set<string>();
    conceptDates.add(localDate);
    datesByConcept.set(event.conceptId, conceptDates);
    maximumConceptDateCount = Math.max(maximumConceptDateCount, conceptDates.size);
    if (conceptDates.size >= TWO_DATE_TARGET && repeatedConceptEarnedDate === null) {
      repeatedConceptEarnedDate = localDate;
    }

    if (event.kind === "recordingCycle") {
      completedRecordingCount += 1;
      completedRecordingEarnedDate ??= localDate;
    }
  }

  return [
    badge(
      "first-meaningful-attempt",
      events[0]?.localDate ?? null,
      events.length > 0 ? 1 : 0,
      1,
    ),
    badge(
      "three-dimensions-practised",
      dimensionsEarnedDate,
      practisedDimensions.size,
      THREE_DIMENSION_TARGET,
    ),
    badge(
      "same-concept-two-days",
      repeatedConceptEarnedDate,
      maximumConceptDateCount,
      TWO_DATE_TARGET,
    ),
    badge(
      "spoken-recording-cycle",
      completedRecordingEarnedDate,
      completedRecordingCount,
      1,
    ),
    badge(
      "seven-day-streak",
      firstSevenDayDate,
      longestStreak,
      SEVEN_DAY_TARGET,
    ),
  ];
}

/**
 * Derive XP, calendar streaks, and badges from validated learner evidence.
 * The input is revalidated defensively and never mutated. The returned graph is
 * deeply frozen so it cannot become an accidental source of reward authority.
 */
export function deriveRewards(
  inputs: readonly unknown[],
  options: DeriveRewardsOptions,
): DerivedRewardsView {
  const now = parseNow(options.now);
  const formatter = createLocalDateFormatter(options.timezone);
  const events = normalizedUniqueEvents(inputs).filter(
    (event) => instantNanoseconds(event.timestamp) <= now.instantNanoseconds,
  );
  const awarded = awardedEvents(events, formatter);
  const dailyXpRows = buildDailyRows(awarded);
  const meaningfulDates = dailyXpRows.map((row) => row.localDate);
  const today = toLocalDate(now.date, formatter);
  const { currentStreak, longestStreak, firstSevenDayDate } = streaks(
    meaningfulDates,
    today,
  );

  return deepFreeze({
    timezone: options.timezone,
    totalXp: dailyXpRows.reduce((sum, row) => sum + row.xp, 0),
    currentStreak,
    longestStreak,
    meaningfulEventCount: awarded.length,
    meaningfulDayCount: dailyXpRows.length,
    dailyXpRows,
    badges: buildBadges(awarded, longestStreak, firstSevenDayDate),
  });
}
