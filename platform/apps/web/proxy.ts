import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  loadLearnerDetailProjection,
  loadLearnerProjection,
} from "./lib/content/access";
import { decideLearnerPathRequest } from "./lib/content/routes";
import {
  extractRawPathname,
  extractRawSearch,
} from "./lib/content/path-utils";

/**
 * Next 16 Proxy (Node.js runtime): observe the raw request path before App
 * Router decoding and issue at most one permanent canonical redirect for
 * safe activity/detail aliases / trailing-slash forms.
 *
 * Uses the raw URL so legacy percent-colon aliases remain distinguishable
 * from raw-colon aliases while canonical routes use Pages-safe slugs.
 */
export function proxy(request: NextRequest) {
  const rawPathname = extractRawPathname(request.url);
  const search = extractRawSearch(request.url);
  const projection = loadLearnerProjection();
  const details = loadLearnerDetailProjection();
  const decision = decideLearnerPathRequest(
    rawPathname,
    search,
    projection,
    details,
  );

  if (decision.action === "redirect") {
    const target = new URL(decision.location, request.url);
    const current = `${rawPathname}${search}`;
    if (decision.location === current) {
      return NextResponse.next();
    }
    return NextResponse.redirect(target, decision.status);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/lessons/:path*",
    "/vocabulary",
    "/vocabulary/:path*",
    "/verbs",
    "/verbs/:path*",
    "/grammar",
    "/grammar/:path*",
    "/phrases",
    "/phrases/:path*",
    "/listening",
    "/listening/:path*",
    "/concepts",
    "/concepts/:path*",
    "/hubs",
    "/hubs/:path*",
    "/search",
    "/search/:path*",
    "/practice",
    "/practice/:path*",
    "/conversation",
    "/conversation/:path*",
    "/review",
    "/review/:path*",
    "/settings",
  ],
};
