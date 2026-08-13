import type {
  LearnerDetailRecord,
  LearnerGrammarDetail,
  LearnerQaDetail,
  LearnerVerbDetail,
  LearnerVocabularyDetail,
} from "@/lib/content/detail-types";
import {
  lessonMembershipLabel,
  sourcePriorityLabel,
} from "@/lib/content/search-query";
import type { NavigationContext } from "@/lib/content/navigation-context";
import { resolveBackHref } from "@/lib/content/navigation-context";
import { PronunciationControl } from "@/components/audio/PronunciationControl";
import { BackLink } from "@/components/nav/BackLink";
import { GenderBadge } from "@/components/details/GenderBadge";
import { VerbSelfCheck } from "@/components/details/VerbSelfCheck";
import { QaConstruction, QaGuidedChoice } from "@/components/details/QaPractice";
import { PractiseLink } from "@/components/games/PractiseLink";
import { ConversationLink } from "@/components/conversation/ConversationLink";
import {
  CONVERSATION_LEVEL_IDS,
  buildConversationLevelCatalog,
} from "@/lib/conversation";
import { conversationCanonicalPath } from "@/lib/conversation";
import Link from "next/link";
import {
  appendNavigationContext,
  buildDetailPracticeNavigationContext,
} from "@/lib/content/navigation-context";
import { DetailLearningControls } from "@/components/learner-state/DetailLearningControls";
import { detailCanonicalPath } from "@/lib/content/detail-types";
import { infographicForDetail } from "@/lib/content/infographics";
import { InfographicPanel } from "@/components/media/InfographicPanel";
import { RichLessonVisual } from "@/components/media/RichLessonVisual";
import { illustrationForDetail } from "@/lib/content/illustrations";
import { RapidProfessionMorphologySection } from "@/components/content/rapid-learning-sections";

function MetaChips({
  lessonIds,
  sourcePriority,
  extra,
}: {
  lessonIds: readonly string[];
  sourcePriority: 1 | 2 | 3 | 4 | null;
  extra?: string;
}) {
  return (
    <div className="meta-row">
      <span className="meta-chip">{lessonMembershipLabel(lessonIds)}</span>
      <span className="meta-chip">{sourcePriorityLabel(sourcePriority)}</span>
      {extra ? <span className="meta-chip">{extra}</span> : null}
    </div>
  );
}

