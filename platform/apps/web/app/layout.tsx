import type { Metadata } from "next";
import { LearnerStateProvider } from "@/components/learner-state/LearnerStateProvider";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/content/page-metadata";
import "./globals.css";

/**
 * `default` is the title for any route that does not set one; `template`
 * appends the product name to every route that does. Route metadata therefore
 * carries only the part that identifies the page — see `page-metadata.ts`.
 */
export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
};

/**
 * Self-hosted Inter Variable (Daily Learning Studio Phase 1a typography).
 *
 * The @font-face lives here instead of globals.css because a CSS `url()`
 * cannot apply the GitHub Pages basePath: absolute `/fonts/…` URLs are left
 * untouched by the bundler and 404 under `/german-learning-exam/`, while
 * relative URLs get rehashed into `_next/static` and would no longer match
 * the preload href. `withPagesBaseAssetPath` (the same helper every other
 * public asset uses) keeps the preload and the font source byte-identical
 * in both the normal build and the Pages export.
 *
 * unicode-range covers Latin + Latin Extended, including German umlauts
 * (U+00C4/00D6/00DC/00E4/00F6/00FC), ß (U+00DF) and capital ẞ (U+1E9E).
 */
const INTER_VARIABLE_WOFF2 = withPagesBaseAssetPath(
  "/fonts/InterVariable.woff2",
);

const interFontFace = `@font-face {
  font-family: "InterVariable";
  src: url("${INTER_VARIABLE_WOFF2}") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0100-024F, U+0259, U+1E00-1EFF, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD;
}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <link
          rel="preload"
          href={INTER_VARIABLE_WOFF2}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Static build-time string; React would entity-escape quotes in a
            text child of <style>, so raw injection is required. */}
        <style dangerouslySetInnerHTML={{ __html: interFontFace }} />
        <LearnerStateProvider>{children}</LearnerStateProvider>
      </body>
    </html>
  );
}
