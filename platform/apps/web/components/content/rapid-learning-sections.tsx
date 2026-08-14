import type {
  RapidGenderLegendItem,
  RapidLearnerContent,
  RapidPracticePrompt,
} from "@/lib/content/rapid-content-types";
import { getRapidLearnerContent } from "@/lib/content/rapid-content";

function German({ children }: { children: string }) {
  return <span className="german" lang="de">{children}</span>;
}

function GenderKey({ item }: { item: RapidGenderLegendItem }) {
  return (
    <li className={`gender-badge gender-badge--${item.gender}`} data-color-token={item.colorToken}>
      <span className="gender-badge__shape" aria-hidden="true" data-shape={item.shape} />
      <German>{item.article}</German> · {item.learnerLabel}
    </li>
  );
}

export function RapidGreetingsSection({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <section className="panel" aria-labelledby="rapid-greetings-heading">
      <p className="dense">Lesson 1 · greeting map</p>
      <h2 id="rapid-greetings-heading">Meet, greet, and say goodbye</h2>
      <ul className="activity-content-grid">
        {content.greetings.map((item) => (
          <li key={item.id} className="activity-content-card" data-function={item.function}>
            <strong><German>{item.de}</German></strong>
            <span>{item.en}</span>
            <span className="meta-chip">{item.function}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RapidQaSection({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <section className="panel qa-dialogue" aria-labelledby="rapid-qa-heading">
      <p className="dense">Lessons 1–2 · conversation patterns</p>
      <h2 id="rapid-qa-heading">Ask, then answer</h2>
      {content.qaGroups.map((group) => (
        <article key={group.id} className="qa-bubble" data-register={group.register}>
          <h3>{group.title}</h3>
          <p className="qa-bubble qa-bubble--question"><German>{group.question}</German></p>
          <ul className="qa-answer-list">
            {group.answers.map((answer) => (
              <li key={answer} className="qa-bubble qa-bubble--answer"><German>{answer}</German></li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

export function RapidVerbSection({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <section className="panel" aria-labelledby="rapid-verbs-heading">
      <p className="dense">Lesson 1 verb patterns</p>
      <h2 id="rapid-verbs-heading">Core verb patterns</h2>
      <div className="card-grid">
        {content.verbs.map((verb) => (
          <article key={verb.id} className="card" data-pattern={verb.pattern}>
            <h3><German>{verb.infinitive}</German></h3>
            <p>{verb.meaningEn}</p>
            <table className="verb-paradigm">
              <caption className="dense">{verb.pattern === "irregular" ? "Irregular pattern" : "Lesson 1 forms"}</caption>
              <tbody>
                {verb.forms.map((row) => (
                  <tr key={row.person}>
                    <th scope="row"><German>{row.person}</German></th>
                    <td>
                      <span className={`morph-token ${verb.pattern === "irregular" ? "morph-token--irr" : "morph-token--stem"}`}>
                        <German>{row.form}</German>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
      <p className="placeholder-banner" role="status">{content.verbGap.learnerMessage}</p>
    </section>
  );
}

export function RapidProfessionMorphologySection({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <section className="panel" aria-labelledby="rapid-professions-heading">
      <p className="dense">Lesson 2 · 13 person-form pairs</p>
      <h2 id="rapid-professions-heading">Article, gender, and person form</h2>
      <ul className="meta-row" aria-label="Article and gender legend">
        {content.genderLegend.map((item) => <GenderKey key={`${item.gender}-${item.article}`} item={item} />)}
      </ul>
      <div className="card-grid">
        {content.professionPairs.map((pair) => (
          <article key={pair.id} className="card">
            <p className="detail-form-card__lemma"><German>{pair.masculine}</German></p>
            <p className="detail-form-card__lemma"><German>{pair.feminine}</German></p>
            <p>{pair.glossEn}</p>
            <div className="person-form-infographic" role="note" aria-label={`Person-form change: ${pair.operation}`}>
              <span className={pair.id === "profession:arzt" ? "morph-token morph-token--irr" : "morph-token morph-token--suffix"}>
                <German>{pair.operation}</German>
              </span>
            </div>
          </article>
        ))}
      </div>
      <p className="placeholder-banner" role="status">{content.pluralGap.learnerMessage}</p>
    </section>
  );
}

function PromptAnswer({ prompt }: { prompt: RapidPracticePrompt }) {
  const answer = prompt.answer ?? prompt.accepted?.join(" · ") ?? prompt.tokens?.join(" ") ?? "";
  return (
    <details>
      <summary>Check the model answer</summary>
      <p><German>{answer}</German></p>
    </details>
  );
}

export function RapidPracticeSection({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <section className="panel" aria-labelledby="rapid-practice-heading">
      <p className="dense">Low-risk retrieval prompts</p>
      <h2 id="rapid-practice-heading">Try it</h2>
      <ol className="qa-levels">
        {content.practicePrompts.map((prompt) => (
          <li key={prompt.id} className="qa-level" data-kind={prompt.kind}>
            <strong>{prompt.prompt}</strong>
            {prompt.options ? <p className="dense"><German>{prompt.options.join(" · ")}</German></p> : null}
            {prompt.tokens ? <p className="dense"><German>{prompt.tokens.join(" · ")}</German></p> : null}
            <PromptAnswer prompt={prompt} />
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RapidContentSections({ content = getRapidLearnerContent() }: { content?: RapidLearnerContent }) {
  return (
    <div className="stack" data-rapid-content-version={content.schemaVersion}>
      <RapidGreetingsSection content={content} />
      <RapidQaSection content={content} />
      <RapidVerbSection content={content} />
      <RapidProfessionMorphologySection content={content} />
      <RapidPracticeSection content={content} />
      <section className="panel" aria-labelledby="rapid-gaps-heading">
        <h2 id="rapid-gaps-heading">Known content gaps</h2>
        <ul className="gap-list">
          {content.gaps.map((gap) => <li key={gap.code} data-state={gap.state}>{gap.learnerMessage}</li>)}
        </ul>
      </section>
    </div>
  );
}

