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
import { lessonLabel } from "@/lib/content/lesson-label";
import { withPagesBasePath } from "@/lib/content/pages-base-path";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import {
  filterConceptTopics,
  filterListeningGroups,
  hubVisibleItemCount,
  publicWorkbookTrackForId,
} from "@/lib/content/hub-experiences";
import type { LearnerGender } from "@/lib/content/detail-types";
import { resolvePublishedPronunciationExact } from "@/lib/content/media-availability";
import { illustrationForDetail } from "@/lib/content/illustrations";
import { IllustrationPicture } from "@/components/media/IllustrationPicture";
import {
  LemmaAudioButton,
  MeaningPlate,
  type MeaningPlateAudio,
} from "@/components/media/MeaningPlate";

/** Learner-facing lesson labels. Empty membership shows nothing at all. */
function lessonLabels(lessonIds: readonly string[]): readonly string[] {
  return lessonIds.map((id) => lessonLabel(id));
}

/* ------------------------------------------------------------------------ *
 * Per-type hub card anatomy (Phase 2b).
 *
 * The chosen direction forbids one universal panel: each hub answers a
 * different learner question, so each card exposes a different anatomy built
 * from the published projection this component already receives. Nothing here
 * invents a value — every field is read from `record.searchFields`, the
 * canonical `displayLabel`, or the approved pronunciation registry, and a
 * field that has no published value simply does not render.
 * ------------------------------------------------------------------------ */

/** Published field values in projection order. Duplicates matter for verb forms. */
function fieldTexts(
  record: LearnerHubRecord,
  field: string,
): readonly string[] {
  return record.searchFields
    .filter((entry) => entry.field === field)
    .map((entry) => entry.displayText);
}

function firstFieldText(
  record: LearnerHubRecord,
  field: string,
): string | null {
  return fieldTexts(record, field)[0] ?? null;
}

const ARTICLE_GENDER: Readonly<Record<string, LearnerGender>> = Object.freeze({
  der: "masculine",
  die: "feminine",
  das: "neuter",
});

/**
 * Gender is read from the published article, never guessed: `der/die/das` is
 * the canonical carrier of noun gender and matches the detail projection for
 * every current item. Items without an article carry no gender cue at all.
 */
function splitArticle(label: string): {
  article: string | null;
  gender: LearnerGender | null;
  lemma: string;
} {
  const match = /^(der|die|das)\s+(.+)$/u.exec(label);
  if (!match) return { article: null, gender: null, lemma: label };
  const article = match[1] as string;
  return {
    article,
    gender: ARTICLE_GENDER[article] ?? null,
    lemma: match[2] as string,
  };
}

/** Only an exact approved clip produces an audio control. */
function plateAudioFor(sourceText: string): MeaningPlateAudio | null {
  const media = resolvePublishedPronunciationExact(sourceText);
  if (media.state !== "preview") return null;
  return { publicPath: media.publicPath, spokenText: media.spokenText };
}

type VerbRuleCue = Readonly<{
  code: "REG" | "SPELL" | "IRR";
  tone: "regular" | "special" | "irregular";
  label: string;
}>;

function verbStem(infinitive: string): string {
  if (infinitive.endsWith("en")) return infinitive.slice(0, -2);
  if (infinitive.endsWith("n")) return infinitive.slice(0, -1);
  return infinitive;
}

/**
 * REG / SPELL / IRR derived from the published present forms, using the same
 * semantics the detail-page verb map teaches. Positions 0–2 of the projected
 * paradigm are always ich / du / er-sie-es.
 */
