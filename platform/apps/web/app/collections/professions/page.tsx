import { Suspense } from "react";
import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { WordCardLibrary, WordCardLibraryWithParams } from "@/components/word-cards/WordCardLibrary";
import { loadWordCards } from "@/lib/content/word-cards";

export const metadata: Metadata = {
  // The root layout template appends the product name; it is not repeated here.
  title: "Optional professions",
  description: "The 48 source-backed optional professions rows for Lesson 2.",
};

export default function ExtraProfessionsPage() {
  const catalog = loadWordCards();
  return (
    <ShellLayout current="vocabulary">
      <Suspense fallback={<WordCardLibrary catalog={catalog} teachersOnly />}><WordCardLibraryWithParams catalog={catalog} teachersOnly /></Suspense>
    </ShellLayout>
  );
}
