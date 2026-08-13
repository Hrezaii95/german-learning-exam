import Link from "next/link";
import type { ReactNode } from "react";
import {
  shellCurrentMatches,
  type NavKey,
  type ShellNavCurrent,
} from "@/lib/content/nav";

export type { NavKey, ShellNavCurrent };

type NavItem =
  | { key: NavKey; href: string; label: string; enabled: true }
  | { key: string; label: string; enabled: false };

const PRIMARY_NAV: NavItem[] = [
  { key: "dashboard", href: "/", label: "Dashboard", enabled: true },
  { key: "lessons", href: "/lessons", label: "Lessons", enabled: true },
  { key: "vocabulary", href: "/vocabulary", label: "Vocabulary", enabled: true },
  { key: "verbs", href: "/verbs", label: "Verbs", enabled: true },
  { key: "grammar", href: "/grammar", label: "Grammar", enabled: true },
  { key: "phrases", href: "/phrases", label: "Phrases & Q&A", enabled: true },
  { key: "listening", href: "/listening", label: "Listening", enabled: true },
  { key: "search", href: "/search", label: "Search", enabled: true },
  { key: "practice", href: "/practice", label: "Practice", enabled: true },
  { key: "review", label: "Review", enabled: false },
];

const MOBILE_NAV: NavItem[] = [
  { key: "dashboard", href: "/", label: "Dashboard", enabled: true },
  { key: "lessons", href: "/lessons", label: "Lessons", enabled: true },
  { key: "hubs", href: "/hubs", label: "Hubs", enabled: true },
  { key: "review", label: "Review", enabled: false },
  { key: "profile", label: "Profile", enabled: false },
];

/**
 * Regular `lernen` product motif: outlined stem + `en` ending in the regular
 * morphology token (`--rule-regular`) with an accessible `REG` cue.
 * Never uses gender tokens, amber spelling bridge, or irregular star.
 */
function MorphologyStrip({ tone = "nav" }: { tone?: "nav" | "light" }) {
  return (
    <span
      className="morph-strip"
      aria-hidden="true"
      data-tone={tone}
      data-motif="lernen-regular"
    >
      <span className="morph-strip__stem">lern</span>
      <span className="morph-strip__ending">
        <span className="morph-strip__ending-text">en</span>
        <span className="morph-strip__cue">REG</span>
      </span>
    </span>
  );
}

function NavItems({
  current,
  variant,
}: {
  current: ShellNavCurrent;
  variant: "rail" | "top" | "bottom";
}) {
  const items = variant === "bottom" ? MOBILE_NAV : PRIMARY_NAV;

  return (
    <ul className="nav-list">
      {items.map((item) => {
        if (!item.enabled) {
          return (
            <li key={item.key}>
              <button className="nav-disabled" type="button" disabled>
                <span>{item.label}</span>
                <span className="nav-disabled__badge">Next phase</span>
              </button>
            </li>
          );
        }

        const navKey = item.key as NavKey;
        const isCurrent = shellCurrentMatches(current, navKey, variant);
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              className="nav-link"
              aria-current={isCurrent ? "page" : undefined}
            >
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({
  current,
  children,
}: {
  current: ShellNavCurrent;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className="shell-rail" aria-label="Desktop navigation">
        <div className="shell-brand">
          <div className="shell-brand__name">German Learning OS</div>
          <div className="shell-brand__tag">Lessons 1–2 Alpha shell</div>
          <MorphologyStrip />
        </div>
        <nav aria-label="Primary">
          <NavItems current={current} variant="rail" />
        </nav>
        <p className="dense" style={{ color: "var(--nav-muted)", margin: 0 }}>
          Content from validated publication only.
        </p>
      </aside>

      <header className="shell-topnav" aria-label="Tablet navigation">
        <div className="shell-brand">
          <div className="shell-brand__name">German Learning OS</div>
        </div>
        <nav aria-label="Primary">
          <NavItems current={current} variant="top" />
        </nav>
      </header>

      <div className="shell-workspace">
        <main id="main-content" className="shell-main">
          {children}
        </main>
      </div>

      <nav className="shell-bottomnav" aria-label="Mobile">
        <NavItems current={current} variant="bottom" />
      </nav>
    </div>
  );
}
