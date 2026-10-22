import type { LearnerHubId } from "./hub-types";

export type Role = "student" | "teacher" | "admin";
export type NavPlacement = "rail" | "tabs" | "menu";
export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  placement: NavPlacement[];
  roles?: Role[];
  order: number;
  description?: string;
  group?: "learn" | "remember" | "explore" | "app";
};

export const NAV_GROUPS = [
  { id: "learn", label: "Learn" },
  { id: "remember", label: "Remember & practise" },
  { id: "explore", label: "Find & explore" },
  { id: "app", label: "Your app" },
] as const;

export const NAV_ITEMS: NavItem[] = [
  // Lane 1: existing learning destinations and the preferred vocabulary sheets.
  { id: "home", label: "Dashboard", href: "/", icon: "M3 10l9-7 9 7v11H3z", placement: ["rail", "menu"], order: 10, group: "learn", description: "Your daily starting point" },
  { id: "book", label: "Book", href: "/book", icon: "M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 6v15", placement: ["rail", "tabs", "menu"], order: 20, group: "learn", description: "Read, listen & look up phrases" },
  { id: "lessons", label: "Lessons", href: "/lessons", icon: "M4 3h16v18H4z M8 7h8 M8 12h8 M8 17h5", placement: ["rail", "tabs", "menu"], order: 30, group: "learn", description: "Learn step by step" },
  { id: "cheat-sheets", label: "Cheat sheets", href: "/cheat-sheets", icon: "M12 3l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.5l-5.7 3 1.1-6.3L2.8 9.7l6.4-.9z", placement: ["rail", "tabs", "menu"], order: 40, group: "learn", description: "Visual memory guides" },
  { id: "all-vocabulary", label: "All vocabulary", href: "/cheat-sheets/plurals", icon: "M4 4h16v16H4z M4 10h16 M10 4v16", placement: ["rail", "menu"], order: 50, group: "learn", description: "Illustrated words, gender & plural patterns" },
  { id: "subjects", label: "Subjects", href: "/cheat-sheets/subjects", icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z", placement: ["rail", "menu"], order: 60, group: "learn", description: "Browse vocabulary by subject" },
  { id: "saved", label: "My review", href: "/saved", icon: "M6 3h12v18l-6-4-6 4z", placement: ["rail", "tabs", "menu"], order: 70, group: "remember", description: "Your saved collection & self-rated recall" },
  { id: "vocabulary", label: "Vocabulary", href: "/vocabulary", icon: "M4 4h16v16H4z", placement: ["rail", "menu"], order: 80, group: "explore", description: "Words, articles & plurals" },
  { id: "verbs", label: "Verbs", href: "/verbs", icon: "M5 5h14 M12 5v14 M8 19h8", placement: ["rail", "menu"], order: 90, group: "explore", description: "Conjugations & examples" },
  { id: "grammar", label: "Grammar", href: "/grammar", icon: "M4 5h16 M4 12h16 M4 19h16", placement: ["rail", "menu"], order: 100, group: "explore", description: "Patterns made clear" },
  { id: "phrases", label: "Phrases & Q&A", href: "/phrases", icon: "M3 4h18v12H9l-6 5z", placement: ["rail", "menu"], order: 110, group: "explore", description: "Ready-to-use conversations" },
  { id: "listening", label: "Listening", href: "/listening", icon: "M4 13v-1a8 8 0 0116 0v1 M4 12h4v8H4z M16 12h4v8h-4z", placement: ["rail", "menu"], order: 120, group: "learn", description: "Audio & transcripts" },
  { id: "search", label: "Search", href: "/search", icon: "M16 16l5 5 M18 10a8 8 0 11-16 0 8 8 0 0116 0", placement: ["rail", "menu"], order: 130, group: "explore", description: "Find anything in the course" },
  { id: "concepts", label: "Concepts", href: "/concepts", icon: "M4 4h6v6H4z M14 14h6v6h-6z M10 7h7v7", placement: ["rail", "menu"], order: 140, group: "explore", description: "Connect words and ideas" },
  { id: "hubs", label: "Study library", href: "/hubs", icon: "M4 3h5v18H4z M14 3l5-1 3 18-5 1z", placement: ["rail", "menu"], order: 150, group: "explore", description: "Browse every learning area" },
  { id: "practice", label: "Practice", href: "/practice", icon: "M5 5h14v14H5z M9 12h6 M12 9v6", placement: ["rail", "menu"], order: 160, group: "remember", description: "Exercise your memory" },
  { id: "review", label: "Guided review", href: "/review", icon: "M4 9a8 8 0 111 9 M4 3v6h6", placement: ["rail", "menu"], order: 170, group: "remember", description: "Checked exercises from Lessons 1–2" },
  // ADR-016: course-material attribution stays reachable on every surface.
  { id: "references", label: "References", href: "/references", icon: "M4 3h16v18H4z M8 7h8 M8 12h8", placement: ["rail", "menu"], order: 180, group: "app", description: "Sources & credits" },
  { id: "settings", label: "Settings", href: "/settings", icon: "M3 6h18 M3 18h18 M7 3v6 M17 15v6", placement: ["rail", "menu"], order: 190, group: "app", description: "Your preferences" },
  // End Lane 1.
  // Lane 2: append game navigation here.
  // End Lane 2.
  // Lane 3: append account and role navigation here.
  // End Lane 3.
];

/** Restricted destinations are hidden until the caller has a matching role. */
export function navItemsFor(placement: NavPlacement, role?: Role): NavItem[] {
  return NAV_ITEMS.filter(item => item.placement.includes(placement)
    && (!item.roles || (role !== undefined && item.roles.includes(role))))
    .sort((a, b) => a.order - b.order);
}

export type NavKey =
  | "home"
  | "dashboard"
  | "play"
  | "teaching"
  | "admin"
  | "lessons"
  | "book"
  | "cheat-sheets"
  | "all-vocabulary"
  | "subjects"
  | "saved"
  | "vocabulary"
  | "verbs"
  | "grammar"
  | "phrases"
  | "listening"
  | "concepts"
  | "hubs"
  | "search"
  | "practice"
  | "review"
  | "references"
  | "settings";

/** Active primary nav item, or null when no item should be current (e.g. 404). */
export type ShellNavCurrent = NavKey | null;

const HUB_NAV_KEYS = new Set<NavKey>([
  "cheat-sheets",
  "all-vocabulary",
  "subjects",
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
  itemKey: string,
  variant: "rail" | "top" | "bottom",
): boolean {
  if (current == null) return false;
  if (variant === "bottom") {
    if (itemKey === "hubs") return isHubNavKey(current);
    return current === itemKey;
  }
  return current === itemKey;
}