function classifyVerbRule(
  infinitive: string,
  forms: readonly string[],
): VerbRuleCue | null {
  if (forms.length < 3) return null;
  const stem = verbStem(infinitive);
  if (stem.length === 0) return null;
  if (forms.some((form) => !form.startsWith(stem))) {
    return { code: "IRR", tone: "irregular", label: "Learn each form whole" };
  }
  const personForms = [`${stem}e`, `${stem}st`, `${stem}t`];
  const deviates =
    forms.slice(0, 3).some((form, index) => form !== personForms[index]) ||
    forms
      .slice(3)
      .some((form) => form !== `${stem}en` && form !== `${stem}t`);
  if (deviates) {
    return { code: "SPELL", tone: "special", label: "Watch the spelling" };
  }
  return { code: "REG", tone: "regular", label: "Regular stem and ending" };
}

const REGISTER_LABELS: Readonly<Record<string, string>> = Object.freeze({
  informal: "Informal (du)",
  formal: "Formal (Sie)",
  neutral: "Works either way",
});

function HubCardLessons({ lessonIds }: { lessonIds: readonly string[] }) {
  const labels = lessonLabels(lessonIds);
  if (labels.length === 0) return null;
  return (
    <p className="meta-row hub-card__meta">
      {labels.map((label) => (
        <span key={label} className="meta-chip">
          {label}
        </span>
      ))}
    </p>
  );
}

function HubCardTitle({
  href,
  children,
}: {
  href: string | null;
  children: ReactNode;
}) {
  return (
    <h2 className="hub-card__title">
      {href ? (
        <Link href={href} className="hub-card__link">
          {children}
        </Link>
      ) : (
        children
      )}
    </h2>
  );
}

/**
 * Vocabulary: a 1:1 media slot (approved illustration when one exists, the
 * permanent meaning plate otherwise), canonical German lemma with its article,
 * English gloss, gender badge, one plural preview and audio when a clip exists.
 * Mastery and due lines are deliberately absent: no card shows review state
 * that this static projection cannot back with real data.
 */
