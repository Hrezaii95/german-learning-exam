"use client";
import { LArticle, LButton, LDd, LDiv, LDl, LDt, LForm, LH1, LH2, LH3, LHeader, LInput, LLabel, LLi, LNav, LOl, LOption, LP, LSection, LSelect, LSpan, LStrong, LUl } from "@/components/i18n/LocalizedElements";


import type { ReactNode } from "react";
import {submitLocalSearch} from "@/components/search/submit-local-search";
import type {StudyUnit} from "@/lib/study/course-lessons";
import {CoursePatternCard} from "@/components/study/CoursePatternCard";
import {coursePatternEntries,coursePatternTags} from "@/lib/study/course-patterns";
import {GrammarConnections} from "@/components/study/GrammarConnections";
import {useStudyScope} from "@/components/study/StudyScope";
import {hubStudyTags} from "@/lib/study/tags";
import {numericLessons,tagsForLesson,availableLessons,scopeLabel,defaultStudyScope} from "@/lib/study/scope";
import { SaveButton } from "@/components/study/StudyProvider";
import Link from "@/components/i18n/LocalizedLink";
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
import { ListeningTranscript } from "@/components/audio/ListeningTranscript";
import { workbookTranscript } from "@/lib/audio/listening-transcripts";
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
import { WordFamilyPreview } from "@/components/word-cards/WordFamilyPreview";
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
    <LP className="meta-row hub-card__meta">
      {labels.map((label) => (
        <LSpan key={label} className="meta-chip">
          {label}
        </LSpan>
      ))}
    </LP>
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
    <LH2 className="hub-card__title">
      {href ? (
        <Link href={href} className="hub-card__link">
          {children}
        </Link>
      ) : (
        children
      )}
    </LH2>
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
  if (record.wordFamily && href) return <WordFamilyPreview card={record.wordFamily} href={href} lessonIds={record.lessonIds} />;
  const { article, gender, lemma } = splitArticle(record.displayLabel);
  const gloss = firstFieldText(record, "meaning");
  const plural =
    fieldTexts(record, "form").find((form) => form !== lemma) ?? null;
  const morphology = plural ? (gender ? `die ${plural}` : plural) : null;
  const illustration = illustrationForDetail(record.id);

  return (
    <LArticle
      className="hub-card hub-card--vocabulary"
      data-hub-card="vocabulary"
      data-media={illustration ? "illustration" : "plate"}
    >
      {illustration ? (
        <LDiv className="hub-card__media">
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
        </LDiv>
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
      {href && <SaveButton item={{ id: `concept-${record.id}`, title: record.model || record.displayLabel, meaning: record.searchFields.filter(field => /meaning|title|english/.test(field.field)).map(field => field.displayText).filter(text => text !== record.displayLabel).join(" · ") || record.displayLabel, kind: hub.id === "phrases" ? "phrase" : "concept", href }} />}
    </LArticle>
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
    <LArticle
      className="hub-card hub-card--verb"
      data-hub-card="verbs"
      data-verb-rule={rule ? rule.code : "none"}
    >
      <HubCardTitle href={href}>
        <LSpan className="german" lang="de">
          {infinitive}
        </LSpan>
      </HubCardTitle>
      {gloss ? <LP className="hub-card__gloss">{gloss}</LP> : null}
      {rule ? (
        <LP className="hub-card__cue">
          <LSpan className="visual-cue" data-tone={rule.tone} data-morph={rule.code}>
            {rule.code}
          </LSpan>
          <LSpan className="hub-card__cue-text">{rule.label}</LSpan>
        </LP>
      ) : null}
      {usefulForms.length > 0 ? (
        <LDl className="hub-card__forms">
          {usefulForms.map((entry) => (
            <LDiv key={entry.person} className="hub-card__form">
              <LDt className="german" lang="de">
                {entry.person}
              </LDt>
              <LDd className="german" lang="de">
                {entry.form}
              </LDd>
            </LDiv>
          ))}
        </LDl>
      ) : null}
      {audio ? <LemmaAudioButton audio={audio} label={infinitive} /> : null}
      <HubCardLessons lessonIds={record.lessonIds} />
      {href && <SaveButton item={{ id: `concept-${record.id}`, title: record.model || record.displayLabel, meaning: record.searchFields.filter(field => /meaning|title|english/.test(field.field)).map(field => field.displayText).filter(text => text !== record.displayLabel).join(" · ") || record.displayLabel, kind: hub.id === "phrases" ? "phrase" : "concept", href }} />}
    </LArticle>
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
    <LArticle className="hub-card hub-card--grammar" data-hub-card="grammar">
      <HubCardTitle href={href}>
        <LSpan className="german" lang="de">
          {record.displayLabel}
        </LSpan>
      </HubCardTitle>
      {ruleName ? <LP className="hub-card__gloss">{ruleName}</LP> : null}
      {model.length > 0 ? (
        <LDl className="hub-card__forms">
          <LDiv className="hub-card__form">
            <LDt>Model</LDt>
            <LDd className="german" lang="de">
              {model}
            </LDd>
          </LDiv>
        </LDl>
      ) : null}
      {audio ? (
        <LemmaAudioButton audio={audio} label={record.displayLabel} />
      ) : null}
      <HubCardLessons lessonIds={record.lessonIds} />
      {href && <SaveButton item={{ id: `concept-${record.id}`, title: record.model || record.displayLabel, meaning: record.searchFields.filter(field => /meaning|title|english/.test(field.field)).map(field => field.displayText).filter(text => text !== record.displayLabel).join(" · ") || record.displayLabel, kind: hub.id === "phrases" ? "phrase" : "concept", href }} />}
    </LArticle>
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
    <LArticle
      className="hub-card hub-card--phrase"
      data-hub-card="phrases"
      data-turn={turn.toLowerCase()}
    >
      <LP className="hub-card__turn">
        <LSpan
          className="visual-cue"
          data-tone={turn === "Question" ? "question" : "answer"}
        >
          {turn}
        </LSpan>
        {record.kind === "QAPair" ? (
          <LSpan className="hub-card__cue-text">
            Opens the whole exchange with its answers
          </LSpan>
        ) : null}
      </LP>
      <HubCardTitle href={href}>
        <LSpan className="german" lang="de">
          {record.displayLabel}
        </LSpan>
      </HubCardTitle>
      {register ? <LP className="hub-card__gloss">{register}</LP> : null}
      {audio ? (
        <LemmaAudioButton audio={audio} label={record.displayLabel} />
      ) : null}
      <HubCardLessons lessonIds={record.lessonIds} />
      {href && <SaveButton item={{ id: `concept-${record.id}`, title: record.model || record.displayLabel, meaning: record.searchFields.filter(field => /meaning|title|english/.test(field.field)).map(field => field.displayText).filter(text => text !== record.displayLabel).join(" · ") || record.displayLabel, kind: hub.id === "phrases" ? "phrase" : "concept", href }} />}
    </LArticle>
  );
}

function hubDetailHref(
  hub: LearnerHubDefinition,
  record: LearnerHubRecord,
  query: HubQueryState,
): string | null {
  const detailHub = detailHubForId(record.id);
  if (detailHub !== hub.id) return null;
  const href = record.wordFamily ? record.hubDestination.path : detailCanonicalPath(detailHub, record.id);
  if (!isSafeNavigationPath(href)) return null;
  return appendNavigationContext(
    href,
    buildHubNavigationContext({
      hubId: hub.id,
      ...(query.q.trim().length > 0 ? { q: query.q } : {}),
      ...(query.lesson !== "all"
        ? { lesson: query.lesson }
        : {}),
      ...(query.category && query.category !== "all"
        ? { category: query.category }
        : {}),
      resultId: record.id,
      ...(query.page?{page:query.page}:{}),
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
    <LLi className="tool-drawer">
      <LSpan className="tool-drawer__icon" aria-hidden="true">
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
      </LSpan>
      <LH3 className="tool-drawer__name" id={nameId}>
        <Link
          className="tool-drawer__link"
          href={hub.path}
          aria-label={`Open ${hub.title}`}
        >
          {hub.title}
        </Link>
      </LH3>
      <LP className="tool-drawer__count">{copy.countNoun(count)}</LP>
      <LP className="tool-drawer__benefit">{copy.benefit}</LP>
      {preview.length > 0 ? (
        <LDiv className="tool-drawer__preview">
          <LP className="tool-drawer__preview-label" id={`${nameId}-preview`}>
            {copy.previewLabel}
          </LP>
          <LUl
            className="tool-drawer__preview-list"
            aria-labelledby={`${nameId}-preview`}
          >
            {preview.map((label) => (
              <LLi key={label}>
                {copy.previewLang === "de" ? (
                  <LSpan className="german" lang="de">
                    {label}
                  </LSpan>
                ) : (
                  label
                )}
              </LLi>
            ))}
          </LUl>
        </LDiv>
      ) : (
        <LP className="tool-drawer__preview tool-drawer__preview--empty">
          Nothing here yet — this hub fills up as the course grows.
        </LP>
      )}
      <LSpan className="tool-drawer__arrow" aria-hidden="true">
        →
      </LSpan>
    </LLi>
  );
}

export function HubToolDrawerGrid({
  hubs,
}: {
  hubs: readonly LearnerHubDefinition[];
}) {
  return (
    <LUl className="tool-drawers">
      {hubs.map((hub) => (
        <HubToolDrawer key={hub.id} hub={hub} />
      ))}
    </LUl>
  );
}

export function HubDirectoryView({
  projection,
}: {
  projection: LearnerHubProjection;
}) {
  return (
    <LDiv className="stack browse-shell">
      <LHeader className="page-header">
        <LP className="dense">Learner hubs</LP>
        <LH1>Hubs</LH1>
        <LP className="lede">
          Six content hubs cover everything you are learning. Open a hub to
          browse its items with search and filters.
        </LP>
      </LHeader>

      <LP className="hub-mobile-search">
        <Link
          className="btn btn-secondary hub-mobile-search__link"
          href="/search"
          // No aria-label: "Open global search" replaced the visible words in
          // the accessible name, so "click Search all content" matched nothing
          // by voice (WCAG 2.5.3). The visible text is already descriptive.
        >
          Search all content
        </Link>
      </LP>

      <LSection aria-labelledby="hub-directory-heading">
        <LH2 id="hub-directory-heading">Open a hub</LH2>
        <HubToolDrawerGrid hubs={projection.hubs} />
      </LSection>
    </LDiv>
  );
}

function HubEmptyPublished({ hub }: { hub: LearnerHubDefinition }) {
  return (
    <LDiv className="panel hub-empty" role="status">
      <LH2>Nothing here yet</LH2>
      <LP className="muted">
        {hub.title} has no items yet. New content will appear here as the
        course grows.
      </LP>
    </LDiv>
  );
}

function HubNoMatches({ hub }: { hub: LearnerHubDefinition }) {
  const visibleItemCount = hubVisibleItemCount(hub);
  return (
    <LDiv className="panel hub-empty" role="status">
      <LH2>No matches</LH2>
      <LP className="muted">
        Nothing in {hub.title} matches the current search and filters. Clear
        filters to see all {visibleItemCount} items.
      </LP>
      <LP style={{ marginTop: "1rem" }}>
        <Link className="btn btn-secondary" href={hubClearHref(hub.path)}>
          Clear filters
        </Link>
      </LP>
    </LDiv>
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
    <LArticle className="hub-card hub-card--listening" data-hub-card="listening">
      <LH2 className="hub-card__title">{group.purpose}</LH2>
      <LP className="hub-card__gloss">
        {group.exercise} · {group.lessonLabel}
      </LP>
      <LP className="meta-row hub-card__meta">
        <LSpan className="meta-chip">{durationLabel(totalSeconds)}</LSpan>
        <LSpan className="meta-chip">
          {group.tracks.length} track{group.tracks.length === 1 ? "" : "s"}
        </LSpan>
      </LP>
      <LOl className="workbook-audio__list">
        {group.tracks.map((track) => {
          const media = publicWorkbookTrackForId(track.trackId);
          if (!media) return null;
          return (
            <LLi key={track.id} className="workbook-audio__track">
              <LDiv>
                <LStrong>
                  {track.exercise} · Track {track.trackId.replace("_", ".")}
                </LStrong>
                <LP className="dense">{Math.round(track.durationSeconds)} sec</LP>
              </LDiv>
              {/* Reveal the source transcript when the learner wants to read along. */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                controls
                preload="metadata"
                src={withPagesBaseAssetPath(
                  `/audio/source-workbook-approved-v1/${media.filename}`,
                )}
                aria-label={`${track.exercise}, track ${track.trackId.replace("_", ".")}, ${track.purpose}`}
              />
              <ListeningTranscript transcript={workbookTranscript(track.trackId)} />
            </LLi>
          );
        })}
      </LOl>
      <LP style={{ marginTop: "1rem" }}>
        <Link className="btn btn-primary" href={group.activity.path}>
          {group.activity.label}
        </Link>
      </LP>
    </LArticle>
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
    <LArticle className="hub-card hub-card--concept" data-hub-card="concepts">
      <LH2 className="hub-card__title">{topic.displayLabel}</LH2>
      <LP className="hub-card__gloss">{topic.summary}</LP>
      {topic.hubActions.length > 0 ? (
        <LNav className="concept-map" aria-labelledby={mapId}>
          <LP className="concept-map__label" id={mapId}>
            Where this topic goes
          </LP>
          <LUl className="concept-map__spokes">
            {topic.hubActions.map((action) => (
              <LLi key={`${action.label}:${action.path}`}>
                <Link className="concept-map__spoke" href={action.path}>
                  {action.label}
                </Link>
              </LLi>
            ))}
          </LUl>
        </LNav>
      ) : null}
      <LDiv className="hub-filter-actions">
        {topic.activities.map((activity) => (
          <Link key={activity.activityId} className="btn btn-primary" href={activity.path}>
            {activity.label}
          </Link>
        ))}
      </LDiv>
      <LP className="meta-row hub-card__meta">
        {lessonLabels(topic.lessonIds).map((label) => (
          <LSpan key={label} className="meta-chip">
            {label}
          </LSpan>
        ))}
        <LSpan className="meta-chip">
          {topic.sourceEntityIds.length} connected items
        </LSpan>
      </LP>
    </LArticle>
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
  const {scope,setScope,connected}=useStudyScope();
  const summary = [...hubFilterSummary(query),...(connected&&(scope.mode!=="all"||scope.concepts.length>0||scope.source!=="all")?[scopeLabel(scope)]:[])];
  const searchId = `hub-search-${hub.id}`;
  const lessonId = `hub-lesson-${hub.id}`;
  const categoryId = `hub-category-${hub.id}`;
  // A hub that renders a derived experience filters that experience, not its
  // record list, so its record categories cannot narrow anything a learner can
  // see. Offering them would be a control that does nothing.
  const hasCategories = hub.experience == null && hub.categories.length > 0;

  return (
    <LSection className="panel hub-filters" aria-labelledby="hub-filters-heading">
      <LH2 id="hub-filters-heading" className="sr-only">Filter items</LH2>
      <LForm
        key={JSON.stringify([query.q, query.lesson, query.category])}
        className="hub-filter-form"
        method="get"
        action={withPagesBasePath(hub.path)}
        onSubmit={submitLocalSearch}
      >
        <LDiv className="hub-filter-grid">
          <LLabel className="hub-field" htmlFor={searchId}>
            <LSpan className="hub-field__label">Search</LSpan>
            <LInput
              id={searchId}
              className="hub-input"
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder="German or English"
              autoComplete="off"
              aria-label={`Search ${hub.title}`}
            />
          </LLabel>
          <LLabel className="hub-field" htmlFor={lessonId}>
            <LSpan className="hub-field__label">Lesson</LSpan>
            <LSelect
              id={lessonId}
              className="hub-input"
              name={connected?undefined:"lesson"}
              {...(connected?{value:scope.mode==="all"?"all":scope.mode==="one"?String(scope.lessons[0]).padStart(2,"0"):"selection"}:{defaultValue:query.lesson})}
              onChange={e=>{if(connected)setScope({...scope,mode:e.target.value==="all"?"all":"one",lessons:e.target.value==="all"?[]:[Number(e.target.value)]});}}
              aria-label={`Filter ${hub.title} by lesson`}
            >
              <LOption value="all">All</LOption>
              {connected&&["multiple","through"].includes(scope.mode)&&<LOption value="selection">{scopeLabel(scope)}</LOption>}
              {availableLessons().map(n=><LOption value={String(n).padStart(2,"0")} key={n}>Lesson {n}</LOption>)}
            </LSelect>
          </LLabel>
          {hasCategories ? (
            <LLabel className="hub-field" htmlFor={categoryId}>
              <LSpan className="hub-field__label">Category</LSpan>
              <LSelect
                id={categoryId}
                className="hub-input"
                name="category"
                defaultValue={query.category ?? "all"}
                aria-label={`Filter ${hub.title} by category`}
              >
                <LOption value="all">All</LOption>
                {hub.categories.map((category) => (
                  <LOption key={category} value={category}>
                    {category}
                  </LOption>
                ))}
              </LSelect>
            </LLabel>
          ) : null}
        </LDiv>
        <LDiv className="hub-filter-actions">
          <LButton className="btn btn-primary" type="submit">
            Apply filters
          </LButton>
          <Link className="btn btn-secondary" href={hubClearHref(hub.path)} onClick={()=>setScope(defaultStudyScope())}>
            Clear filters
          </Link>
        </LDiv>
      </LForm>
      {summary.length > 0 ? (
        <LP className="dense hub-filter-summary" aria-live="polite">
          Active filters: {summary.join(" · ")}
        </LP>
      ) : (
        <LP className="dense hub-filter-summary">No active filters</LP>
      )}
    </LSection>
  );
}

export function HubListView({
  hub,
  searchParams,
  units=[],speech={},
}: {
  hub: LearnerHubDefinition;
  searchParams: Record<string, string | string[] | undefined>;
  units?:StudyUnit[];speech?:Record<string,string>;
}) {
  const scope=useStudyScope();
  const query = parseHubSearchParams(searchParams, hub.categories);
  const selectedItems=hub.items.filter(item=>scope.matches(hubStudyTags(item)));
  const filtered = filterHubRecords(selectedItems, query);
  const extraEntries=coursePatternEntries(units,hub.id,query.q).filter(entry=>scope.matches(coursePatternTags(entry))&&(query.lesson==="all"||entry.lesson===Number(query.lesson))&&query.category===null);
  const extraCount=extraEntries.length;
  const visibleItemCount = hubVisibleItemCount(hub)+coursePatternEntries(units,hub.id).length;
  const listeningGroups =
    hub.experience?.kind === "listening"
      ? filterListeningGroups(hub.experience, query).filter(group=>scope.matches(tagsForLesson(numericLessons([group.lessonId])[0]??1)))
      : null;
  const conceptTopics =
    hub.experience?.kind === "concepts"
      ? filterConceptTopics(hub.experience, query).filter(topic=>scope.matches({lessons:numericLessons(topic.lessonIds),concepts:["grammar","conversation"],source:"course"}))
      : null;
  const baseResultCount = listeningGroups
    ? listeningGroups.reduce((sum, group) => sum + group.tracks.length, 0)
    : conceptTopics
      ? conceptTopics.length
      : filtered.items.length;
  const visibleResultCount=baseResultCount+extraCount;
  const showAfterFilters = visibleItemCount > 0 && filtered.hasActiveFilters;
  const pageSize=12;
  const pageCount=Math.max(1,Math.ceil(visibleResultCount/pageSize));
  const page=Math.min(query.page??1,pageCount);
  const pagedQuery={...query,page};
  const start=(page-1)*pageSize;
  const records=filtered.items.slice(start,start+pageSize);
  const patterns=extraEntries.slice(Math.max(0,start-filtered.items.length),Math.max(0,start+pageSize-filtered.items.length));
  const pageHref=(target:number)=>{
    const params=new URLSearchParams();
    if(query.q)params.set("q",query.q);
    if(query.lesson!=="all")params.set("lesson",query.lesson);
    if(query.category)params.set("category",query.category);
    if(target>1)params.set("page",String(target));
    return `${hub.path}${params.size?`?${params}`:""}#hub-results-heading`;
  };

  return (
    <LDiv className="stack">
      <LHeader className="page-header">
        <LP className="dense">Study library · Lessons 1–12</LP>
        <LH1>{hub.id==="concepts"?"Grammar connections":hub.title}</LH1>
        <LP className="lede">{units.length?`Find ${hub.id==="verbs"?"verb forms":hub.id==="phrases"?"useful phrases":"grammar patterns"} from your lessons. Listen, save what matters, and practise in context.`:hub.description}</LP>
        <LP className="meta-row" style={{ marginTop: "0.5rem" }}>
          <LSpan className="meta-chip">{visibleItemCount} items</LSpan>
          <LSpan className="meta-chip">
            {visibleResultCount} matches
            {showAfterFilters ? " after filters" : ""}
          </LSpan>
        </LP>
        {hub.id === "vocabulary" ? (
          <LP style={{ marginTop: "1rem" }}>
            <Link className="btn btn-secondary" href="/collections/professions">
              Explore professions and their forms →
            </Link>
          </LP>
        ) : null}
      </LHeader>

      <HubFilters hub={hub} query={query} />
      {units.length>0&&query.category!==null&&<LP className="muted">Topic categories apply to the original guided lessons. Choose All categories to include the later lesson patterns.</LP>}
      {hub.id==="grammar"&&<LP><Link href="/concepts">See how grammar connects to examples and practice →</Link></LP>}
      {hub.id==="concepts"&&<><LP><Link href="/grammar">Browse the grammar library →</Link></LP><GrammarConnections entries={extraEntries} speech={speech} navigation={buildHubNavigationContext({hubId:hub.id,q:query.q,lesson:query.lesson,...(query.category?{category:query.category}:{})})}/></>}

      {visibleItemCount === 0 ? (
        <HubEmptyPublished hub={hub} />
      ) : visibleResultCount === 0 ? (
        <HubNoMatches hub={hub} />
      ) : listeningGroups ? (
        <LSection aria-labelledby="hub-results-heading">
          <LH2 id="hub-results-heading" className="dense">
            Workbook exercises
          </LH2>
          <LDiv className="card-grid hub-results">
            {listeningGroups.map((group) => (
              <ListeningGroupCard key={group.id} group={group} />
            ))}
          </LDiv>
        </LSection>
      ) : conceptTopics ? (conceptTopics.length>0&&
        <LSection aria-labelledby="hub-results-heading">
          <LH2 id="hub-results-heading" className="dense">
            Connected learning paths
          </LH2>
          <LDiv className="card-grid hub-results">
            {conceptTopics.map((topic) => (
              <ConceptTopicCard key={topic.id} topic={topic} />
            ))}
          </LDiv>
        </LSection>
      ) : (
        <LSection aria-labelledby="hub-results-heading">
          <LH2 id="hub-results-heading" className="dense">
            Results
          </LH2>
          <LDiv className="card-grid hub-results">
            {records.map((record) => (
              <HubRecordCard
                key={record.id}
                hub={hub}
                record={record}
                query={pagedQuery}
              />
            ))}
            {patterns.map(entry=><CoursePatternCard key={entry.key} entry={entry} speech={speech} compact navigation={buildHubNavigationContext({hubId:hub.id,q:query.q,lesson:query.lesson,...(query.category?{category:query.category}:{}),page})}/>)}
          </LDiv>
        </LSection>
      )}
      {!listeningGroups&&!conceptTopics&&visibleResultCount>0&&<LNav className="library-pagination" aria-label={`${hub.title} results pages`}><LP role="status">Showing {start+1}–{Math.min(start+pageSize,visibleResultCount)} of {visibleResultCount} · Page {page} of {pageCount}</LP><LDiv className="study-row">{page>1&&<Link className="study-secondary" href={pageHref(page-1)}>← Previous page</Link>}{page<pageCount&&<Link className="study-primary" href={pageHref(page+1)}>Next page →</Link>}</LDiv></LNav>}
    </LDiv>
  );
}
