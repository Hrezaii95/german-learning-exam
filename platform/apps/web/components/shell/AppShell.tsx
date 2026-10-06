import { LDiv, LFooter, LP, LSpan } from "@/components/i18n/LocalizedElements";
import Link from "@/components/i18n/LocalizedLink";
import { StudyScopeControl } from "@/components/study/StudyScope";
import { DictionaryLauncher } from "@/components/study/StudyProvider";
import { LessonResumeTracker } from "@/components/study/LessonResumeTracker";
import { A1CourseNavigation, LingovoAppHeader } from "./LingovoAppHeader";
import type { ReactNode } from "react";
import type { NavKey, ShellNavCurrent } from "@/lib/content/nav";

export type { NavKey, ShellNavCurrent };

export function AppShell({ current, children }: { current: ShellNavCurrent; children: ReactNode }) {
  return (
    <LDiv className="app-shell lingovo-learning lingovo-unified-shell">
      {current === "lessons" && <LessonResumeTracker />}
      <LingovoAppHeader track={current ? "a1" : undefined} current={current} />
      <A1CourseNavigation current={current} />
      <LDiv className="shell-workspace">
        <main id="main-content" className="shell-main" tabIndex={-1}>
          {current !== "settings" && current !== "references" && (
            <LDiv className="study-toolbar">
              <StudyScopeControl />
              <DictionaryLauncher />
            </LDiv>
          )}
          {children}
        </main>
        <LFooter className="shell-credit">
          <LP>
            Course material from <LSpan lang="de">Momente</LSpan> A1.1 / A1.2 by Hueber Verlag.{" "}
            <Link href="/references" className="shell-credit__link">References</Link>
          </LP>
        </LFooter>
      </LDiv>
    </LDiv>
  );
}
