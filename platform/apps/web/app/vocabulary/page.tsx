import { Suspense } from "react";
import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { WordCardLibrary, WordCardLibraryWithParams } from "@/components/word-cards/WordCardLibrary";
import { loadWordCards } from "@/lib/content/word-cards";

export const metadata: Metadata = { title: "Vocabulary · Lessons 1–3", description: "All vocabulary through Lesson 3, numbers, spelling and teacher professions in complete word-family cards." };
export default function VocabularyPage() {
  const catalog = loadWordCards();
  return <ShellLayout current="vocabulary"><Suspense fallback={<WordCardLibrary catalog={catalog} />}><WordCardLibraryWithParams catalog={catalog} /></Suspense></ShellLayout>;
}
