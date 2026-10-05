
import { LArticle, LCaption, LDiv, LFigcaption, LFigure, LH1, LH2, LH3, LHeader, LLi, LOl, LP, LSection, LSpan, LStrong, LTable, LTbody, LTd, LTh, LThead, LTr, LUl } from "@/components/i18n/LocalizedElements";
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
import Link from "@/components/i18n/LocalizedLink";
import {
  appendNavigationContext,
  buildDetailPracticeNavigationContext,
} from "@/lib/content/navigation-context";
import { DetailLearningControls } from "@/components/learner-state/DetailLearningControls";
import { detailCanonicalPath } from "@/lib/content/detail-types";
import { lessonLabel } from "@/lib/content/lesson-label";
import { infographicForDetail } from "@/lib/content/infographics";
import { InfographicPanel } from "@/components/media/InfographicPanel";
import { RichLessonVisual } from "@/components/media/RichLessonVisual";
import { illustrationForDetail } from "@/lib/content/illustrations";
import { MeaningPlate } from "@/components/media/MeaningPlate";
import {
  GrammarConceptVisual,
  NounSystemVisual,
  QuestionAnswerFlowVisual,
  VerbPatternVisual,
} from "@/components/media/InstructionalVisuals";

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
    <LDiv className="meta-row">
      <LSpan className="meta-chip">{lessonMembershipLabel(lessonIds)}</LSpan>
      <LSpan className="meta-chip">{sourcePriorityLabel(sourcePriority)}</LSpan>
      {extra ? <LSpan className="meta-chip">{extra}</LSpan> : null}
    </LDiv>
  );
}

/**
 * Details upgrade individually (chosen-direction-contract.yaml): a vocabulary
 * page shows its approved illustration when one exists and the permanent
 * meaning plate — same 4:3 reserved geometry — when one does not. The plate is
 * the media treatment only; the teaching sections below stay authoritative.
 */
function VocabularyMediaSlot({ detail }: { detail: LearnerVocabularyDetail }) {
  const illustration = illustrationForDetail(detail.id);
  if (illustration) return <RichLessonVisual illustration={illustration} />;
  const plural = detail.plurals[0] ?? null;
  return (
    <MeaningPlate
      variant="detail"
      lemma={detail.lemma}
      article={detail.article}
      gloss={detail.meaningEn}
      gender={detail.gender}
      morphologyLabel={plural ? "Plural" : null}
      morphology={plural ? `die ${plural}` : null}
      audio={
        detail.media.state === "preview"
          ? {
              publicPath: detail.media.publicPath,
              spokenText: detail.media.spokenText,
            }
          : null
      }
    />
  );
}

