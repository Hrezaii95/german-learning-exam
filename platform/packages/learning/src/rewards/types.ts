export const REWARD_BADGE_IDS = [
  "first-meaningful-attempt",
  "three-dimensions-practised",
  "same-concept-two-days",
  "spoken-recording-cycle",
  "seven-day-streak",
] as const;

export type RewardBadgeId = (typeof REWARD_BADGE_IDS)[number];

export type DeriveRewardsOptions = {
  /** Current instant. Strings must be ISO-8601 and include a timezone. */
  readonly now: Date | string;
  /** IANA timezone used for calendar-day grouping and streaks. */
  readonly timezone: string;
};

export type DailyXpRow = {
  readonly localDate: string;
  readonly xp: number;
  readonly meaningfulEventCount: number;
};

export type DerivedRewardBadge = {
  readonly id: RewardBadgeId;
  readonly earned: boolean;
  readonly locked: boolean;
  /** Local calendar date in the configured timezone, or null while locked. */
  readonly earnedLocalDate: string | null;
  /** Current evidence toward the badge, capped at targetCount. */
  readonly evidenceCount: number;
  readonly targetCount: number;
};

/**
 * Read-only projection derived from learner events. This is never persistence
 * authority and deliberately has no serializer or hydration contract.
 */
export type DerivedRewardsView = {
  readonly timezone: string;
  readonly totalXp: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly meaningfulEventCount: number;
  readonly meaningfulDayCount: number;
  readonly dailyXpRows: readonly DailyXpRow[];
  readonly badges: readonly DerivedRewardBadge[];
};
