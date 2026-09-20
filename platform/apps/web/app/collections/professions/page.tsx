import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { loadExtraProfessionsProjection } from "@/lib/content/extra-professions";
import { ProfessionCollectionClient } from "./ProfessionCollectionClient";
import { wordCardForPath } from "@/lib/content/word-cards";

export const metadata: Metadata = {
  // The root layout template appends the product name; it is not repeated here.
  title: "Optional professions",
  description: "The 48 source-backed optional professions rows for Lesson 2.",
};

export default function ExtraProfessionsPage() {
  const projection = loadExtraProfessionsProjection();
  const cardsByRow = Object.fromEntries(projection.rows.map(row => {
    const card = wordCardForPath(row.detailPath);
    if (!card) throw new Error(`Missing profession card: ${row.detailPath}`);
    return [row.id, card];
  }));
  return (
    <ShellLayout current="vocabulary">
      <ProfessionCollectionClient projection={projection} cardsByRow={cardsByRow} />
    </ShellLayout>
  );
}
