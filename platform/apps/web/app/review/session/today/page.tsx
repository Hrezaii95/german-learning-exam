import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { ReviewSession } from "@/components/review/ReviewViews";
import { pageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Review session",
  "Work through today’s review items one at a time. Your answers stay on this device.",
);

export default function TodayReviewSessionPage() {
  return <ShellLayout current="review"><ReviewSession /></ShellLayout>;
}
