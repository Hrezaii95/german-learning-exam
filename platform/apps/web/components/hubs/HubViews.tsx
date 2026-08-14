import type { ReactNode } from "react";
import Link from "next/link";
import type {
  LearnerConceptTopic,
  LearnerHubDefinition,
  LearnerHubId,
  LearnerHubProjection,
  LearnerHubRecord,
  LearnerListeningGroup,
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
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import {
  filterConceptTopics,
  filterListeningGroups,
  hubVisibleItemCount,
  publicWorkbookTrackForId,
} from "@/lib/content/hub-experiences";

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

/**
 * Tool-drawer presentation for the six hubs (dashboard + /hubs directory).
 * Icons are drawn inline so no new image asset is required, and they carry no
 * gender or verb-rule meaning — those systems stay reserved for real semantics.
 */
const HUB_TOOL_GLYPHS: Record<LearnerHubId, ReactNode> = {
  vocabulary: (
    <>
      <path d="M4 5.6A1.6 1.6 0 0 1 5.6 4H10a2.4 2.4 0 0 1 2 1.1A2.4 2.4 0 0 1 14 4h4.4A1.6 1.6 0 0 1 20 5.6v11.8a1.6 1.6 0 0 1-1.6 1.6H14a2.4 2.4 0 0 0-2 1.1 2.4 2.4 0 0 0-2-1.1H5.6A1.6 1.6 0 0 1 4 17.4Z" />
      <path d="M12 5.1v14.9" />
    </>
  ),
  verbs: (
    <>
      <path d="M19.6 12a7.6 7.6 0 1 1-2.7-5.8" />
      <path d="M19.6 4.4V9h-4.6" />
      <path d="M9 12h6" />
    </>
  ),
  grammar: (
    <>
      <rect x="3.4" y="4.4" width="7" height="5.6" rx="1.6" />
      <rect x="13.6" y="4.4" width="7" height="5.6" rx="1.6" />
      <rect x="8.5" y="14" width="7" height="5.6" rx="1.6" />
      <path d="M6.9 10v2.2h10.2V10" />
      <path d="M12 12.2V14" />
    </>
  ),
  phrases: (
    <>
      <rect x="3" y="4.4" width="11" height="7" rx="2.2" />
      <path d="M6.6 11.4v3.1l3.1-3.1" />
      <rect x="10" y="12.6" width="11" height="7" rx="2.2" />
      <path d="M17.4 19.6v2.4l-2.6-2.4" />
    </>
  ),
  listening: (
    <>
      <path d="M4.6 15.2V12a7.4 7.4 0 0 1 14.8 0v3.2" />
      <rect x="2.8" y="13.8" width="4.2" height="6.2" rx="2.1" />
      <rect x="17" y="13.8" width="4.2" height="6.2" rx="2.1" />
    </>
  ),
  concepts: (
    <>
      <circle cx="12" cy="5.6" r="2.6" />
      <circle cx="5.6" cy="17.2" r="2.6" />
      <circle cx="18.4" cy="17.2" r="2.6" />
      <path d="M10.6 7.7 7 14.9" />
      <path d="M13.4 7.7 17 14.9" />
      <path d="M8.2 17.2h7.6" />
    </>
  ),
};

type HubToolCopy = Readonly<{
  /** Learner-language noun for the count. Never a schema or entity name. */
  countNoun: (count: number) => string;
  benefit: string;
  previewLabel: string;
  previewLang: "de" | "en";
}>;

const HUB_TOOL_COPY: Readonly<Record<LearnerHubId, HubToolCopy>> = Object.freeze({
  vocabulary: Object.freeze({
    countNoun: (count: number) => `${count} ${count === 1 ? "word" : "words"}`,
    benefit: "Look a word up with its article, meaning and plural.",
    previewLabel: "Words inside",
    previewLang: "de",
  }),
  verbs: Object.freeze({
    countNoun: (count: number) => `${count} ${count === 1 ? "verb" : "verbs"}`,
    benefit: "See every present-tense form and how the ending changes.",
    previewLabel: "Verbs inside",
    previewLang: "de",
  }),
  grammar: Object.freeze({
    countNoun: (count: number) => `${count} ${count === 1 ? "rule" : "rules"}`,
    benefit: "Short rules, each with one worked German model.",
    previewLabel: "Rules inside",
    previewLang: "de",
  }),
  phrases: Object.freeze({
    countNoun: (count: number) => `${count} ${count === 1 ? "phrase" : "phrases"}`,
    benefit: "Whole questions and answers you can say straight away.",
    previewLabel: "Turns inside",
    previewLang: "de",
  }),
  listening: Object.freeze({
    countNoun: (count: number) => `${count} audio ${count === 1 ? "track" : "tracks"}`,
    benefit: "Workbook audio kept with the exercise it belongs to.",
    previewLabel: "Exercises inside",
    previewLang: "en",
  }),
  concepts: Object.freeze({
    countNoun: (count: number) => `${count} ${count === 1 ? "topic" : "topics"}`,
    benefit: "See how one topic links lessons, words and grammar.",
    previewLabel: "Topics inside",
    previewLang: "en",
  }),
});

const HUB_PREVIEW_LIMIT = 3;

/** Type-specific sample drawn from the real projection — never invented copy. */
export function hubToolPreviewItems(hub: LearnerHubDefinition): readonly string[] {
  const source =
    hub.experience?.kind === "listening"
      ? hub.experience.groups.map((group) => group.purpose)
      : hub.experience?.kind === "concepts"
        ? hub.experience.topics.map((topic) => topic.displayLabel)
        : hub.items.map((item) => item.displayLabel);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const label of source) {
    if (seen.has(label)) continue;
    seen.add(label);
    unique.push(label);
    if (unique.length === HUB_PREVIEW_LIMIT) break;
  }
  return unique;
}