function VocabularyDetail({ detail }: { detail: LearnerVocabularyDetail }) {
  const pf = detail.personForm;
  const illustration = illustrationForDetail(detail.id);
  return (
    <div className="stack detail-page detail-page--vocabulary">
      <header className="page-header">
        <p className="dense">Vocabulary detail</p>
        <h1>
          <span className="german" lang="de">
            {detail.displayText}
          </span>
        </h1>
        <p className="lede">{detail.meaningEn}</p>
        <MetaChips
          lessonIds={detail.lessonIds}
          sourcePriority={detail.sourcePriority}
          extra="Published"
        />
      </header>

      {illustration ? <RichLessonVisual illustration={illustration} /> : null}
      {pf ? <RapidProfessionMorphologySection /> : null}

      <section className="panel" aria-labelledby="vocab-forms-heading">
        <h2 id="vocab-forms-heading">Forms</h2>
        <div className="detail-form-pair">
          <article className="detail-form-card" data-person-form={detail.gender ?? "none"}>
            {detail.gender ? <GenderBadge gender={detail.gender} /> : null}
            <p className="detail-form-card__lemma">
              <span className="german" lang="de">
                {detail.article ? `${detail.article} ` : ""}
                {detail.lemma}
              </span>
            </p>
            <p className="dense">
              {detail.article ? "Singular (published)" : "Published form"}
            </p>
          </article>
          {pf ? (
            <article className="detail-form-card" data-person-form="feminine">
              <GenderBadge gender={pf.relatedGender} />
              <p className="detail-form-card__lemma">
                <span className="german" lang="de">{pf.relatedDisplayText}</span>
              </p>
              <p className="dense">Linked person-form (published)</p>
            </article>
          ) : null}
        </div>
        {!detail.article || !detail.gender ? (
          <p className="placeholder-banner" role="status">
            Article and noun gender are not published for this item.
          </p>
        ) : null}
      </section>

      {pf ? (
        <section className="panel" aria-labelledby="vocab-morph-heading">
          <h2 id="vocab-morph-heading">Person-form operation</h2>
          <p className="muted">
            Sourced from the published person-form pair — not invented morphology.
          </p>
          <div
            className="person-form-infographic"
            role="img"
            aria-label={`Shared stem ${pf.sharedStem} plus feminine suffix -${pf.feminineSuffix} yields ${pf.relatedLemma}`}
          >
            <span className="morph-token morph-token--stem" lang="de">
              {pf.sharedStem}
            </span>
            <span className="morph-token morph-token--op" aria-hidden="true">
              +
            </span>
            <span className="morph-token morph-token--suffix" lang="de">
              -{pf.feminineSuffix}
            </span>
            <span className="morph-token morph-token--op" aria-hidden="true">
              →
            </span>
            <span className="morph-token morph-token--result german" lang="de">
              {pf.relatedLemma}
            </span>
          </div>
          <p className="dense">{pf.operationLabel}</p>
        </section>
      ) : (
        <section className="panel" aria-labelledby="vocab-morph-heading">
          <h2 id="vocab-morph-heading">Related person form</h2>
          <p className="placeholder-banner" role="status">
            No published person-form relation is available for this item.
          </p>
        </section>
      )}

      <section className="panel" aria-labelledby="vocab-plural-heading">
        <h2 id="vocab-plural-heading">Plural</h2>
        {detail.plurals.length > 0 ? (
          <ul>
            {detail.plurals.map((plural) => (
              <li key={plural}>
                <span className="german" lang="de">
                  {plural}
                </span>
              </li>
            ))}
          </ul>
        ) : detail.pluralGapMessage ? (
          <p className="placeholder-banner" role="status">
            {detail.pluralGapMessage}
          </p>
        ) : (
          <p className="placeholder-banner" role="status">
            Plural does not apply to this published item.
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="vocab-audio-heading">
        <h2 id="vocab-audio-heading">Pronunciation</h2>
        <PronunciationControl media={detail.media} label={detail.displayText} />
      </section>

      <div className="detail-actions">
        <PractiseLink detail={detail} />
      </div>
      <DetailLearningControls contentId={detail.id} />
    </div>
  );
}

function VerbDetail({ detail }: { detail: LearnerVerbDetail }) {
  const infographic = infographicForDetail(detail.id);
  return (
    <div className="stack detail-page detail-page--verb">
      <header className="page-header">
        <p className="dense">Verb detail</p>
        <h1>
          <span className="german" lang="de">
            {detail.infinitive}
          </span>
        </h1>
        <p className="lede">{detail.meaningEn}</p>
        <MetaChips
          lessonIds={detail.lessonIds}
          sourcePriority={detail.sourcePriority}
          extra="Published"
        />
      </header>

      {infographic ? <InfographicPanel infographic={infographic} /> : null}

      <section className="panel" aria-labelledby="verb-paradigm-heading">
        <h2 id="verb-paradigm-heading">Present paradigm</h2>
        <table className="verb-paradigm">
          <caption className="dense">
            {detail.present.length} published present forms
          </caption>
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Form</th>
            </tr>
          </thead>
          <tbody>
            {detail.present.map((row) => (
              <tr key={row.person} data-person={row.person}>
                <th scope="row">
                  <span className="german" lang="de">
                    {row.personLabel}
                  </span>
                </th>
                <td>
                  <span
                    className={`german morph-token ${detail.id === "verb:sein" ? "morph-token--irr" : "morph-token--stem"}`}
                    lang="de"
                    data-morph={detail.id === "verb:sein" ? "IRR" : "FORM"}
                  >
                    {row.form}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="verb-legend" role="note">
          <span
            className={
              detail.id === "verb:sein"
                ? "morph-token morph-token--irr"
                : "morph-token morph-token--stem"
            }
            data-morph={detail.id === "verb:sein" ? "IRR" : "FORM"}
          >
            {detail.id === "verb:sein" ? "IRR" : "FORM"}
          </span>
          <p className="dense">{detail.paradigmNote}</p>
        </div>
      </section>

      <section className="panel" aria-labelledby="verb-audio-heading">
        <h2 id="verb-audio-heading">Pronunciation</h2>
        <PronunciationControl media={detail.media} label={detail.infinitive} />
      </section>

      {detail.present.length > 0 ? (
        <VerbSelfCheck detail={detail} />
      ) : (
        <p className="placeholder-banner" role="status">
          No published present forms are available for self-check.
        </p>
      )}

      <div className="detail-actions">
        <PractiseLink detail={detail} />
      </div>
      <DetailLearningControls contentId={detail.id} />
    </div>
  );
}

function QaDetail({ detail }: { detail: LearnerQaDetail }) {
  const infographic = infographicForDetail(detail.id);
  return (
    <div className="stack detail-page detail-page--qa">
      <header className="page-header">
        <p className="dense">Phrases &amp; Q&amp;A detail</p>
        <h1>
          <span className="german" lang="de">
            {detail.question.realization}
          </span>
        </h1>
        <p className="lede">
          {detail.register[0]!.toUpperCase()}
          {detail.register.slice(1)} register · published patterns only
        </p>
        <MetaChips
          lessonIds={detail.lessonIds}
          sourcePriority={detail.sourcePriority}
          extra={detail.register[0]!.toUpperCase() + detail.register.slice(1)}
        />
      </header>

      {infographic ? <InfographicPanel infographic={infographic} /> : null}

      <section className="panel qa-dialogue" aria-labelledby="qa-model-heading">
        <h2 id="qa-model-heading">Model</h2>
        <div className="qa-bubble qa-bubble--question">
          <p className="dense">Question</p>
          <p className="german" lang="de">
            {detail.question.realization}
          </p>
        </div>
        <ul className="qa-answer-list">
          {detail.answers.map((answer) => (
            <li key={answer.id} className="qa-bubble qa-bubble--answer">
              <p className="dense">Answer pattern</p>
              <p className="german" lang="de">
                {answer.realization}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <QaGuidedChoice detail={detail} />
      <QaConstruction detail={detail} />

      <section className="panel" aria-labelledby="qa-progress-heading">
        <h2 id="qa-progress-heading">Conversation progression</h2>
        {detail.conversationLevels.length > 0 ? (
          <>
            <p className="muted">
              Exact five-level ladder (in-session). Open conversation practice
              for the full recorder lifecycle.
            </p>
            <ol className="qa-levels">
              {buildConversationLevelCatalog().map((level) => (
                <li
                  key={level.id}
                  className="qa-level"
                  data-status="available"
                  data-level-id={level.id}
                >
                  <strong>
                    {level.index + 1}. {level.label}
                  </strong>
                  <span className="meta-chip">Available</span>
                  <p className="dense">{level.description}</p>
                </li>
              ))}
            </ol>
            <span
              hidden
              data-level-order={CONVERSATION_LEVEL_IDS.join(",")}
            >
              {CONVERSATION_LEVEL_IDS.join(",")}
            </span>
          </>
        ) : (
          <p className="placeholder-banner" role="status">
            Conversation ladder is not published for this Q&amp;A yet.
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="qa-audio-heading">
        <h2 id="qa-audio-heading">Question pronunciation</h2>
        <PronunciationControl
          media={detail.media}
          label={detail.question.realization}
        />
      </section>

      <section className="panel" aria-labelledby="qa-recorder-heading">
        <h2 id="qa-recorder-heading">Speaking</h2>
        {detail.id === "qa:profession-casual-main" ? (
          <>
            <p className="dense" role="status">
              Spoken role-play lives in conversation practice. Recording stays
              local and never claims pronunciation accuracy.
            </p>
            {(() => {
              const nav = buildDetailPracticeNavigationContext({
                hubId: detail.hubSegment,
                detailPath: detail.canonicalPath,
                resultId: detail.id,
              });
              const href = nav
                ? appendNavigationContext(conversationCanonicalPath(), nav)
                : conversationCanonicalPath();
              return (
                <Link
                  className="btn btn-secondary"
                  href={href}
                  data-conversation-spoken-link="true"
                >
                  Open spoken role-play
                </Link>
              );
            })()}
          </>
        ) : (
          <p className="placeholder-banner" role="status">
            Speaking practice is not published for this Q&amp;A yet.
          </p>
        )}
      </section>

      <div className="detail-actions">
        <ConversationLink detail={detail} />
        <PractiseLink detail={detail} />
      </div>
      <DetailLearningControls contentId={detail.id} />
    </div>
  );
}

function GrammarDetail({ detail }: { detail: LearnerGrammarDetail }) {
  return (
    <div className="stack detail-page detail-page--grammar">
      <header className="page-header">
        <p className="dense">Grammar explorer</p>
        <h1><span className="german" lang="de">{detail.titleDe}</span></h1>
        <p className="lede">{detail.titleEn}</p>
        <MetaChips
          lessonIds={detail.lessonIds}
          sourcePriority={detail.sourcePriority}
          extra="Published"
        />
      </header>

      <section className="panel grammar-notice" aria-labelledby="grammar-notice-heading">
        <h2 id="grammar-notice-heading">What to notice</h2>
        <p>{detail.notice}</p>
      </section>

      <section className="panel" aria-labelledby="grammar-rules-heading">
        <h2 id="grammar-rules-heading">Rule and model</h2>
        <ol className="grammar-rule-list">
          {detail.ruleSteps.map((step) => (
            <li key={step.id} className="grammar-rule-card">
              <p>{step.notice}</p>
              {step.model ? (
                <p className="grammar-model german" lang="de">{step.model}</p>
              ) : (
                <p className="placeholder-banner" role="status">
                  No model sentence is published for this rule step.
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="panel" aria-labelledby="grammar-links-heading">
        <h2 id="grammar-links-heading">Learning path</h2>
        {detail.prerequisiteLabels.length > 0 ? (
          <div>
            <h3>Review first</h3>
            <ul>
              {detail.prerequisiteIds.map((id, index) => (
                <li key={id}>
                  <Link href={detailCanonicalPath("grammar", id)}>
                    <span className="german" lang="de">{detail.prerequisiteLabels[index]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="dense">No prerequisite is required.</p>}
        <p className="dense">
          {detail.activityIds.length} linked published {detail.activityIds.length === 1 ? "activity" : "activities"}
        </p>
        <div className="detail-actions">
          {detail.lessonIds.map((lessonId) => {
            const segment = lessonId.includes(":") ? lessonId.slice(lessonId.indexOf(":") + 1) : lessonId;
            return <Link key={lessonId} className="btn btn-secondary" href={`/lessons/${segment}`}>Open Lesson {segment}</Link>;
          })}
        </div>
      </section>

      <section className="panel" aria-labelledby="grammar-errors-heading">
        <h2 id="grammar-errors-heading">Common errors to watch</h2>
        {detail.commonErrorTags.length > 0 ? (
          <ul className="tag-list">
            {detail.commonErrorTags.map((tag) => <li key={tag}><span className="meta-chip">{tag.replaceAll("-", " ")}</span></li>)}
          </ul>
        ) : <p className="dense">No common-error tags are published.</p>}
      </section>

      <DetailLearningControls contentId={detail.id} />
    </div>
  );
}

export function DetailView({
  detail,
  navigation = null,
}: {
  detail: LearnerDetailRecord;
  navigation?: NavigationContext | null;
}) {
  const backHref = resolveBackHref(
    navigation,
    detail.hubSegment === "vocabulary" ||
      detail.hubSegment === "verbs" ||
      detail.hubSegment === "phrases"
      ? "hub"
      : "hub",
  );

  return (
    <div className="stack">
      <BackLink href={backHref} />
      {detail.kind === "Lexeme" ? <VocabularyDetail detail={detail} /> : null}
      {detail.kind === "Verb" ? <VerbDetail detail={detail} /> : null}
      {detail.kind === "QAPair" ? <QaDetail detail={detail} /> : null}
      {detail.kind === "GrammarConcept" ? <GrammarDetail detail={detail} /> : null}
    </div>
  );
}
