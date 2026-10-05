import { LanguageSelector } from "@/components/i18n/LocaleProvider";

import { LAside, LButton, LDiv, LFooter, LHeader, LLi, LNav, LP, LSpan, LUl } from "@/components/i18n/LocalizedElements";
import Link from "@/components/i18n/LocalizedLink";
import {MobileNavigation,SkipToMainContent} from "./MobileNavigation";
import {StudyScopeControl} from "@/components/study/StudyScope";
import {DictionaryLauncher} from "@/components/study/StudyProvider";
import {LessonResumeTracker} from "@/components/study/LessonResumeTracker";
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
  { key: "dashboard", href: "/dashboard", label: "Dashboard", enabled: true },
  { key: "lessons", href: "/lessons", label: "Lessons", enabled: true },
  { key: "book", href: "/book", label: "Interactive book", enabled: true },
  { key: "cheat-sheets", href: "/cheat-sheets", label: "Cheat sheets", enabled: true },
  { key: "saved", href: "/saved", label: "My review", enabled: true },
  { key: "vocabulary", href: "/vocabulary", label: "Vocabulary", enabled: true },
  { key: "verbs", href: "/verbs", label: "Verbs", enabled: true },
  { key: "grammar", href: "/grammar", label: "Grammar", enabled: true },
  { key: "phrases", href: "/phrases", label: "Phrases & Q&A", enabled: true },
  { key: "listening", href: "/listening", label: "Listening", enabled: true },
  { key: "search", href: "/search", label: "Search", enabled: true },
  { key: "practice", href: "/practice", label: "Practice", enabled: true },
  { key: "review", href: "/review", label: "Guided review", enabled: true },
  // ADR-016: the course-material credit must stay reachable from every
  // ordinary learner page, so it lives in primary navigation rather than in a
  // footnote that only one route shows.
  { key: "references", href: "/references", label: "References", enabled: true },
  { key: "settings", href: "/settings", label: "Settings", enabled: true },
];


/**
 * Regular `lernen` product motif: outlined stem + `en` ending in the regular
 * morphology token (`--rule-regular`) with an accessible `REG` cue.
 * Never uses gender tokens, amber spelling bridge, or irregular star.
 */
function MorphologyStrip({ tone = "nav" }: { tone?: "nav" | "light" }) {
  return (
    <LSpan
      className="morph-strip"
      aria-hidden="true"
      data-tone={tone}
      data-motif="lernen-regular"
    >
      <LSpan className="morph-strip__stem">lern</LSpan>
      <LSpan className="morph-strip__ending">
        <LSpan className="morph-strip__ending-text">en</LSpan>
        <LSpan className="morph-strip__cue">REG</LSpan>
      </LSpan>
    </LSpan>
  );
}

function NavItems({
  current,
  variant,
}: {
  current: ShellNavCurrent;
  variant: "rail" | "top" | "bottom";
}) {
  const items = variant === "top"
    ? PRIMARY_NAV.filter(item => ["dashboard", "listening", "search"].includes(item.key))
    : PRIMARY_NAV;

  return (
    <LUl className="nav-list">
      {items.map((item) => {
        if (!item.enabled) {
          return (
            <LLi key={item.key}>
              <LButton className="nav-disabled" type="button" disabled>
                <LSpan>{item.label}</LSpan>
                <LSpan className="nav-disabled__badge">Coming soon</LSpan>
              </LButton>
            </LLi>
          );
        }

        const navKey = item.key as NavKey;
        const isCurrent = shellCurrentMatches(current, navKey, variant);
        return (
          <LLi key={item.key}>
            <Link
              href={item.href}
              className="nav-link"
              aria-current={isCurrent ? "page" : undefined}
            >
              <LSpan>{item.label}</LSpan>
            </Link>
          </LLi>
        );
      })}
    </LUl>
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
    <LDiv className="app-shell lingovo-learning">
      {current==="lessons"&&<LessonResumeTracker/>}
      <SkipToMainContent/>

      <LAside className="shell-rail" aria-label="Desktop navigation">
        <LDiv className="shell-brand">
          <Link href="/" className="shell-brand__name">lingovo.</Link>
          <LDiv className="shell-brand__tag">Your daily German studio</LDiv>
          <MorphologyStrip />
        </LDiv>
        <LNav aria-label="Primary">
          <NavItems current={current} variant="rail" />
        </LNav>
      </LAside>

      <LHeader className="shell-topnav" aria-label="Tablet navigation">
        <LDiv className="shell-brand">
          <Link href="/" className="shell-brand__name">lingovo.</Link>
        </LDiv>
        <LNav aria-label="Primary">
          <NavItems current={current} variant="top" />
        </LNav>
      </LHeader>

      <LDiv className="shell-workspace">
        <main id="main-content" className="shell-main" tabIndex={-1}>
          <LDiv className="study-toolbar"><Link className="lingovo-level-switch" href="/learn">A1 ↔ C1</Link>
            {current!=="settings"&&current!=="references"&&<StudyScopeControl/>}
            <DictionaryLauncher/><LanguageSelector/>
          </LDiv>
          {children}
        </main>
        {/* The source credit is a condition of using this course material
            (ADR-016), so it rides with every page rather than depending on a
            navigation surface a phone learner never sees. */}
        <LFooter className="shell-credit">
          <LP>
            Course material from <LSpan lang="de">Momente</LSpan> A1.1 / A1.2 by
            Hueber Verlag.{" "}
            <Link href="/references" className="shell-credit__link">
              References
            </Link>
          </LP>
        </LFooter>
      </LDiv>

      <MobileNavigation current={current}/>
    </LDiv>
  );
}
