
import { LArticle, LCaption, LDetails, LDiv, LH2, LH3, LLi, LOl, LP, LSection, LSpan, LStrong, LSummary, LTable, LTbody, LTd, LTh, LTr, LUl } from "@/components/i18n/LocalizedElements";
import type {
  RapidGenderLegendItem,
  RapidLearnerContent,
  RapidPracticePrompt,
} from "@/lib/content/rapid-content-types";
import { getRapidLearnerContent } from "@/lib/content/rapid-content";

function German({ children }: { children: string }) {
  return <LSpan className="german" lang="de">{children}</LSpan>;
}

function GenderKey({ item }: { item: RapidGenderLegendItem }) {
  return (
    <LLi className={`gender-badge gender-badge--${item.gender}`} data-color-token={item.colorToken}>
      <LSpan className="gender-badge__shape" aria-hidden="true" data-shape={item.shape} />
      <German>{item.article}</German> · {item.learnerLabel}
    </LLi>
  );
}

export function RapidGreetingsSection({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <LSection className="panel" aria-labelledby="rapid-greetings-heading">
      <LP className="dense">Lesson 1 · greeting map</LP>
      <LH2 id="rapid-greetings-heading">Meet, greet, and say goodbye</LH2>
      <LUl className="activity-content-grid">
        {content.greetings.map((item) => (
          <LLi key={item.id} className="activity-content-card" data-function={item.function}>
            <LStrong><German>{item.de}</German></LStrong>
            <LSpan>{item.en}</LSpan>
            <LSpan className="meta-chip">{item.function}</LSpan>
          </LLi>
        ))}
      </LUl>
    </LSection>
  );
}

export function RapidQaSection({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <LSection className="panel qa-dialogue" aria-labelledby="rapid-qa-heading">
      <LP className="dense">Lessons 1–2 · conversation patterns</LP>
      <LH2 id="rapid-qa-heading">Ask, then answer</LH2>
      {content.qaGroups.map((group) => (
        <LArticle key={group.id} className="qa-bubble" data-register={group.register}>
          <LH3>{group.title}</LH3>
          <LP className="qa-bubble qa-bubble--question"><German>{group.question}</German></LP>
          <LUl className="qa-answer-list">
            {group.answers.map((answer) => (
              <LLi key={answer} className="qa-bubble qa-bubble--answer"><German>{answer}</German></LLi>
            ))}
          </LUl>
        </LArticle>
      ))}
    </LSection>
  );
}

export function RapidVerbSection({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <LSection className="panel" aria-labelledby="rapid-verbs-heading">
      <LP className="dense">Lesson 1 verb patterns</LP>
      <LH2 id="rapid-verbs-heading">Core verb patterns</LH2>
      <LDiv className="card-grid">
        {content.verbs.map((verb) => (
          <LArticle key={verb.id} className="card" data-pattern={verb.pattern}>
            <LH3><German>{verb.infinitive}</German></LH3>
            <LP>{verb.meaningEn}</LP>
            <LTable className="verb-paradigm">
              <LCaption className="dense">{verb.pattern === "irregular" ? "Irregular pattern" : "Lesson 1 forms"}</LCaption>
              <LTbody>
                {verb.forms.map((row) => (
                  <LTr key={row.person}>
                    <LTh scope="row"><German>{row.person}</German></LTh>
                    <LTd>
                      <LSpan className={`morph-token ${verb.pattern === "irregular" ? "morph-token--irr" : "morph-token--stem"}`}>
                        <German>{row.form}</German>
                      </LSpan>
                    </LTd>
                  </LTr>
                ))}
              </LTbody>
            </LTable>
          </LArticle>
        ))}
      </LDiv>
      <LP className="placeholder-banner" role="status">{content.verbGap.learnerMessage}</LP>
    </LSection>
  );
}

export function RapidProfessionMorphologySection({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <LSection className="panel" aria-labelledby="rapid-professions-heading">
      <LP className="dense">Lesson 2 · 13 person-form pairs</LP>
      <LH2 id="rapid-professions-heading">Article, gender, and person form</LH2>
      <LUl className="meta-row" aria-label="Article and gender legend">
        {content.genderLegend.map((item) => <GenderKey key={`${item.gender}-${item.article}`} item={item} />)}
      </LUl>
      <LDiv className="card-grid">
        {content.professionPairs.map((pair) => (
          <LArticle key={pair.id} className="card">
            <LP className="detail-form-card__lemma"><German>{pair.masculine}</German></LP>
            <LP className="detail-form-card__lemma"><German>{pair.feminine}</German></LP>
            <LP>{pair.glossEn}</LP>
            <LDiv className="person-form-infographic" role="note" aria-label={`Person-form change: ${pair.operation}`}>
              <LSpan className={pair.id === "profession:arzt" ? "morph-token morph-token--irr" : "morph-token morph-token--suffix"}>
                <German>{pair.operation}</German>
              </LSpan>
            </LDiv>
          </LArticle>
        ))}
      </LDiv>
      <LP className="placeholder-banner" role="status">{content.pluralGap.learnerMessage}</LP>
    </LSection>
  );
}

function PromptAnswer({ prompt }: { prompt: RapidPracticePrompt }) {
  const answer = prompt.answer ?? prompt.accepted?.join(" · ") ?? prompt.tokens?.join(" ") ?? "";
  return (
    <LDetails>
      <LSummary>Check the model answer</LSummary>
      <LP><German>{answer}</German></LP>
    </LDetails>
  );
}

export function RapidPracticeSection({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <LSection className="panel" aria-labelledby="rapid-practice-heading">
      <LP className="dense">Low-risk retrieval prompts</LP>
      <LH2 id="rapid-practice-heading">Try it</LH2>
      <LOl className="qa-levels">
        {content.practicePrompts.map((prompt) => (
          <LLi key={prompt.id} className="qa-level" data-kind={prompt.kind}>
            <LStrong>{prompt.prompt}</LStrong>
            {prompt.options ? <LP className="dense"><German>{prompt.options.join(" · ")}</German></LP> : null}
            {prompt.tokens ? <LP className="dense"><German>{prompt.tokens.join(" · ")}</German></LP> : null}
            <PromptAnswer prompt={prompt} />
          </LLi>
        ))}
      </LOl>
    </LSection>
  );
}

export function RapidContentSections({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <LDiv className="stack" data-rapid-content-version={content.schemaVersion}>
      <RapidGreetingsSection content={content} />
      <RapidQaSection content={content} />
      <RapidVerbSection content={content} />
      <RapidProfessionMorphologySection content={content} />
      <RapidPracticeSection content={content} />
      <LSection className="panel" aria-labelledby="rapid-gaps-heading">
        <LH2 id="rapid-gaps-heading">Known content gaps</LH2>
        <LUl className="gap-list">
          {content.gaps.map((gap) => <LLi key={gap.code} data-state={gap.state}>{gap.learnerMessage}</LLi>)}
        </LUl>
      </LSection>
    </LDiv>
  );
}

