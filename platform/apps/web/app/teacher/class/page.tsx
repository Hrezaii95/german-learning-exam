import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { loadWordCards } from "@/lib/content/word-cards";
import { TeacherClass } from "@/components/teacher/TeacherClass";
export const metadata = { title: "Teacher · Class", description: "Your German learning account and class workspace." };
export default function Page() {
  const wordLinks: Record<string, string> = {};
  for (const card of loadWordCards().cards) {
    wordLinks[card.id] = card.path;
    for (const sourceId of card.sourceIds) wordLinks[sourceId] = card.path;
    card.rows.forEach((_, index) => { wordLinks[`${card.id}-${index}`] = card.path; });
  }
  return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading…</p>}><TeacherClass wordLinks={wordLinks} /></Suspense></ShellLayout>; }
