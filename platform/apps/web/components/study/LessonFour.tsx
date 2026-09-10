"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  courseChapters,
  lessonFourConcepts,
  lessonFourPhrases,
  lessonFourQuiz,
  lessonFourVerbs,
  lessonFourWords,
} from "@/lib/study/lesson-four";
import { GermanText, SaveButton, useStudy } from "./StudyProvider";
import { LineAudio } from "./StudyAudio";

const tabs = ["Words", "Grammar", "Verbs", "Phrases", "Practice"] as const;
export function LessonFour({ speech }: { speech: Record<string, string> }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Words");
  useEffect(() => {
    const section = window.location.hash.slice(1).toLowerCase();
    const found = tabs.find((value) => value.toLowerCase() === section);
    if (found) setTab(found);
  }, []);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const study = useStudy();
  const words = lessonFourWords.filter(
    (word) =>
      (category === "All" || word.category === category) &&
      `${word.de} ${word.en}`
        .toLocaleLowerCase("de")
        .includes(query.toLocaleLowerCase("de")),
  );
  const exercise = lessonFourQuiz[position]!;
  const complete =
    study?.state.completedPages.filter((id) =>
      [29, 30, 31, 32].some((n) => id === `coursebook-${n}`),
    ).length ?? 0;
  return (
    <div className="study-workspace">
      <Link className="study-back" href="/lessons">
        ← All lessons
      </Link>
      <header className="lesson-four-hero">
        <div>
          <p className="study-eyebrow">Lesson 4 · Momente A1</p>
          <h1 lang="de">
            Das Bild
            <br />
            ist so schön.
          </h1>
          <p>Find the words for your space.</p>
          <p className="lesson-four-summary">
            Describe furniture, share your opinion, and ask the price. Learn
            each noun with its article, then use <strong>er, es, sie</strong>{" "}
            naturally.
          </p>
          <div className="study-row">
            <Link className="study-primary" href="/book?page=coursebook-29">
              Open interactive book →
            </Link>
            <Link className="study-secondary" href="/book?page=workbook-26">
              Workbook
            </Link>
          </div>
        </div>
        <div
          className="lesson-room"
          aria-label="Furniture vocabulary illustration"
        >
          <div className="room-picture">
            <span>das Bild</span>
          </div>
          <div className="room-lamp">
            <span>die Lampe</span>
          </div>
          <div className="room-sofa">
            <span>das Sofa</span>
          </div>
          <div className="room-rug" />
          <div className="room-price">
            59 €<small>das Sofa → es</small>
          </div>
        </div>
      </header>
      <div className="lesson-four-meta">
        <span>{lessonFourWords.length} words & expressions</span>
        <span>{lessonFourConcepts.length} grammar concepts</span>
        <span>18 original recordings in the book</span>
        <span>{complete}/4 coursebook pages studied</span>
      </div>
      <nav className="study-tabs" aria-label="Lesson 4 study sections">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            aria-current={tab === item ? "page" : undefined}
            onClick={() => setTab(item)}
          >
            {item}
            {item === "Words" && <span>{lessonFourWords.length}</span>}
          </button>
        ))}
      </nav>
      {tab === "Words" && (
        <section aria-labelledby="l4-words">
          <div className="study-section-heading">
            <div>
              <h2 id="l4-words">A room full of new words</h2>
              <p className="muted">
                Keep the article and the noun together. Save the ones you want
                to revisit.
              </p>
            </div>
            <label className="study-field">
              Find a word
              <input
                placeholder="German or English…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div
            className="study-chips"
            role="group"
            aria-label="Vocabulary categories"
          >
            {["All", ...new Set(lessonFourWords.map((w) => w.category))].map(
              (c) => (
                <button
                  type="button"
                  key={c}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ),
            )}
          </div>
          <div className="lesson-word-grid">
            {words.map((word) => (
              <article
                key={word.id}
                className="lesson-word"
                data-gender={
                  word.de.startsWith("der ")
                    ? "m"
                    : word.de.startsWith("das ")
                      ? "n"
                      : word.de.startsWith("die ")
                        ? "f"
                        : "plain"
                }
              >
                <div className="study-row">
                  <span className="study-tag">{word.category}</span>
                  <SaveButton
                    compact
                    item={{
                      id: `card-${word.id}`,
                      title: word.de,
                      meaning: word.en,
                      kind: "word",
                      href: `/vocabulary/${word.id}`,
                      lesson: 4,
                      audio: speech[word.de] ?? null,
                    }}
                  />
                </div>
                <h3>
                  <GermanText text={word.de} />
                </h3>
                <p>{word.en}</p>
                {word.plural && (
                  <p
                    className="lesson-word-plural"
                    lang={word.plural === "plural only" ? "en" : "de"}
                  >
                    {word.plural}
                  </p>
                )}
                <div className="study-row">
                  <LineAudio text={word.de} src={speech[word.de]} />
                  <Link href={`/vocabulary/${word.id}`}>Study card →</Link>
                </div>
                <div className="lesson-word-example">
                  <GermanText text={word.example} />
                  <LineAudio
                    text={word.example}
                    src={speech[word.example]}
                    compact
                  />
                  <p>{word.translation}</p>
                </div>
              </article>
            ))}
          </div>
          {!words.length && <p>No words match. Try another search.</p>}
        </section>
      )}
      {tab === "Grammar" && (
        <section className="lesson-concepts">
          <h2>Five patterns you can use today</h2>
          {lessonFourConcepts.map((concept, i) => (
            <article className="lesson-concept" key={concept.id}>
              <span className="lesson-concept-number">0{i + 1}</span>
              <div>
                <div className="study-row">
                  <h3>{concept.title}</h3>
                  <SaveButton
                    item={{
                      id: concept.id,
                      title: concept.de,
                      meaning: concept.en,
                      kind: "concept",
                      href: "/lessons/04",
                      lesson: 4,
                    }}
                  />
                </div>
                <p className="lesson-concept-model">
                  <GermanText text={concept.de} />
                  <LineAudio
                    text={concept.de}
                    src={speech[concept.de]}
                    compact
                  />
                </p>
                <p>{concept.en}</p>
                <div className="lesson-examples">
                  {concept.examples.map((example) => (
                    <div key={example}>
                      <GermanText text={example} />
                      <LineAudio text={example} src={speech[example]} compact />
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
      {tab === "Verbs" && (
        <section>
          <h2>Small changes, useful sentences</h2>
          <p className="muted">
            Tap any form to hear it. Notice the extra e in kostet and findet.
          </p>
          <div className="lesson-verbs">
            {lessonFourVerbs.map((verb) => (
              <article key={verb.verb}>
                <div className="study-row">
                  <h3 lang="de">{verb.verb}</h3>
                  <SaveButton
                    item={{
                      id: `verb-l4-${verb.verb}`,
                      title: verb.verb,
                      meaning: `${verb.meaning}. ${verb.tip}`,
                      kind: "concept",
                      href: "/lessons/04",
                      lesson: 4,
                    }}
                  />
                </div>
                <p>{verb.meaning}</p>
                <table>
                  <thead>
                    <tr>
                      <th>Pronoun</th>
                      <th>Form</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verb.forms.map((form, i) => (
                      <tr key={i}>
                        <td lang="de">
                          {
                            [
                              "ich",
                              "du",
                              "er / es / sie",
                              "wir",
                              "ihr",
                              "sie / Sie",
                            ][i]
                          }
                        </td>
                        <td>
                          <GermanText text={form} />
                          <LineAudio
                            text={`${["ich", "du", "er", "wir", "ihr", "sie"][i]} ${form}`}
                            compact
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="muted">{verb.tip}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      {tab === "Phrases" && (
        <section>
          <h2>A conversation in a furniture shop</h2>
          <p className="muted">
            Listen, repeat, then try saying it without the English.
          </p>
          <div className="lesson-phrases">
            {lessonFourPhrases.map(([de, en], i) => (
              <article key={de}>
                <div>
                  <h3>
                    <GermanText text={de} />
                  </h3>
                  <p>{en}</p>
                </div>
                <div className="study-row">
                  <LineAudio text={de} src={speech[de]} compact />
                  <SaveButton
                    item={{
                      id: `l4-phrase-${i}`,
                      title: de,
                      meaning: en,
                      kind: "phrase",
                      href: "/lessons/04",
                      lesson: 4,
                      audio: speech[de] ?? null,
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {tab === "Practice" && (
        <section className="lesson-quiz" aria-labelledby="l4-practice">
          <p className="study-eyebrow">Put it into practice</p>
          <h2 id="l4-practice">
            {finished
              ? "You finished this practice round."
              : `Question ${position + 1} of ${lessonFourQuiz.length}`}
          </h2>
          {finished ? (
            <>
              <p className="lesson-score">
                {correct}
                <span> / {lessonFourQuiz.length}</span>
              </p>
              <p>
                {correct === lessonFourQuiz.length
                  ? "You recalled every answer. Come back tomorrow and try again."
                  : "Use the explanations to revisit the tricky patterns, then try another round."}
              </p>
              <button
                className="study-primary"
                type="button"
                onClick={() => {
                  setPosition(0);
                  setChoice(null);
                  setCorrect(0);
                  setFinished(false);
                }}
              >
                Practise again
              </button>
            </>
          ) : (
            <>
              <progress
                max={lessonFourQuiz.length}
                value={position}
                aria-label="Practice progress"
              />
              <h3 lang="de">{exercise.q}</h3>
              <div className="lesson-quiz-options">
                {exercise.options.map((option) => (
                  <button
                    type="button"
                    key={option}
                    disabled={choice !== null}
                    data-result={
                      choice !== null && option === exercise.answer
                        ? "correct"
                        : choice === option
                          ? "wrong"
                          : undefined
                    }
                    onClick={() => {
                      setChoice(option);
                      if (option === exercise.answer)
                        setCorrect((old) => old + 1);
                    }}
                    lang="de"
                  >
                    {option}
                  </button>
                ))}
              </div>
              {choice !== null && (
                <div className="lesson-quiz-feedback" role="status">
                  <strong>
                    {choice === exercise.answer
                      ? "That’s right."
                      : `The answer is ${exercise.answer}.`}
                  </strong>
                  <p>{exercise.why}</p>
                  <button
                    type="button"
                    className="study-primary"
                    onClick={() => {
                      if (position + 1 === lessonFourQuiz.length)
                        setFinished(true);
                      else setPosition((old) => old + 1);
                      setChoice(null);
                    }}
                  >
                    {position + 1 === lessonFourQuiz.length
                      ? "See my result"
                      : "Next question →"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
      <p className="book-credit">
        Vocabulary and lesson scope: Momente A1.1, coursebook pp. 29–32 and
        Deutsch–Englisch glossary pp. 5–6, © Hueber Verlag. Explanations and
        practice are authored study aids. Audio buttons use synthesized speech;
        original recordings are in the book.
      </p>
    </div>
  );
}

export function NewChapterCards() {
  return (
    <section
      className="study-new-chapters"
      aria-labelledby="new-chapters-title"
    >
      <div className="study-section-heading">
        <div>
          <p className="study-eyebrow">Keep your German growing</p>
          <h2 id="new-chapters-title">Your book, brought to life.</h2>
          <p className="muted">
            Original pages and audio. Words you can tap. A review list you
            choose.
          </p>
        </div>
        <Link className="study-primary" href="/book">
          Open my book →
        </Link>
      </div>
      <div className="study-chapter-cards">
        {courseChapters.slice(2).map((c) => (
          <Link href={`/lessons/0${c.number}`} key={c.number}>
            <span className="study-chapter-badge">0{c.number}</span>
            <div>
              <small>
                {c.number === 4 ? "NEW LESSON" : "CONTINUE THE COURSE"}
              </small>
              <h3 lang="de">{c.title}</h3>
              <p>{c.topic}</p>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function LessonThreeBridge() {
  return (
    <div className="study-workspace">
      <Link className="study-back" href="/lessons">
        ← All lessons
      </Link>
      <header className="study-page-header">
        <div>
          <p className="study-eyebrow">Lesson 3 · Family & languages</p>
          <h1 lang="de">Das ist meine Schwester.</h1>
          <p>Talk about your family and the languages you speak.</p>
        </div>
      </header>
      <div className="study-row">
        <Link className="study-primary" href="/book?page=coursebook-19">
          Open interactive book →
        </Link>
        <Link className="study-secondary" href="/book?page=workbook-14">
          Workbook
        </Link>
        <Link className="study-secondary" href="/vocabulary?lesson=03">
          Vocabulary cards
        </Link>
      </div>
      <div className="lesson-concepts">
        {[
          [
            "Family & possession",
            "mein Vater · meine Mutter · meine Eltern",
            "Use mein for a masculine or neuter singular noun; meine for feminine singular and plural.",
          ],
          [
            "Correct a negative question",
            "Ist das nicht deine Schwester? Doch!",
            "Ja answers a positive question. Doch contradicts a negative question; nein confirms the negative.",
          ],
          [
            "Talk about languages",
            "Ich spreche Deutsch. Sprichst du Englisch?",
            "Sprechen changes e to i in du sprichst and er/sie spricht.",
          ],
        ].map(([title, de, en], i) => (
          <article className="lesson-concept" key={title}>
            <span className="lesson-concept-number">0{i + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>
                <GermanText text={de!} />
              </p>
              <p>{en}</p>
              <div className="study-row">
                <LineAudio text={de!} />
                <SaveButton
                  item={{
                    id: `l3-concept-${i}`,
                    title: de!,
                    meaning: en!,
                    kind: "concept",
                    href: "/lessons/03",
                    lesson: 3,
                  }}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
      <NewChapterCards />
    </div>
  );
}