function VocabularyHubCard({
  hub,
  record,
  query,
}: {
  hub: LearnerHubDefinition;
  record: LearnerHubRecord;
  query: HubQueryState;
}) {
  const href = hubDetailHref(hub, record, query);
  const { article, gender, lemma } = splitArticle(record.displayLabel);
  const gloss = firstFieldText(record, "meaning");
  const plural =
    fieldTexts(record, "form").find((form) => form !== lemma) ?? null;
  const morphology = plural ? (gender ? `die ${plural}` : plural) : null;
  const illustration = illustrationForDetail(record.id);

  return (
    <article
      className="hub-card hub-card--vocabulary"
      data-hub-card="vocabulary"
      data-media={illustration ? "illustration" : "plate"}
    >
      {illustration ? (
        <div className="hub-card__media">
          {illustration.responsive ? (
            <IllustrationPicture
              variant={illustration.responsive.card}
              alt={illustration.alt}
              imageClassName="hub-card__image"
              pictureClassName="hub-card__picture"
              /* Browse grids scroll; only the first rows are ever in view. */
              loading="lazy"
              objectPosition={illustration.objectPosition}
            />
          ) : (
            <img
              className="hub-card__image"
              src={withPagesBaseAssetPath(
                `/illustrations/${illustration.filename}`,
              )}
              alt={illustration.alt}
              width={illustration.width}
              height={illustration.height}
              style={{ objectPosition: illustration.objectPosition }}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
      ) : null}
      <MeaningPlate
        variant={illustration ? "body" : "card"}
        headingLevel={2}
        href={href}
        lemma={lemma}
        article={article}
        gloss={gloss}
        gender={gender}
        morphologyLabel={morphology ? "Plural" : null}
        morphology={morphology}
        audio={plateAudioFor(record.displayLabel)}
      />
      <HubCardLessons lessonIds={record.lessonIds} />
    </article>
  );
}

/** Verbs: infinitive, gloss, rule cue, two useful forms, audio when present. */
function VerbHubCard({
  hub,
  record,
  query,
}: {
  hub: LearnerHubDefinition;
  record: LearnerHubRecord;
  query: HubQueryState;
}) {
  const href = hubDetailHref(hub, record, query);
  const infinitive = firstFieldText(record, "infinitive") ?? record.displayLabel;
  const gloss = firstFieldText(record, "meaning");
  const forms = fieldTexts(record, "form");
  const rule = classifyVerbRule(infinitive, forms);
  const usefulForms = [
    { person: "ich", form: forms[0] },
    { person: "du", form: forms[1] },
  ].filter((entry): entry is { person: string; form: string } =>
    Boolean(entry.form),
  );
  const audio = plateAudioFor(record.displayLabel);

  return (
    <article
      className="hub-card hub-card--verb"
      data-hub-card="verbs"
      data-verb-rule={rule ? rule.code : "none"}
    >
      <HubCardTitle href={href}>
        <span className="german" lang="de">
          {infinitive}
        </span>
      </HubCardTitle>
      {gloss ? <p className="hub-card__gloss">{gloss}</p> : null}
      {rule ? (
        <p className="hub-card__cue">
          <span className="visual-cue" data-tone={rule.tone} data-morph={rule.code}>
            {rule.code}
          </span>
          <span className="hub-card__cue-text">{rule.label}</span>
        </p>
      ) : null}
      {usefulForms.length > 0 ? (
        <dl className="hub-card__forms">
          {usefulForms.map((entry) => (
            <div key={entry.person} className="hub-card__form">
              <dt className="german" lang="de">
                {entry.person}
              </dt>
              <dd className="german" lang="de">
                {entry.form}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {audio ? <LemmaAudioButton audio={audio} label={infinitive} /> : null}
      <HubCardLessons lessonIds={record.lessonIds} />
    </article>
  );
}

/**
 * Grammar: the German rule title, its plain-English rule name, and the one
 * published worked model that shows the rule in use. The model carries the
 * same weight as the verb card's forms — dominant German on one line, always
 * selectable HTML — and a rule that publishes no model simply shows none.
 */
function GrammarHubCard({
  hub,
  record,
  query,
}: {
  hub: LearnerHubDefinition;
  record: LearnerHubRecord;
  query: HubQueryState;
}) {
  const href = hubDetailHref(hub, record, query);
  const ruleName =
    fieldTexts(record, "title").find(
      (title) => title !== record.displayLabel,
    ) ?? null;
  const model = record.model?.trim() ?? "";
  const audio = plateAudioFor(record.displayLabel);

  return (
    <article className="hub-card hub-card--grammar" data-hub-card="grammar">
      <HubCardTitle href={href}>
        <span className="german" lang="de">
          {record.displayLabel}
        </span>
      </HubCardTitle>
      {ruleName ? <p className="hub-card__gloss">{ruleName}</p> : null}
      {model.length > 0 ? (
        <dl className="hub-card__forms">
          <div className="hub-card__form">
            <dt>Model</dt>
            <dd className="german" lang="de">
              {model}
            </dd>
          </div>
        </dl>
      ) : null}
      {audio ? (
        <LemmaAudioButton audio={audio} label={record.displayLabel} />
      ) : null}
      <HubCardLessons lessonIds={record.lessonIds} />
    </article>
  );
}

/** Phrases: the German turn you can say, its role in the exchange, register. */
function PhraseHubCard({
  hub,
  record,
  query,
}: {
  hub: LearnerHubDefinition;
  record: LearnerHubRecord;
  query: HubQueryState;
}) {
  const href = hubDetailHref(hub, record, query);
  const turn = record.displayLabel.trim().endsWith("?") ? "Question" : "Answer";
  const register = record.category
    ? REGISTER_LABELS[record.category] ?? null
    : null;
  const audio = plateAudioFor(record.displayLabel);

  return (
    <article
      className="hub-card hub-card--phrase"
      data-hub-card="phrases"
      data-turn={turn.toLowerCase()}
    >
      <p className="hub-card__turn">
        <span
          className="visual-cue"
          data-tone={turn === "Question" ? "question" : "answer"}
        >
          {turn}
        </span>
        {record.kind === "QAPair" ? (
          <span className="hub-card__cue-text">
            Opens the whole exchange with its answers
          </span>
        ) : null}
      </p>
      <HubCardTitle href={href}>
        <span className="german" lang="de">
          {record.displayLabel}
        </span>
      </HubCardTitle>
      {register ? <p className="hub-card__gloss">{register}</p> : null}
      {audio ? (
        <LemmaAudioButton audio={audio} label={record.displayLabel} />
      ) : null}
      <HubCardLessons lessonIds={record.lessonIds} />
    </article>
  );
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

/** Whole seconds only — the projection stores exact clip durations. */
function durationLabel(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} sec`;
}

/**
 * Listening: what the exercise is for, how long it runs, how many tracks it
 * holds, and the player action that opens it.
 */
function ListeningGroupCard({ group }: { group: LearnerListeningGroup }) {
  const totalSeconds = group.tracks.reduce(
    (sum, track) => sum + track.durationSeconds,
    0,
  );
  return (
    <article className="hub-card hub-card--listening" data-hub-card="listening">
      <h2 className="hub-card__title">{group.purpose}</h2>
      <p className="hub-card__gloss">
        {group.exercise} · {group.lessonLabel}
      </p>
      <p className="meta-row hub-card__meta">
        <span className="meta-chip">{durationLabel(totalSeconds)}</span>
        <span className="meta-chip">
          {group.tracks.length} track{group.tracks.length === 1 ? "" : "s"}
        </span>
      </p>
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

/**
 * Concepts: a topic summary plus a relationship mini-map. The map is a real
 * accessible list of the hubs this topic reaches, drawn with CSS connectors —
 * it is never an image, and it lists only destinations the topic really has.
 */
function ConceptTopicCard({ topic }: { topic: LearnerConceptTopic }) {
  const mapId = `concept-map-${topic.id.replaceAll(":", "-")}`;
  return (
    <article className="hub-card hub-card--concept" data-hub-card="concepts">
      <h2 className="hub-card__title">{topic.displayLabel}</h2>
      <p className="hub-card__gloss">{topic.summary}</p>
      {topic.hubActions.length > 0 ? (
        <nav className="concept-map" aria-labelledby={mapId}>
          <p className="concept-map__label" id={mapId}>
            Where this topic goes
          </p>
          <ul className="concept-map__spokes">
            {topic.hubActions.map((action) => (
              <li key={`${action.label}:${action.path}`}>
                <Link className="concept-map__spoke" href={action.path}>
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <div className="hub-filter-actions">
        {topic.activities.map((activity) => (
          <Link key={activity.activityId} className="btn btn-primary" href={activity.path}>
            {activity.label}
          </Link>
        ))}
      </div>
      <p className="meta-row hub-card__meta">
        {lessonLabels(topic.lessonIds).map((label) => (
          <span key={label} className="meta-chip">
            {label}
          </span>
        ))}
        <span className="meta-chip">
          {topic.sourceEntityIds.length} connected items
        </span>
      </p>
    </article>
  );
}

/**
 * Routes a published record to the anatomy its hub actually needs. There is no
 * universal fallback panel: every hub that lists records has a designed card.
 */
function HubRecordCard({
  hub,
  record,
  query,
}: {
  hub: LearnerHubDefinition;
  record: LearnerHubRecord;
  query: HubQueryState;
}) {
  if (hub.id === "verbs") {
    return <VerbHubCard hub={hub} record={record} query={query} />;
  }
  if (hub.id === "grammar") {
    return <GrammarHubCard hub={hub} record={record} query={query} />;
  }
  if (hub.id === "phrases") {
    return <PhraseHubCard hub={hub} record={record} query={query} />;
  }
  return <VocabularyHubCard hub={hub} record={record} query={query} />;
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
  // A hub that renders a derived experience filters that experience, not its
  // record list, so its record categories cannot narrow anything a learner can
  // see. Offering them would be a control that does nothing.
  const hasCategories = hub.experience == null && hub.categories.length > 0;

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
