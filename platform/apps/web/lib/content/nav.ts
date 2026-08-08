import type { LearnerHubId } from "./hub-types";

export type NavKey =
  | "dashboard"
  | "lessons"
  | "vocabulary"
  | "verbs"
  | "grammar"
  | "phrases"
  | "listening"
  | "concepts"
  | "hubs";

/** Active primary nav item, or null when no item should be current (e.g. 404). */
export type ShellNavCurrent = NavKey | null;

const HUB_NAV_KEYS = new Set<NavKey>([
  "vocabulary",
  "verbs",
  "grammar",
  "phrases",
  "listening",
  "concepts",
  "hubs",
]);

export function isHubNavKey(key: ShellNavCurrent): boolean {
  return key != null && HUB_NAV_KEYS.has(key);
}

export function navKeyForHub(hubId: LearnerHubId): NavKey {
  return hubId;
}

export function shellCurrentMatches(
  current: ShellNavCurrent,
  itemKey: NavKey,
  variant: "rail" | "top" | "bottom",
): boolean {
  if (current == null) return false;
  if (variant === "bottom") {
    if (itemKey === "hubs") return isHubNavKey(current);
    return current === itemKey;
  }
  return current === itemKey;
}