function VocabularyDetail({ detail }: { detail: LearnerVocabularyDetail }) {
  const pf = detail.personForm;
  return (
    <LDiv className="stack detail-page detail-page--vocabulary">
      <LHeader className="page-header">
        <LP className="dense">Vocabulary detail</LP>
        <LH1>
          <LSpan className="german" lang="de">
            {detail.displayText}
          </LSpan>
        </LH1>
        <LP className="lede">{detail.meaningEn}</LP>
        <MetaChips
          lessonIds={detail.lessonIds}
          sourcePriority={detail.sourcePriority}
        />
      </LHeader>

      <VocabularyMediaSlot detail={detail} />
      <NounSystemVisual detail={detail} />

      {/* Rendered only when there is a sentence to show. Where there is none,
          the section is absent entirely — an empty "Example" heading would
          teach the learner nothing and imply a gap in the app rather than in
          the book.

          The line under the sentence is the whole point of the slot: it either
          names the book and page a learner can look up, or says in plain words
          that we wrote the sentence and a German speaker has not checked it.
          Which line appears is decided by the example's own origin, and
          `data-example-origin` carries that decision into the markup so the
          two never look alike by accident. */}
      {detail.example ? (
        <LSection
          className="panel"
          aria-labelledby="vocab-example-heading"
          data-example-origin={detail.example.origin}
        >
          <LH2 id="vocab-example-heading">Example</LH2>
          <LFigure className="vocab-example">
            <LP className="vocab-example__de german" lang="de">
              {detail.example.de}
            </LP>
            <LFigcaption className="vocab-example__en">
              {detail.example.en}
            </LFigcaption>
          </LFigure>
          <LP className="dense vocab-example__provenance">
            {detail.example.provenanceLabel}
          </LP>
        </LSection>
      ) : null}

      <LSection className="panel" aria-labelledby="vocab-forms-heading">
        <LH2 id="vocab-forms-heading">Forms</LH2>
        <LDiv className="detail-form-pair">
          <LArticle className="detail-form-card" data-person-form={detail.gender ?? "none"}>
            {detail.gender ? <GenderBadge gender={detail.gender} /> : null}
            <LP className="detail-form-card__lemma">
              <LSpan className="german" lang="de">
                {detail.article ? `${detail.article} ` : ""}
                {detail.lemma}
              </LSpan>
            </LP>
            <LP className="dense">
              {detail.article ? "Singular" : "Base form"}
            </LP>
          </LArticle>
          {pf ? (
            <LArticle className="detail-form-card" data-person-form="feminine">
              <GenderBadge gender={pf.relatedGender} />
              <LP className="detail-form-card__lemma">
                <LSpan className="german" lang="de">{pf.relatedDisplayText}</LSpan>
              </LP>
              <LP className="dense">Linked person form</LP>
            </LArticle>
          ) : null}
        </LDiv>
        {!detail.article || !detail.gender ? (
          <LP className="placeholder-banner" role="status">
            This item does not carry an article or noun gender.
          </LP>
        ) : null}
      </LSection>

      {pf ? (
        <LSection className="panel" aria-labelledby="vocab-morph-heading">
          <LH2 id="vocab-morph-heading">Person-form operation</LH2>
          <LP className="muted">
            The masculine and feminine forms belong together — learn them as a
            pair.
          </LP>
          <LDiv
            className="person-form-infographic"
            role="img"
            aria-label={`Shared stem ${pf.sharedStem} plus feminine suffix -${pf.feminineSuffix} yields ${pf.relatedLemma}`}
          >
            <LSpan className="morph-token morph-token--stem" lang="de">
              {pf.sharedStem}
            </LSpan>
            <LSpan className="morph-token morph-token--op" aria-hidden="true">
              +
            </LSpan>
            <LSpan className="morph-token morph-token--suffix" lang="de">
              -{pf.feminineSuffix}
            </LSpan>
            <LSpan className="morph-token morph-token--op" aria-hidden="true">
              →
            </LSpan>
            <LSpan className="morph-token morph-token--result german" lang="de">
              {pf.relatedLemma}
            </LSpan>
          </LDiv>
          <LP className="dense">{pf.operationLabel}</LP>
        </LSection>
      ) : (
        <LSection className="panel" aria-labelledby="vocab-morph-heading">
          <LH2 id="vocab-morph-heading">Related person form</LH2>
          <LP className="placeholder-banner" role="status">
            This item has no related person form.
          </LP>
        </LSection>
      )}

      <LSection className="panel" aria-labelledby="vocab-plural-heading">
        <LH2 id="vocab-plural-heading">Plural</LH2>
        {detail.plurals.length > 0 ? (
          <LUl>
            {detail.plurals.map((plural) => (
              <LLi key={plural}>
                <LSpan className="german" lang="de">
                  {plural}
                </LSpan>
              </LLi>
            ))}
          </LUl>
        ) : detail.pluralGapMessage ? (
          <LP className="placeholder-banner" role="status">
            {detail.pluralGapMessage}
          </LP>
        ) : (
          <LP className="placeholder-banner" role="status">
            Plural does not apply to this item.
          </LP>
        )}
      </LSection>

      <LSection className="panel" aria-labelledby="vocab-audio-heading">
        <LH2 id="vocab-audio-heading">Pronunciation</LH2>
        <PronunciationControl media={detail.media} label={detail.displayText} />
      </LSection>

      <LDiv className="detail-actions">
        <PractiseLink detail={detail} />
      </LDiv>
      <DetailLearningControls key={detail.id} contentId={detail.id} />
    </LDiv>
  );
}

