import { Suspense } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { SearchView } from "@/components/search/SearchViews";
import { SearchViewWithParams } from "@/components/search/SearchNavViews";
import { loadLearnerSearchProjection } from "@/lib/content/access";

/**
 * Static search shell: query + nav context are read on the client under
 * Suspense so static export stays compatible without dropping filters/back.
 */
export default function SearchPage() {
  const projection = loadLearnerSearchProjection();
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
