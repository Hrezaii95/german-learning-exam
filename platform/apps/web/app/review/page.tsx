
import { LP } from "@/components/i18n/LocalizedElements";
import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { ReviewSetup } from "@/components/review/ReviewViews";
import { pageMetadata } from "@/lib/content/page-metadata";
import Link from "@/components/i18n/LocalizedLink";

export const metadata: Metadata = pageMetadata(
  "Today’s mission",
  "What is due for review today, and how long the round will take.",
);

export default function ReviewPage() {
  return <ShellLayout current="review"><LP><Link className="study-secondary" href="/saved">Open my saved words, concepts & book lines →</Link></LP><ReviewSetup /></ShellLayout>;
}