function VerbDetail({ detail }: { detail: LearnerVerbDetail }) {
  const infographic = infographicForDetail(detail.id);
  return (
    <LDiv className="stack detail-page detail-page--verb">
      <LHeader className="page-header">
        <LP className="dense">Verb detail</LP>
        <LH1>
          <LSpan className="german" lang="de">
            {detail.infinitive}
          </LSpan>
        </LH1>
        <LP className="lede">{detail.meaningEn}</LP>
        <MetaChips
          lessonIds={detail.lessonIds}
          sourcePriority={detail.sourcePriority}
        />
      </LHeader>

      {infographic ? <InfographicPanel infographic={infographic} /> : null}
      <VerbPatternVisual detail={detail} />

      <LSection className="panel" aria-labelledby="verb-paradigm-heading">
        <LH2 id="verb-paradigm-heading">Present paradigm</LH2>
        <LTable className="verb-paradigm">
          <LCaption className="dense">
            {detail.present.length} present forms
          </LCaption>
          <LThead>
            <LTr>
              <LTh scope="col">Person</LTh>
              <LTh scope="col">Form</LTh>
            </LTr>
          </LThead>
          <LTbody>
            {detail.present.map((row) => (
              <LTr key={row.person} data-person={row.person}>
                <LTh scope="row">
                  <LSpan className="german" lang="de">
                    {row.personLabel}
                  </LSpan>
                </LTh>
                <LTd>
                  <LSpan
                    className={`german morph-token ${detail.id === "verb:sein" ? "morph-token--irr" : "morph-token--stem"}`}
                    lang="de"
                    data-morph={detail.id === "verb:sein" ? "IRR" : "FORM"}
                  >
                    {row.form}
                  </LSpan>
                </LTd>
              </LTr>
            ))}
          </LTbody>
        </LTable>
        <LDiv className="verb-legend" role="note">
          <LSpan
            className={
              detail.id === "verb:sein"
                ? "morph-token morph-token--irr"
                : "morph-token morph-token--stem"
            }
            data-morph={detail.id === "verb:sein" ? "IRR" : "FORM"}
          >
            {detail.id === "verb:sein" ? "IRR" : "FORM"}
          </LSpan>
          <LP className="dense">{detail.paradigmNote}</LP>
        </LDiv>
      </LSection>

      <LSection className="panel" aria-labelledby="verb-audio-heading">
        <LH2 id="verb-audio-heading">Pronunciation</LH2>
        <PronunciationControl media={detail.media} label={detail.infinitive} />
      </LSection>

      {detail.present.length > 0 ? (
        <VerbSelfCheck detail={detail} />
      ) : (
        <LP className="placeholder-banner" role="status">
          This verb has no present forms to self-check yet.
        </LP>
      )}

      <LDiv className="detail-actions">
        <PractiseLink detail={detail} />
      </LDiv>
      <DetailLearningControls key={detail.id} contentId={detail.id} />
    </LDiv>
  );
}

function QaDetail({ detail }: { detail: LearnerQaDetail }) {
  const infographic = infographicForDetail(detail.id);
  return (
    <LDiv className="stack detail-page detail-page--qa">
      <LHeader className="page-header">
        <LP className="dense">Phrases &amp; Q&amp;A detail</LP>
        <LH1>
          <LSpan className="german" lang="de">
            {detail.question.realization}
          </LSpan>
        </LH1>
        <LP className="lede">
          {detail.register[0]!.toUpperCase()}
          {detail.register.slice(1)} register
        </LP>
        <MetaChips
          lessonIds={detail.lessonIds}
          sourcePriority={detail.sourcePriority}
          extra={detail.register[0]!.toUpperCase() + detail.register.slice(1)}
        />
      </LHeader>

      {infographic ? <InfographicPanel infographic={infographic} /> : null}
      <QuestionAnswerFlowVisual detail={detail} />

      <LSection className="panel qa-dialogue" aria-labelledby="qa-model-heading">
        <LH2 id="qa-model-heading">Model</LH2>
        <LDiv className="qa-bubble qa-bubble--question">
          <LP className="dense">Question</LP>
          <LP className="german" lang="de">
            {detail.question.realization}
          </LP>
        </LDiv>
        <LUl className="qa-answer-list">
          {detail.answers.map((answer) => (
            <LLi key={answer.id} className="qa-bubble qa-bubble--answer">
              <LP className="dense">Answer pattern</LP>
              <LP className="german" lang="de">
                {answer.realization}
              </LP>
            </LLi>
          ))}
        </LUl>
      </LSection>

      <QaGuidedChoice detail={detail} />
      <QaConstruction detail={detail} />

      <LSection className="panel" aria-labelledby="qa-progress-heading">
        <LH2 id="qa-progress-heading">Conversation progression</LH2>
        {detail.conversationLevels.length > 0 ? (
          <>
            <LP className="muted">
              Exact five-level ladder (in-session). Open conversation practice
              for the full recorder lifecycle.
            </LP>
            <LOl className="qa-levels">
              {buildConversationLevelCatalog().map((level) => (
                <LLi
                  key={level.id}
                  className="qa-level"
                  data-status="available"
                  data-level-id={level.id}
                >
                  <LStrong>
                    {level.index + 1}. {level.label}
                  </LStrong>
                  <LSpan className="meta-chip">Available</LSpan>
                  <LP className="dense">{level.description}</LP>
                </LLi>
              ))}
            </LOl>
            <LSpan
              hidden
              data-level-order={CONVERSATION_LEVEL_IDS.join(",")}
            >
              {CONVERSATION_LEVEL_IDS.join(",")}
            </LSpan>
          </>
        ) : (
          <LP className="placeholder-banner" role="status">
            Conversation practice is not available for this Q&amp;A yet.
          </LP>
        )}
      </LSection>

      <LSection className="panel" aria-labelledby="qa-audio-heading">
        <LH2 id="qa-audio-heading">Question pronunciation</LH2>
        <PronunciationControl
          media={detail.media}
          label={detail.question.realization}
        />
      </LSection>

      <LSection className="panel" aria-labelledby="qa-recorder-heading">
        <LH2 id="qa-recorder-heading">Speaking</LH2>
        {detail.id === "qa:profession-casual-main" ? (
          <>
            <LP className="dense" role="status">
              Spoken role-play lives in conversation practice. Recording stays
              local and never claims pronunciation accuracy.
            </LP>
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
          <LP className="placeholder-banner" role="status">
            Speaking practice is not available for this Q&amp;A yet.
          </LP>
        )}
      </LSection>

      <LDiv className="detail-actions">
        <ConversationLink detail={detail} />
        <PractiseLink detail={detail} />
      </LDiv>
      <DetailLearningControls key={detail.id} contentId={detail.id} />
    </LDiv>
  );
}

