import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { loadExtraProfessionsProjection } from "@/lib/content/extra-professions";
import { ProfessionCollectionClient } from "./ProfessionCollectionClient";

export const metadata: Metadata = {
  // The root layout template appends the product name; it is not repeated here.
  title: "Optional professions",
  description: "The 48 source-backed optional professions rows for Lesson 2.",
};

export default function ExtraProfessionsPage() {
  return (
    <ShellLayout current="vocabulary">
      <ProfessionCollectionClient projection={loadExtraProfessionsProjection()} />
    </ShellLayout>
  );
}
