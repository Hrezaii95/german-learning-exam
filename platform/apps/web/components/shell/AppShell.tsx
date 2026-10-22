import Link from "next/link";
import {AccountSlot} from "@/components/account/AccountSlot";
import {MobileNavigation,SkipToMainContent} from "./MobileNavigation";
import {StudyScopeControl} from "@/components/study/StudyScope";
import {DictionaryLauncher} from "@/components/study/StudyProvider";
import {LessonResumeTracker} from "@/components/study/LessonResumeTracker";
import type { ReactNode } from "react";
import {
  shellCurrentMatches,
  navItemsFor,
  type NavKey,
  type Role,
  type ShellNavCurrent,
} from "@/lib/content/nav";

export type { NavKey, ShellNavCurrent };

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
  role,
}: {
  current: ShellNavCurrent;
  variant: "rail" | "top" | "bottom";
  role?: Role | undefined;
}) {
  const items = navItemsFor(variant === "top" ? "tabs" : "rail", role);

  return (
    <ul className="nav-list">
      {items.map((item) => {
        const isCurrent = shellCurrentMatches(current, item.id, variant);
        return (
          <li key={item.id}>
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
  role,
}: {
  current: ShellNavCurrent;
  children: ReactNode;
  role?: Role | undefined;
}) {
  return (
    <div className="app-shell">
      {current==="lessons"&&<LessonResumeTracker/>}
      <SkipToMainContent/>

      <aside className="shell-rail" aria-label="Desktop navigation">
        <div className="shell-brand">
          <div className="shell-brand__name">German Learning OS</div>
          <div className="shell-brand__tag">Your daily German studio</div>
          <MorphologyStrip />
        </div>
        <nav aria-label="Primary">
          <NavItems current={current} variant="rail" role={role} />
        </nav>
      </aside>

      <header className="shell-topnav" aria-label="Tablet navigation">
        <div className="shell-brand">
          <div className="shell-brand__name">German Learning OS</div>
        </div>
        <nav aria-label="Primary">
          <NavItems current={current} variant="top" role={role} />
        </nav>
      </header>

      <div className="shell-workspace">
        <main id="main-content" className="shell-main" tabIndex={-1}>
          <header className="study-toolbar">
            {current!=="settings"&&current!=="references"&&<StudyScopeControl/>}
            <DictionaryLauncher/>
            <div className="shell-account"><AccountSlot/></div>
          </header>
          {children}
        </main>
        {/* The source credit is a condition of using this course material
            (ADR-016), so it rides with every page rather than depending on a
            navigation surface a phone learner never sees. */}
        <footer className="shell-credit">
          <p>
            Course material from <span lang="de">Momente</span> A1.1 / A1.2 by
            Hueber Verlag.{" "}
            <Link href="/references" className="shell-credit__link">
              References
            </Link>
          </p>
        </footer>
      </div>

      <MobileNavigation current={current} role={role}/>
    </div>
  );
}