function GrammarDetail({ detail }: { detail: LearnerGrammarDetail }) {
  return (
    <LDiv className="stack detail-page detail-page--grammar">
      <LHeader className="page-header">
        <LP className="dense">Grammar explorer</LP>
        <LH1><LSpan className="german" lang="de">{detail.titleDe}</LSpan></LH1>
        <LP className="lede">{detail.titleEn}</LP>
        <MetaChips
          lessonIds={detail.lessonIds}
          sourcePriority={detail.sourcePriority}
        />
      </LHeader>

      <GrammarConceptVisual detail={detail} />

      <LSection className="panel grammar-notice" aria-labelledby="grammar-notice-heading">
        <LH2 id="grammar-notice-heading">What to notice</LH2>
        <LP>{detail.notice}</LP>
      </LSection>

      <LSection className="panel" aria-labelledby="grammar-rules-heading">
        <LH2 id="grammar-rules-heading">Rule and model</LH2>
        <LOl className="grammar-rule-list">
          {detail.ruleSteps.map((step) => (
            <LLi key={step.id} className="grammar-rule-card">
              <LP>{step.notice}</LP>
              {step.model ? (
                <LP className="grammar-model german" lang="de">{step.model}</LP>
              ) : (
                <LP className="placeholder-banner" role="status">
                  No model sentence accompanies this rule step yet.
                </LP>
              )}
            </LLi>
          ))}
        </LOl>
      </LSection>

      <LSection className="panel" aria-labelledby="grammar-links-heading">
        <LH2 id="grammar-links-heading">Learning path</LH2>
        {detail.prerequisiteLabels.length > 0 ? (
          <LDiv>
            <LH3>Review first</LH3>
            <LUl>
              {detail.prerequisiteIds.map((id, index) => (
                <LLi key={id}>
                  <Link href={detailCanonicalPath("grammar", id)}>
                    <LSpan className="german" lang="de">{detail.prerequisiteLabels[index]}</LSpan>
                  </Link>
                </LLi>
              ))}
            </LUl>
          </LDiv>
        ) : <LP className="dense">No prerequisite is required.</LP>}
        <LP className="dense">
          {detail.activityIds.length} linked {detail.activityIds.length === 1 ? "activity" : "activities"}
        </LP>
        <LDiv className="detail-actions">
          {detail.lessonIds.map((lessonId) => {
            const segment = lessonId.includes(":") ? lessonId.slice(lessonId.indexOf(":") + 1) : lessonId;
            return <Link key={lessonId} className="btn btn-secondary" href={`/lessons/${segment}`}>Open {lessonLabel(lessonId)}</Link>;
          })}
        </LDiv>
      </LSection>

      <LSection className="panel" aria-labelledby="grammar-errors-heading">
        <LH2 id="grammar-errors-heading">Common errors to watch</LH2>
        {detail.commonErrorTags.length > 0 ? (
          <LUl className="tag-list">
            {detail.commonErrorTags.map((tag) => <LLi key={tag}><LSpan className="meta-chip">{tag.replaceAll("-", " ")}</LSpan></LLi>)}
          </LUl>
        ) : <LP className="dense">No common errors are listed for this topic.</LP>}
      </LSection>

      <DetailLearningControls key={detail.id} contentId={detail.id} />
    </LDiv>
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
    <LDiv className="stack">
      <BackLink href={backHref} />
      {detail.kind === "Lexeme" ? <VocabularyDetail detail={detail} /> : null}
      {detail.kind === "Verb" ? <VerbDetail detail={detail} /> : null}
      {detail.kind === "QAPair" ? <QaDetail detail={detail} /> : null}
      {detail.kind === "GrammarConcept" ? <GrammarDetail detail={detail} /> : null}
    </LDiv>
  );
}
