import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { AssignmentBuilder } from "@/components/teacher/AssignmentBuilder";
import { loadWordCards } from "@/lib/content/word-cards";
export const metadata = { title: "Build an assignment", description: "Choose scope, skills and a due date for your class practice." };
export default function Page() {
  // Public, already-published vocabulary only. No account or class data enters HTML.
  const words = loadWordCards().cards.map(card => ({ id: card.id, lemma: card.rows[0]?.singular.text ?? card.title, meaning: card.rows[0]?.meaning ?? card.title, lessons: card.studyTags?.lessons ?? card.lessons.map(Number), tags: card.studyTags?.concepts ?? [], sources: card.studyTags?.sources ?? [card.studyTags?.source ?? "course"], audio: card.rows[0]?.singular.audio ?? null, noun: card.category === "Noun" }));
  return <ShellLayout current={null}><Suspense fallback={<p role="status">Loading assignment builder…</p>}><AssignmentBuilder words={words} /></Suspense></ShellLayout>;
}
