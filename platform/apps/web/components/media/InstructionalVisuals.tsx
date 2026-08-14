import type {
  LearnerGrammarDetail,
  LearnerQaDetail,
  LearnerVerbDetail,
  LearnerVocabularyDetail,
} from "@/lib/content/detail-types";
import type { LearnerLesson } from "@/lib/content/types";
import { lessonLabel } from "@/lib/content/lesson-label";
import { getRapidLearnerContent } from "@/lib/content/rapid-content";
import { GenderBadge } from "@/components/details/GenderBadge";

type VisualTone =
  | "neutral"
  | "masculine"
  | "feminine"
  | "plural"
  | "regular"
  | "special"
  | "irregular"
  | "question"
  | "answer";

function German({ children }: { children: string }) {
  return (
    <span className="german" lang="de">
      {children}
    </span>
  );
}

function VisualFrame({
  eyebrow,
  title,
  summary,
  kind,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  kind: string;
  children: React.ReactNode;
}) {
  const headingId = `instructional-${kind}-heading`;
  return (
    <section
      className="instructional-visual"
      data-instructional-visual={kind}
      aria-labelledby={headingId}
    >
      <header className="instructional-visual__header">
        <p className="dense">{eyebrow}</p>
        <h2 id={headingId}>{title}</h2>
        <p className="muted">{summary}</p>
      </header>
      <div className="instructional-visual__body">{children}</div>
    </section>
  );
}

function Cue({
  children,
  tone = "neutral",
  label,
}: {
  children: React.ReactNode;
  tone?: VisualTone;
  label?: string;
}) {
  return (
    <span className="visual-cue" data-tone={tone} aria-label={label}>
      {children}
    </span>
  );
}

const LESSON_JOURNEYS = Object.freeze({
  "01": Object.freeze([
    Object.freeze({ de: "Hallo!", en: "Choose a greeting", tone: "question" as const }),
    Object.freeze({ de: "Ich heiße …", en: "Give your name", tone: "answer" as const }),
    Object.freeze({ de: "Wie geht’s?", en: "Check wellbeing", tone: "question" as const }),
    Object.freeze({ de: "Ich komme aus …", en: "Say your origin", tone: "answer" as const }),
    Object.freeze({ de: "A–Z", en: "Listen and spell", tone: "special" as const }),
    Object.freeze({ de: "du ↔ Sie", en: "Build an exchange", tone: "regular" as const }),
  ]),
  "02": Object.freeze([
    Object.freeze({ de: "Das bin ich", en: "Build a profile", tone: "answer" as const }),
    Object.freeze({ de: "ich · du · wir · ihr", en: "Match person and verb", tone: "regular" as const }),
    Object.freeze({ de: "nicht", en: "Express a negative", tone: "special" as const }),
    Object.freeze({ de: "der ↔ die", en: "Learn profession pairs", tone: "masculine" as const }),
    Object.freeze({ de: "0 → 100", en: "Hear and recognize numbers", tone: "plural" as const }),
    Object.freeze({ de: "Was sind Sie von Beruf?", en: "Ask, answer, and write", tone: "question" as const }),
  ]),
});

export function LessonJourneyVisual({ lesson }: { lesson: LearnerLesson }) {
  const journey = LESSON_JOURNEYS[lesson.routeSegment === "02" ? "02" : "01"];
  return (
    <VisualFrame
      eyebrow={`${lessonLabel(lesson.routeSegment)} · visual route`}
      title="See the whole lesson before you start"
      summary="Move left to right. Each stop prepares language that returns in later practice and the checkpoint."
      kind={`lesson-${lesson.routeSegment}-journey`}
    >
      <ol className="visual-journey" aria-label={`${lessonLabel(lesson.routeSegment)} learning sequence`}>
        {journey.map((step, index) => (
          <li key={step.de} className="visual-journey__step">
            <span className="visual-journey__index" aria-hidden="true">{index + 1}</span>
            <Cue tone={step.tone}><German>{step.de}</German></Cue>
            <span>{step.en}</span>
          </li>
        ))}
      </ol>
    </VisualFrame>
  );
}