function HubToolDrawer({ hub }: { hub: LearnerHubDefinition }) {
  const copy = HUB_TOOL_COPY[hub.id];
  const count = hubVisibleItemCount(hub);
  const preview = count === 0 ? [] : hubToolPreviewItems(hub);
  const nameId = `tool-drawer-${hub.id}`;

  return (
    <li className="tool-drawer">
      <span className="tool-drawer__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          {HUB_TOOL_GLYPHS[hub.id]}
        </svg>
      </span>
      <h3 className="tool-drawer__name" id={nameId}>
        <Link
          className="tool-drawer__link"
          href={hub.path}
          aria-label={`Open ${hub.title}`}
        >
          {hub.title}
        </Link>
      </h3>
      <p className="tool-drawer__count">{copy.countNoun(count)}</p>
      <p className="tool-drawer__benefit">{copy.benefit}</p>
      {preview.length > 0 ? (
        <div className="tool-drawer__preview">
          <p className="tool-drawer__preview-label" id={`${nameId}-preview`}>
            {copy.previewLabel}
          </p>
          <ul
            className="tool-drawer__preview-list"
            aria-labelledby={`${nameId}-preview`}
          >
            {preview.map((label) => (
              <li key={label}>
                {copy.previewLang === "de" ? (
                  <span className="german" lang="de">
                    {label}
                  </span>
                ) : (
                  label
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="tool-drawer__preview tool-drawer__preview--empty">
          Nothing here yet — this hub fills up as the course grows.
        </p>
      )}
      <span className="tool-drawer__arrow" aria-hidden="true">
        →
      </span>
    </li>
  );
}

export function HubToolDrawerGrid({
  hubs,
}: {
  hubs: readonly LearnerHubDefinition[];
}) {
  return (
    <ul className="tool-drawers">
      {hubs.map((hub) => (
        <HubToolDrawer key={hub.id} hub={hub} />
      ))}
    </ul>
  );
}

export function HubDirectoryView({
  projection,
}: {
  projection: LearnerHubProjection;
}) {
  return (
    <div className="stack browse-shell">
      <header className="page-header">
        <p className="dense">Learner hubs</p>
        <h1>Hubs</h1>
        <p className="lede">
          Six content hubs cover everything you are learning. Open a hub to
          browse its items with search and filters.
        </p>
      </header>

      <p className="hub-mobile-search">
        <Link
          className="btn btn-secondary hub-mobile-search__link"
          href="/search"
          aria-label="Open global search"
        >
          Search all content
        </Link>
      </p>

      <section aria-labelledby="hub-directory-heading">
        <h2 id="hub-directory-heading">Open a hub</h2>
        <HubToolDrawerGrid hubs={projection.hubs} />
      </section>
    </div>
  );
}

function HubEmptyPublished({ hub }: { hub: LearnerHubDefinition }) {
  return (
    <div className="panel hub-empty" role="status">
      <h2>Nothing here yet</h2>
      <p className="muted">
        {hub.title} has no items yet. New content will appear here as the
        course grows.
      </p>
    </div>
  );
}

function HubNoMatches({ hub }: { hub: LearnerHubDefinition }) {
  const visibleItemCount = hubVisibleItemCount(hub);
  return (
    <div className="panel hub-empty" role="status">
      <h2>No matches</h2>
      <p className="muted">
        Nothing in {hub.title} matches the current search and filters. Clear
        filters to see all {visibleItemCount} items.
      </p>
      <p style={{ marginTop: "1rem" }}>
        <Link className="btn btn-secondary" href={hubClearHref(hub.path)}>
          Clear filters
        </Link>
      </p>
    </div>
  );
}

function ListeningGroupCard({ group }: { group: LearnerListeningGroup }) {
  return (
    <article className="hub-card panel">
      <div className="meta-row">
        <span className="meta-chip">{group.lessonLabel}</span>
        <span className="meta-chip">{group.exercise}</span>
        <span className="meta-chip">
          {group.tracks.length} track{group.tracks.length === 1 ? "" : "s"}
        </span>
      </div>
      <h2 className="hub-card__title">{group.purpose}</h2>
      <ol className="workbook-audio__list">
        {group.tracks.map((track) => {
          const media = publicWorkbookTrackForId(track.trackId);
          if (!media) return null;
          return (
            <li key={track.id} className="workbook-audio__track">
              <div>
                <strong>
                  {track.exercise} · Track {track.trackId.replace("_", ".")}
                </strong>
                <p className="dense">{Math.round(track.durationSeconds)} sec</p>
              </div>
              {/* The transcript is intentionally withheld: revealing it would
                  disclose listening answers and its public rights are blocked. */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                controls
                preload="metadata"
                src={withPagesBaseAssetPath(
                  `/audio/source-workbook-approved-v1/${media.filename}`,
                )}
                aria-label={`${track.exercise}, track ${track.trackId.replace("_", ".")}, ${track.purpose}`}
              />
            </li>
          );
        })}
      </ol>
      <p style={{ marginTop: "1rem" }}>
        <Link className="btn btn-primary" href={group.activity.path}>
          {group.activity.label}
        </Link>
      </p>
    </article>
  );
}

function ConceptTopicCard({ topic }: { topic: LearnerConceptTopic }) {
  return (
    <article className="hub-card panel">
      <div className="meta-row">
        {topic.lessonIds.map((lessonId) => (
          <span key={lessonId} className="meta-chip">
            {lessonChips([lessonId])}
          </span>
        ))}
        <span className="meta-chip">
          {topic.sourceEntityIds.length} related items
        </span>
      </div>
      <h2 className="hub-card__title">{topic.displayLabel}</h2>
      <p className="muted">{topic.summary}</p>
      <div className="hub-filter-actions">
        {topic.activities.map((activity) => (
          <Link key={activity.activityId} className="btn btn-primary" href={activity.path}>
            {activity.label}
          </Link>
        ))}
      </div>
      <nav className="hub-filter-actions" aria-label={`${topic.displayLabel} related hubs`}>
        {topic.hubActions.map((action) => (
          <Link key={`${action.label}:${action.path}`} className="btn btn-secondary" href={action.path}>
            {action.label}
          </Link>
        ))}
      </nav>
    </article>
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
      <h2 id="hub-filters-heading">Filter items</h2>
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
  const visibleItemCount = hubVisibleItemCount(hub);
  const listeningGroups =
    hub.experience?.kind === "listening"
      ? filterListeningGroups(hub.experience, query)
      : null;
  const conceptTopics =
    hub.experience?.kind === "concepts"
      ? filterConceptTopics(hub.experience, query)
      : null;
  const visibleResultCount = listeningGroups
    ? listeningGroups.reduce((sum, group) => sum + group.tracks.length, 0)
    : conceptTopics
      ? conceptTopics.length
      : filtered.items.length;
  const showAfterFilters = visibleItemCount > 0 && filtered.hasActiveFilters;

  return (
    <div className="stack">
      <header className="page-header">
        <p className="dense">Hub</p>
        <h1>{hub.title}</h1>
        <p className="lede">{hub.description}</p>
        <p className="meta-row" style={{ marginTop: "0.5rem" }}>
          <span className="meta-chip">{visibleItemCount} items</span>
          <span className="meta-chip">
            Showing {visibleResultCount}
            {showAfterFilters ? " after filters" : ""}
          </span>
        </p>
        {hub.id === "vocabulary" ? (
          <p style={{ marginTop: "1rem" }}>
            <Link className="btn btn-secondary" href="/collections/professions">
              Open 48-row optional professions collection
            </Link>
          </p>
        ) : null}
      </header>

      <HubFilters hub={hub} query={query} />

      {visibleItemCount === 0 ? (
        <HubEmptyPublished hub={hub} />
      ) : visibleResultCount === 0 ? (
        <HubNoMatches hub={hub} />
      ) : listeningGroups ? (
        <section aria-labelledby="hub-results-heading">
          <h2 id="hub-results-heading" className="dense">
            Workbook exercises
          </h2>
          <div className="card-grid hub-results">
            {listeningGroups.map((group) => (
              <ListeningGroupCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      ) : conceptTopics ? (
        <section aria-labelledby="hub-results-heading">
          <h2 id="hub-results-heading" className="dense">
            Connected learning paths
          </h2>
          <div className="card-grid hub-results">
            {conceptTopics.map((topic) => (
              <ConceptTopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </section>
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
