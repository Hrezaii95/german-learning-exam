import type { Metadata } from "next";
import { ExtraProfessionsHub } from "@/components/collections/ExtraProfessionsHub";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { loadExtraProfessionsProjection } from "@/lib/content/extra-professions";

export const metadata: Metadata = {
  title: "Optional professions | German Learning OS",
  description: "The 48 source-backed optional professions rows for Lesson 2.",
};

export default function ExtraProfessionsPage() {
  return (
    <ShellLayout current="vocabulary">
      <ExtraProfessionsHub projection={loadExtraProfessionsProjection()} />
    </ShellLayout>
  );
}
