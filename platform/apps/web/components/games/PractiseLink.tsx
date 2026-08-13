import Link from "next/link";
import {
  appendNavigationContext,
  buildDetailPracticeNavigationContext,
} from "@/lib/content/navigation-context";
import type { LearnerDetailRecord } from "@/lib/content/detail-types";
import { PRACTICE_ROOT_PATH } from "@/lib/games";

/** Clear Practise action from representative detail pages. */
export function PractiseLink({ detail }: { detail: LearnerDetailRecord }) {
  const nav = buildDetailPracticeNavigationContext({
    hubId: detail.hubSegment,
    detailPath: detail.canonicalPath,
    resultId: detail.id,
  });
  const href = nav
    ? appendNavigationContext(PRACTICE_ROOT_PATH, nav)
    : PRACTICE_ROOT_PATH;

  return (
    <Link
      className="btn btn-primary"
      href={href}
      data-practise-link="true"
      aria-label={`Practise with games related to ${detail.displayText}`}
    >
      Practise
    </Link>
  );
}