function GreetingTimelineVisual() {
  const greetings = [
    { sky: "morning", de: "Guten Morgen", en: "morning" },
    { sky: "day", de: "Guten Tag", en: "daytime" },
    { sky: "evening", de: "Guten Abend", en: "evening" },
    { sky: "night", de: "Gute Nacht", en: "bedtime farewell" },
  ] as const;
  return (
    <VisualFrame
      eyebrow="Lesson 1 · context map"
      title="Let the time of day choose the phrase"
      summary="Hallo is flexible. The four phrases below carry a time cue; Gute Nacht functions as a farewell in this lesson."
      kind="greetings-dayparts"
    >
      <ol className="daypart-track">
        {greetings.map((item, index) => (
          <li key={item.de} data-sky={item.sky}>
            <span className="daypart-track__sky" aria-hidden="true"><i /></span>
            <strong><German>{item.de}</German></strong>
            <span>{item.en}</span>
            {index < greetings.length - 1 ? <span className="daypart-track__connector" aria-hidden="true">→</span> : null}
          </li>
        ))}
      </ol>
      <div className="visual-legend" aria-label="Flexible greeting and farewell cues">
        <Cue tone="question"><German>Hallo</German> · flexible greeting</Cue>
        <Cue tone="answer"><German>Tschüs</German> · casual farewell</Cue>
        <Cue tone="neutral"><German>Auf Wiedersehen</German> · formal farewell</Cue>
      </div>
    </VisualFrame>
  );
}

function NumberRangeVisual() {
  return (
    <VisualFrame
      eyebrow="Lesson 2 · number field"
      title="Scan the range before you listen"
      summary="This activity covers 0–100. This map shows the numeric territory one band at a time."
      kind="numbers-0-100"
    >
      <div className="number-map" aria-label="Number range zero through one hundred">
        <div className="number-map__digits" aria-label="Single digits">
          {Array.from({ length: 10 }, (_, number) => <Cue key={number} tone="regular">{number}</Cue>)}
        </div>
        <div className="number-map__bands">
          <div><strong>10–19</strong><span>teen range</span></div>
          <div><strong>20 · 30 · 40 · 50</strong><span>decade anchors</span></div>
          <div><strong>60 · 70 · 80 · 90</strong><span>decade anchors</span></div>
          <div className="number-map__hundred"><strong>100</strong><span>range endpoint</span></div>
        </div>
      </div>
      <p className="visual-note">Listen for one number at a time, then type only what the recording supports.</p>
    </VisualFrame>
  );
}

function ProfessionPairsVisual({ limit = 6 }: { limit?: number }) {
  const pairs = getRapidLearnerContent().professionPairs.slice(0, limit);
  return (
    <VisualFrame
      eyebrow="Lesson 2 · person-form system"
      title="Article + person word travel together"
      summary="Blue square marks masculine der; pink circle marks feminine die. Amber marks the visible change between the two forms."
      kind="profession-pairs"
    >
      <div className="profession-pair-grid">
        {pairs.map((pair) => (
          <article className="profession-pair" key={pair.id}>
            <div data-gender="masculine"><GenderBadge gender="masculine" /><strong><German>{pair.masculine}</German></strong></div>
            <span className="profession-pair__arrow" aria-hidden="true">→</span>
            <div data-gender="feminine"><GenderBadge gender="feminine" /><strong><German>{pair.feminine}</German></strong></div>
            <Cue tone={pair.id === "profession:arzt" ? "irregular" : "special"}><German>{pair.operation}</German></Cue>
          </article>
        ))}
      </div>
      <p className="visual-note">Plural forms are deliberately absent here — these lessons focus on the singular pair.</p>
    </VisualFrame>
  );
}

