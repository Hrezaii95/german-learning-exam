import { Suspense } from "react";
import type { Metadata } from "next";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { SearchView } from "@/components/search/SearchViews";
import { SearchViewWithParams } from "@/components/search/SearchNavViews";
import { loadLearnerSearchProjection } from "@/lib/content/access";
import { pageMetadata } from "@/lib/content/page-metadata";
import { withWordCardSearch } from "@/lib/content/word-cards";

export const metadata: Metadata = pageMetadata(
  "Search",
  "Find a word, verb, grammar point, phrase or lesson across everything you are learning.",
);

/**
 * Static search shell: query + nav context are read on the client under
 * Suspense so static export stays compatible without dropping filters/back.
 */
export default function SearchPage() {
  const projection = withWordCardSearch(loadLearnerSearchProjection());
  return (
    <ShellLayout current="search">
      <Suspense
        fallback={
          <SearchView projection={projection} searchParams={{}} navigation={null} />
        }
      >
        <SearchViewWithParams projection={projection} />
      </Suspense>
    </ShellLayout>
  );
}
