import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loadLearnerProjection } from "./lib/content/access";
import { decideLearnerPathRequest } from "./lib/content/routes";
import {
  extractRawPathname,
  extractRawSearch,
} from "./lib/content/path-utils";

/**
 * Next 16 Proxy (Node.js runtime): observe the raw request path before App
 * Router decoding and issue at most one permanent canonical redirect for
 * safe activity aliases / trailing-slash forms.
 *
 * Requires `skipProxyUrlNormalize: true` in next.config.ts so encoded
 * `activity%3A…` segments remain distinguishable from raw-colon aliases.
 */
export function proxy(request: NextRequest) {
  const rawPathname = extractRawPathname(request.url);
  const search = extractRawSearch(request.url);
  const projection = loadLearnerProjection();
  const decision = decideLearnerPathRequest(rawPathname, search, projection);

  if (decision.action === "redirect") {
    const target = new URL(decision.location, request.url);
    // Avoid redirect loops: never redirect to the exact same raw href path+query.
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
  ],
};