function CoreVerbVisual() {
  const verbs = getRapidLearnerContent().verbs;
  return (
    <VisualFrame
      eyebrow="Lessons 1–2 · verb signals"
      title="Read the colour before the form"
      summary="Teal keeps the stem visible, amber calls out a spelling-sensitive ending, and magenta marks a whole irregular form."
      kind="core-verb-patterns"
    >
      <div className="verb-visual-grid">
        {verbs.map((verb) => (
          <article key={verb.id} data-pattern={verb.pattern}>
            <h3><German>{verb.infinitive}</German></h3>
            <p>{verb.meaningEn}</p>
            <div className="verb-visual-grid__forms">
              {verb.forms.map((form) => (
                <span key={form.person}>
                  <small><German>{form.person}</German></small>
                  <Cue tone={verb.pattern === "irregular" ? "irregular" : verb.id === "verb:heissen" && form.form === "heißt" ? "special" : "regular"}>
                    <German>{form.form}</German>
                  </Cue>
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
      <RuleLegend />
    </VisualFrame>
  );
}

function ProfessionExpressionVisual() {
  return (
    <VisualFrame
      eyebrow="Lesson 2 · meaning contrast"
      title="Identity and work use different frames"
      summary="Each lane below is a complete model sentence. Keep the connector with the expression that follows it."
      kind="profession-expressions"
    >
      <div className="expression-lanes">
        <div><Cue tone="irregular"><German>sein</German></Cue><span aria-hidden="true">→</span><German>Ich bin Architekt.</German><small>profession identity</small></div>
        <div><Cue tone="regular"><German>arbeiten als</German></Cue><span aria-hidden="true">→</span><German>Ich arbeite als Architekt.</German><small>work as a profession</small></div>
        <div><Cue tone="special"><German>arbeiten bei</German></Cue><span aria-hidden="true">→</span><German>Ich arbeite bei einer Firma.</German><small>workplace pattern</small></div>
      </div>
    </VisualFrame>
  );
}

function ActivityDialogueVisual({ profession = false }: { profession?: boolean }) {
  const question = profession ? "Was bist du von Beruf?" : "Wie heißt du?";
  const answer = profession ? "Ich bin … von Beruf." : "Ich heiße …";
  return (
    <VisualFrame
      eyebrow="Conversation · two-turn loop"
      title="Question opens; answer returns"
      summary="Follow the direction once as the listener, then switch roles and travel back through the same pattern."
      kind={profession ? "profession-dialogue" : "introduction-dialogue"}
    >
      <div className="dialogue-flow" data-register="informal">
        <div className="dialogue-flow__speaker" aria-hidden="true">A</div>
        <div className="dialogue-flow__bubble" data-role="question"><span>question</span><German>{question}</German></div>
        <span className="dialogue-flow__arrow" aria-hidden="true">→</span>
        <div className="dialogue-flow__bubble" data-role="answer"><span>answer</span><German>{answer}</German></div>
        <div className="dialogue-flow__speaker" aria-hidden="true">B</div>
      </div>
      <div className="visual-legend"><Cue tone="question">Question</Cue><Cue tone="answer">Answer</Cue><Cue tone="neutral">informal · du</Cue></div>
    </VisualFrame>
  );
}

const GREETING_ACTIVITY_IDS = new Set([
  "activity:lesson-01-greetings-by-context",
  "activity:lesson-01-greeting-farewell-match",
]);
const VERB_ACTIVITY_IDS = new Set([
  "activity:lesson-01-heissen-sein-notice",
  "activity:lesson-01-pronoun-verb-builder",
  "activity:lesson-02-full-person-conjugation",
]);
const INTRO_DIALOGUE_ACTIVITY_IDS = new Set([
  "activity:lesson-01-name-model-dialogue",
  "activity:lesson-01-register-qa-builder",
]);

export function ActivityConceptVisual({ activityId }: { activityId: string }) {
  if (GREETING_ACTIVITY_IDS.has(activityId)) return <GreetingTimelineVisual />;
  if (VERB_ACTIVITY_IDS.has(activityId)) return <CoreVerbVisual />;
  if (INTRO_DIALOGUE_ACTIVITY_IDS.has(activityId)) return <ActivityDialogueVisual />;
  if (activityId === "activity:lesson-02-numbers-0-100") return <NumberRangeVisual />;
  if (activityId === "activity:lesson-02-core-professions" || activityId === "activity:lesson-02-person-form-morphology") return <ProfessionPairsVisual />;
  if (activityId === "activity:lesson-02-profession-qa-builder") return <ActivityDialogueVisual profession />;
  if (activityId === "activity:lesson-02-sein-arbeiten-contrast") return <ProfessionExpressionVisual />;
  return null;
}

function PluralLane({ detail }: { detail: LearnerVocabularyDetail }) {
  if (detail.plurals.length === 0) {
    return (
      <div className="noun-system__plural" data-status="not-published">
        <Cue tone="plural"><span aria-hidden="true">◫</span> die · plural</Cue>
        <strong>No plural</strong>
        <span>{detail.pluralGapMessage ?? "Plural does not apply to this item."}</span>
      </div>
    );
  }
  return (
    <div className="noun-system__plural" data-status="published">
      <Cue tone="plural"><span aria-hidden="true">◫</span> die · plural</Cue>
      <div className="noun-system__forms">
        {detail.plurals.map((plural) => {
          const visibleChange = plural.startsWith(detail.lemma)
            ? `+${plural.slice(detail.lemma.length)}`
            : "whole stored form";
          return <strong key={plural}><German>{`die ${plural}`}</German><small>{visibleChange}</small></strong>;
        })}
      </div>
      <span>Exact stored plural {detail.plurals.length === 1 ? "form" : "forms"}</span>
    </div>
  );
}

export function NounSystemVisual({ detail }: { detail: LearnerVocabularyDetail }) {
  if (!detail.article || !detail.gender) return null;
  return (
    <VisualFrame
      eyebrow="Noun map · article, gender, number"
      title="Read the noun as a complete unit"
      summary="Article, shape, colour, and label repeat the same cue. The purple plural lane appears only when an exact stored form exists."
      kind={`noun-${detail.id.replace(":", "-")}`}
    >
      <div className="noun-system">
        <div className="noun-system__singular" data-gender={detail.gender}>
          <GenderBadge gender={detail.gender} />
          <strong><German>{detail.displayText}</German></strong>
          <span>singular</span>
        </div>
        <span className="noun-system__arrow" aria-hidden="true">→</span>
        <PluralLane detail={detail} />
      </div>
      {detail.personForm ? (
        <div className="noun-system__person-pair" aria-label={`Related person form ${detail.personForm.relatedDisplayText}`}>
          <div><GenderBadge gender={detail.gender} /><German>{detail.displayText}</German></div>
          <span aria-hidden="true">+</span>
          <Cue tone={detail.personForm.sharedStem === detail.lemma ? "special" : "irregular"}><German>{detail.personForm.operationLabel}</German></Cue>
          <span aria-hidden="true">→</span>
          <div><GenderBadge gender={detail.personForm.relatedGender} /><German>{detail.personForm.relatedDisplayText}</German></div>
        </div>
      ) : null}
    </VisualFrame>
  );
}

function RuleLegend() {
  return (
    <div className="visual-legend" aria-label="Verb pattern colour key">
      <Cue tone="regular">REG · regular stem / ending</Cue>
      <Cue tone="special">SPELL · spelling-sensitive form</Cue>
      <Cue tone="irregular">IRR · learn the whole form</Cue>
    </div>
  );
}

function splitVerbForm(detail: LearnerVerbDetail, form: string): { stem: string; ending: string } {
  const stem = detail.infinitive.endsWith("en") ? detail.infinitive.slice(0, -2) : detail.infinitive.slice(0, -1);
  return form.startsWith(stem)
    ? { stem, ending: form.slice(stem.length) }
    : { stem: form, ending: "" };
}

export function VerbPatternVisual({ detail }: { detail: LearnerVerbDetail }) {
  const irregular = detail.id === "verb:sein";
  const spellingSensitive = detail.id === "verb:heissen";
  return (
    <VisualFrame
      eyebrow="Verb map · person, stem, ending"
      title={irregular ? "Learn sein as complete forms" : "Keep the stem; read the person signal"}
      summary={irregular ? "Magenta means no pretend stem rule: recall each form as a whole." : spellingSensitive ? "Amber highlights heißt, where the taught spelling does not show an extra s before t." : "Teal separates the stable stem from each exact ending."}
      kind={`verb-${detail.id.replace(":", "-")}`}
    >
      <div className="verb-build-map">
        {detail.present.map((row) => {
          const split = splitVerbForm(detail, row.form);
          const special = spellingSensitive && row.form === "heißt";
          return (
            <div key={row.person} className="verb-build-map__row">
              <Cue><German>{row.personLabel}</German></Cue>
              <span aria-hidden="true">→</span>
              {irregular ? (
                <Cue tone="irregular"><German>{row.form}</German></Cue>
              ) : (
                <span className="verb-build-map__word" aria-label={`${row.form}: stem ${split.stem}${split.ending ? `, ending ${split.ending}` : ""}`}>
                  <Cue tone="regular"><German>{split.stem}</German></Cue>
                  {split.ending ? <Cue tone={special ? "special" : "regular"}><German>{split.ending}</German></Cue> : null}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <RuleLegend />
    </VisualFrame>
  );
}

export function QuestionAnswerFlowVisual({ detail }: { detail: LearnerQaDetail }) {
  const questionTokens = detail.question.realization.trim().split(/\s+/u);
  const finiteVerbForms = new Set(["bin", "bist", "ist", "sind", "seid", "heiße", "heißt", "heißen", "komme", "kommst", "kommt", "kommen", "lerne", "lernst", "lernt", "lernen", "wohne", "wohnst", "wohnt", "wohnen", "mache", "machst", "macht", "machen", "geht", "geht’s", "geht's"]);
  return (
    <VisualFrame
      eyebrow={`Dialogue map · ${detail.register} register`}
      title="See the turn before you speak it"
      summary="The question travels to the listener; an answer pattern returns. Switch roles after one complete exchange."
      kind={`qa-${detail.id.replace(":", "-")}`}
    >
      <div className="question-build" aria-label={`Question structure for ${detail.question.realization}`}>
        {questionTokens.map((token, index) => (
          <span key={`${token}-${index}`}>
            <small>{index === 0 ? "question opening" : finiteVerbForms.has(token.replace(/[?.,!]$/u, "")) ? "finite verb" : "question element"}</small>
            <Cue tone={finiteVerbForms.has(token.replace(/[?.,!]$/u, "")) ? "special" : "question"}><German>{token}</German></Cue>
          </span>
        ))}
      </div>
      <div className="dialogue-flow" data-register={detail.register}>
        <div className="dialogue-flow__speaker" aria-hidden="true">A</div>
        <div className="dialogue-flow__bubble" data-role="question"><span>ask</span><German>{detail.question.realization}</German></div>
        <span className="dialogue-flow__arrow" aria-hidden="true">→</span>
        <div className="dialogue-flow__answers" aria-label="Answer patterns">
          {detail.answers.map((answer) => <div key={answer.id} className="dialogue-flow__bubble" data-role="answer"><span>answer</span><German>{answer.realization}</German></div>)}
        </div>
        <div className="dialogue-flow__speaker" aria-hidden="true">B</div>
      </div>
      <div className="visual-legend"><Cue tone="question">Question</Cue><Cue tone="answer">Answer</Cue><Cue tone="neutral">{detail.register} register</Cue></div>
    </VisualFrame>
  );
}

function modelTone(detailId: string): VisualTone {
  if (detailId.includes("feminine")) return "feminine";
  if (detailId.includes("nicht") || detailId.includes("register") || detailId.includes("aus")) return "special";
  if (detailId.includes("present") || detailId.includes("pronoun")) return "regular";
  return "question";
}

export function GrammarConceptVisual({ detail }: { detail: LearnerGrammarDetail }) {
  const models = detail.ruleSteps.flatMap((step) => step.model ? step.model.split(" · ").map((model) => ({ step: step.notice, model })) : []);
  return (
    <VisualFrame
      eyebrow="Grammar map · notice, model, retrieve"
      title={detail.titleEn}
      summary={detail.notice}
      kind={`grammar-${detail.id.replace(":", "-")}`}
    >
      <ol className="grammar-visual-flow">
        {detail.ruleSteps.map((step, index) => (
          <li key={step.id}>
            <span className="grammar-visual-flow__index" aria-hidden="true">{index + 1}</span>
            <p>{step.notice}</p>
            {step.model ? <div className="grammar-visual-flow__models">{step.model.split(" · ").map((model) => <Cue key={model} tone={modelTone(detail.id)}><German>{model}</German></Cue>)}</div> : null}
          </li>
        ))}
      </ol>
      {models.length > 0 ? <p className="visual-note">All examples shown here are the exact model sentences for this grammar topic.</p> : null}
      {detail.id === "gram:present-conjugation-l1" || detail.id === "gram:full-present-person-forms-l2" ? <RuleLegend /> : null}
    </VisualFrame>
  );
}
