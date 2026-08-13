import Link from "next/link";
import type {
  LearnerHubDefinition,
  LearnerHubProjection,
  LearnerHubRecord,
} from "@/lib/content/hub-types";
import {
  filterHubRecords,
  hubClearHref,
  hubFilterSummary,
  parseHubSearchParams,
  type HubQueryState,
} from "@/lib/content/hub-query";
import {
  appendNavigationContext,
  buildHubNavigationContext,
  isSafeNavigationPath,
} from "@/lib/content/navigation-context";
import {
  detailCanonicalPath,
  detailHubForId,
} from "@/lib/content/detail-types";
import { withPagesBasePath } from "@/lib/content/pages-base-path";

function kindLabel(kind: LearnerHubRecord["kind"]): string {
  switch (kind) {
    case "Lexeme":
      return "Lexeme";
    case "Verb":
      return "Verb";
    case "GrammarConcept":
      return "Grammar";
    case "PhrasePattern":
      return "Phrase";
    case "QAPair":
      return "Q&A";
    case "Dialogue":
      return "Dialogue";
    case "ListeningAsset":
      return "Listening";
    case "Collection":
      return "Collection";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function lessonChips(lessonIds: readonly string[]): string {
  if (lessonIds.length === 0) return "No lesson link";
  return lessonIds
    .map((id) => {
      const segment = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
      return `Lesson ${segment}`;
    })
    .join(", ");
}

function hubDetailHref(
  hub: LearnerHubDefinition,
  record: LearnerHubRecord,
  query: HubQueryState,
): string | null {
  const detailHub = detailHubForId(record.id);
  if (detailHub !== hub.id) return null;
  const href = detailCanonicalPath(detailHub, record.id);
  if (!isSafeNavigationPath(href)) return null;
  return appendNavigationContext(
    href,
    buildHubNavigationContext({
      hubId: hub.id,
      ...(query.q.trim().length > 0 ? { q: query.q } : {}),
      ...(query.lesson === "01" || query.lesson === "02"
        ? { lesson: query.lesson }
        : {}),
      ...(query.category && query.category !== "all"
        ? { category: query.category }
        : {}),
      resultId: record.id,
    }),
  );
}

export function HubDirectoryView({
  projection,
}: {
  projection: LearnerHubProjection;
}) {
  return (
    <div className="stack">
      <header className="page-header">
        <p className="dense">Learner hubs</p>
        <h1>Hubs</h1>
        <p className="lede">
          Directory of the six canonical content hubs. Open a hub to browse
          published items with search and filters.
        </p>
      </header>

      <p className="hub-mobile-search">
        <Link
          className="btn btn-secondary hub-mobile-search__link"
          href="/search"
          aria-label="Open global search"
        >
          Search published content
        </Link>
      </p>

      <div className="hub-shortcuts">
        {projection.hubs.map((hub) => (
          <Link key={hub.id} className="hub-shortcut hub-shortcut--link" href={hub.path}>
            <span>
              <span className="hub-shortcut__title">{hub.title}</span>
              <span className="dense hub-shortcut__count">
                {hub.itemCount} published
              </span>
            </span>
            <span className="dense">Open</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function HubEmptyPublished({ hub }: { hub: LearnerHubDefinition }) {
  return (
    <div className="panel hub-empty" role="status">
      <h2>No published items yet</h2>
      <p className="muted">
        {hub.title} has no learner-published records in the current validated
        package. Approved content will appear here when publication status
        allows it. Review-only material is never shown as a substitute.
      </p>
    </div>
  );
}

function HubNoMatches({ hub }: { hub: LearnerHubDefinition }) {
  return (
    <div className="panel hub-empty" role="status">
      <h2>No matches</h2>
      <p className="muted">
        Nothing in {hub.title} matches the current search and filters. Clear
        filters to see all {hub.itemCount} published items.
      </p>
      <p style={{ marginTop: "1rem" }}>
        <Link className="btn btn-secondary" href={hubClearHref(hub.path)}>
          Clear filters
        </Link>
      </p>
    </div>
  );
}

function HubRecordCard({
  hub,
  record,
  query,
}: {
  hub: LearnerHubDefinition;
  record: LearnerHubRecord;
  query: HubQueryState;
}) {
  const href = hubDetailHref(hub, record, query);
  return (
    <article className="hub-card panel">
      <h2 className="hub-card__title">
        {href ? (
          <Link href={href} className="search-result-link">
            <span className="german" lang="de">
              {record.displayLabel}
            </span>
          </Link>
        ) : (
          <span className="german" lang="de">
            {record.displayLabel}
          </span>
        )}
      </h2>
      <div className="meta-row">
        <span className="meta-chip">{kindLabel(record.kind)}</span>
        {record.category ? (
          <span className="meta-chip">{record.category}</span>
        ) : null}
        <span className="meta-chip">{lessonChips(record.lessonIds)}</span>
      </div>
      {href ? null : (
        <p className="dense hub-card__cue">Detail view next phase</p>
      )}
    </article>
  );
}

function HubFilters({
  hub,
  query,
}: {
  hub: LearnerHubDefinition;
  query: HubQueryState;
}) {
  const summary = hubFilterSummary(query);
  const searchId = `hub-search-${hub.id}`;
  const lessonId = `hub-lesson-${hub.id}`;
  const categoryId = `hub-category-${hub.id}`;
  const hasCategories = hub.categories.length > 0;

  return (
    <section className="panel hub-filters" aria-labelledby="hub-filters-heading">
      <h2 id="hub-filters-heading">Filter published items</h2>
      <form
        className="hub-filter-form"
        method="get"
        action={withPagesBasePath(hub.path)}
      >
        <div className="hub-filter-grid">
          <label className="hub-field" htmlFor={searchId}>
            <span className="hub-field__label">Search</span>
            <input
              id={searchId}
              className="hub-input"
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder="Canonical German text"
              autoComplete="off"
              aria-label={`Search ${hub.title}`}
            />
          </label>
          <label className="hub-field" htmlFor={lessonId}>
            <span className="hub-field__label">Lesson</span>
            <select
              id={lessonId}
              className="hub-input"
              name="lesson"
              defaultValue={query.lesson}
              aria-label={`Filter ${hub.title} by lesson`}
            >
              <option value="all">All</option>
              <option value="01">Lesson 1</option>
              <option value="02">Lesson 2</option>
            </select>
          </label>
          {hasCategories ? (
            <label className="hub-field" htmlFor={categoryId}>
              <span className="hub-field__label">Category</span>
              <select
                id={categoryId}
                className="hub-input"
                name="category"
                defaultValue={query.category ?? "all"}
                aria-label={`Filter ${hub.title} by category`}
              >
                <option value="all">All</option>
                {hub.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="hub-filter-actions">
          <button className="btn btn-primary" type="submit">
            Apply filters
          </button>
          <Link className="btn btn-secondary" href={hubClearHref(hub.path)}>
            Clear filters
          </Link>
        </div>
      </form>
      {summary.length > 0 ? (
        <p className="dense hub-filter-summary" aria-live="polite">
          Active filters: {summary.join(" · ")}
        </p>
      ) : (
        <p className="dense hub-filter-summary">No active filters</p>
      )}
      <p className="placeholder-banner hub-state-note">
        Learned, due, mastery, and streak controls are not available in this
        slice. Counts and filters reflect published content only.
      </p>
    </section>
  );
}

export function HubListView({
  hub,
  searchParams,
}: {
  hub: LearnerHubDefinition;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = parseHubSearchParams(searchParams, hub.categories);
  const filtered = filterHubRecords(hub.items, query);
  const showAfterFilters = hub.itemCount > 0 && filtered.hasActiveFilters;

  return (
    <div className="stack">
      <header className="page-header">
        <p className="dense">Canonical hub</p>
        <h1>{hub.title}</h1>
        <p className="lede">{hub.description}</p>
        <p className="meta-row" style={{ marginTop: "0.5rem" }}>
          <span className="meta-chip">{hub.itemCount} published</span>
          <span className="meta-chip">
            Showing {filtered.items.length}
            {showAfterFilters ? " after filters" : ""}
          </span>
        </p>
      </header>

      <HubFilters hub={hub} query={query} />

      {hub.itemCount === 0 ? (
        <HubEmptyPublished hub={hub} />
      ) : filtered.items.length === 0 ? (
        <HubNoMatches hub={hub} />
      ) : (
        <section aria-labelledby="hub-results-heading">
          <h2 id="hub-results-heading" className="dense">
            Results
          </h2>
          <div className="card-grid hub-results">
            {filtered.items.map((record) => (
              <HubRecordCard
                key={record.id}
                hub={hub}
                record={record}
                query={query}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
