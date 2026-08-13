import Link from "next/link";
import type { NavigationContext } from "@/lib/content/navigation-context";
import {
  appendNavigationContext,
  buildSearchNavigationContext,
  isSafeNavigationPath,
  resolveBackHref,
} from "@/lib/content/navigation-context";
import {
  groupSearchHits,
  lessonMembershipLabel,
  matchMetaLabel,
  parseSearchQueryParam,
  searchLearnerContent,
  sourcePriorityLabel,
} from "@/lib/content/search-query";
import type { LearnerSearchHit, LearnerSearchProjection } from "@/lib/content/search-types";
import { BackLink } from "@/components/nav/BackLink";
import { withPagesBasePath } from "@/lib/content/pages-base-path";

/**
 * Defense in depth: only link when canonicalHref is an allowlisted internal path.
 * Tampered / protocol-relative / external / traversal values render as non-links.
 */
function linkableResultHref(
  hit: LearnerSearchHit,
  query: string,
): string | null {
  const href = hit.canonicalHref;
  if (href == null || typeof href !== "string") return null;
  if (!isSafeNavigationPath(href)) return null;
  return appendNavigationContext(
    href,
    buildSearchNavigationContext(query, hit.id),
  );
}

function SearchResultCard({
  hit,
  query,
}: {
  hit: LearnerSearchHit;
  query: string;
}) {
  const meta = (
    <>
      <div className="meta-row">
        <span className="meta-chip">{hit.kind}</span>
        <span className="meta-chip">{lessonMembershipLabel(hit.lessonIds)}</span>
        <span className="meta-chip">{sourcePriorityLabel(hit.sourcePriority)}</span>
        <span className="meta-chip">{matchMetaLabel(hit.match)}</span>
      </div>
    </>
  );

  const href = linkableResultHref(hit, query);
  if (href) {
    return (
      <article className="hub-card panel">
        <h3 className="hub-card__title">
          <Link href={href} className="search-result-link">
            <span className="german" lang="de">
              {hit.displayLabel}
            </span>
          </Link>
        </h3>
        {meta}
      </article>
    );
  }

  return (
    <article className="hub-card panel">
      <h3 className="hub-card__title">
        <span className="german" lang="de">
          {hit.displayLabel}
        </span>
      </h3>
      {meta}
      <p className="dense hub-card__cue">Detail view next phase</p>
    </article>
  );
}

export function SearchView({
  projection,
  searchParams,
  navigation = null,
}: {
  projection: LearnerSearchProjection;
  searchParams: Record<string, string | string[] | undefined>;
  navigation?: NavigationContext | null;
}) {
  const query = parseSearchQueryParam(searchParams);
  const trimmed = query.trim();
  const hits = trimmed.length > 0 ? searchLearnerContent(projection, trimmed) : [];
  const groups = groupSearchHits(hits);
  const backHref = navigation ? resolveBackHref(navigation, "hub") : null;

  return (
    <div className="stack">
      <header className="page-header">
        {backHref ? <BackLink href={backHref} /> : null}
        <p className="dense">Global search</p>
        <h1>Search</h1>
        <p className="lede">
          Search published learner content by canonical German forms, meanings,
          and safe labels. Umlaut aliases match quietly; results always show
          correct German spelling.
        </p>
      </header>

      <section className="panel hub-filters" aria-labelledby="search-form-heading">
        <h2 id="search-form-heading">Find published content</h2>
        <form
          className="hub-filter-form"
          method="get"
          action={withPagesBasePath("/search")}
        >
          <label className="hub-field" htmlFor="global-search-q">
            <span className="hub-field__label">Query</span>
            <input
              id="global-search-q"
              className="hub-input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="e.g. heißen, Ingenieur, sein"
              autoComplete="off"
              aria-label="Search published learner content"
            />
          </label>
          <div className="hub-filter-actions">
            <button className="btn btn-primary" type="submit">
              Search
            </button>
            <Link className="btn btn-secondary" href="/search">
              Clear
            </Link>
          </div>
        </form>
      </section>

      {trimmed.length === 0 ? (
        <div className="panel hub-empty" role="status">
          <h2>Enter a search</h2>
          <p className="muted">
            Type a German word, meaning, or label to see grouped published
            results. Recent searches are not stored in this slice yet.
          </p>
        </div>
      ) : hits.length === 0 ? (
        <div className="panel hub-empty" role="status">
          <h2>No matches</h2>
          <p className="muted">
            No published learner items match “{trimmed}”. Try another spelling
            or clear the query. Review-only material never appears here.
          </p>
        </div>
      ) : (
        <section aria-labelledby="search-results-heading">
          <h2 id="search-results-heading" className="dense">
            Results ({hits.length})
          </h2>
          <div className="search-groups">
            {groups.map((group) => (
              <section
                key={group.kind}
                className="search-group"
                aria-labelledby={`search-group-${group.kind}`}
              >
                <h3 id={`search-group-${group.kind}`} className="search-group__title">
                  {group.label}
                  <span className="dense"> ({group.hits.length})</span>
                </h3>
                <div className="card-grid hub-results">
                  {group.hits.map((hit) => (
                    <SearchResultCard key={hit.id} hit={hit} query={trimmed} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
