"use client";
import { LArticle, LButton, LDiv, LH1, LH2, LH3, LHeader, LInput, LLabel, LNav, LP, LSection, LSmall, LSpan, LStrong, LTable, LTbody, LTd, LTh, LThead, LTr } from "@/components/i18n/LocalizedElements";


import Link from "@/components/i18n/LocalizedLink";
import { useState } from "react";
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
import {useLessonSession} from "./useLessonSession";
import {LessonLearningPath} from "./LessonLearningPath";

import {useStudyScope,StudyScopeNotice} from "./StudyScope";
import {tagsForLesson} from "@/lib/study/scope";
import {appendNavigationContext} from "@/lib/content/navigation-context";

const tabs = ["Words", "Grammar", "Verbs", "Phrases", "Practice"] as const;
export function LessonFour({ speech }: { speech: Record<string, string> }) {
  const session = useLessonSession({number:4,quiz:lessonFourQuiz}, "Words");
  const {tab,position,answer:choice,score:correct} = session;
  const finished = position >= lessonFourQuiz.length;
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [wordLimit,setWordLimit]=useState(12);
  function showSection(section:typeof tabs[number]) {
    session.chooseTab(section);
    requestAnimationFrame(()=>document.querySelector(".study-tabs")?.scrollIntoView({block:"start"}));
  }
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
    <LDiv className="study-workspace">
      <StudyScopeNotice tags={tagsForLesson(4)}/>
      <Link className="study-back" href="/lessons">
        ← All lessons
      </Link>
      <LHeader className="lesson-four-hero">
        <LDiv>
          <LP className="study-eyebrow">Lesson 4 · Momente A1</LP>
          <LH1 lang="de">
            Das Bild
            <br />
            ist so schön.
          </LH1>
          <LP>Find the words for your space.</LP>
          <LP className="lesson-four-summary">
            Describe furniture, share your opinion, and ask the price. Learn
            each noun with its article, then use <LStrong>er, es, sie</LStrong>{" "}
            naturally.
          </LP>
        </LDiv>
        <LDiv role="group"
          className="lesson-room"
          aria-label="Furniture vocabulary illustration"
        >
          <LDiv className="room-picture">
            <LSpan>das Bild</LSpan>
          </LDiv>
          <LDiv className="room-lamp">
            <LSpan>die Lampe</LSpan>
          </LDiv>
          <LDiv className="room-sofa">
            <LSpan>das Sofa</LSpan>
          </LDiv>
          <LDiv className="room-rug" />
          <LDiv className="room-price">
            59 €<LSmall>das Sofa → es</LSmall>
          </LDiv>
        </LDiv>
      </LHeader>
      <LessonLearningPath lesson={4} checkpoint="Describe an object with its article, pronoun and price." learnHref="#words" practiceHref="#practice" onLearn={()=>showSection("Words")} onPractice={()=>showSection("Practice")} onContinue={()=>showSection(tab)} ready={session.ready} section={tab.toLowerCase()}/>
      <LDiv className="lesson-four-meta">
        <LSpan>{lessonFourWords.length} words & expressions</LSpan>
        <LSpan>{lessonFourConcepts.length} grammar concepts</LSpan>
        <LSpan>Original recordings & transcripts in Listen</LSpan>
        <LSpan>{complete}/4 coursebook pages marked read</LSpan>
      </LDiv>
      <LNav className="study-tabs" aria-label="Lesson 4 study sections">
        {tabs.map((item) => (
          <LButton
            key={item}
            type="button"
            aria-current={tab === item ? "page" : undefined}
            disabled={!session.ready}
            onClick={() => session.chooseTab(item)}
          >
            {item}
            {item === "Words" && <LSpan>{lessonFourWords.length}</LSpan>}
          </LButton>
        ))}
      </LNav>
      {tab === "Words" && (
        <LSection aria-labelledby="l4-words">
          <LDiv className="study-section-heading">
            <LDiv>
              <LH2 id="l4-words">A room full of new words</LH2>
              <LP className="muted">
                Keep the article and the noun together. Save the ones you want
                to revisit.
              </LP>
            </LDiv>
            <LLabel className="study-field">
              Find a word
              <LInput
                placeholder="German or English…"
                value={query}
                onChange={(e) => {setQuery(e.target.value);setWordLimit(12);}}
              />
            </LLabel>
          </LDiv>
          <LDiv
            className="study-chips"
            role="group"
            aria-label="Vocabulary categories"
          >
            {["All", ...new Set(lessonFourWords.map((w) => w.category))].map(
              (c) => (
                <LButton
                  type="button"
                  key={c}
                  aria-pressed={category === c}
                  onClick={() => {setCategory(c);setWordLimit(12);}}
                >
                  {c}
                </LButton>
              ),
            )}
          </LDiv>
          <LDiv className="lesson-word-grid">
            {words.slice(0,wordLimit).map((word) => (
              <LArticle
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
                <LDiv className="study-row">
                  <LSpan className="study-tag">{word.category}</LSpan>
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
                </LDiv>
                <LH3>
                  <GermanText text={word.de} />
                </LH3>
                <LP>{word.en}</LP>
                {word.plural && (
                  <LP
                    className="lesson-word-plural"
                    lang={word.plural === "plural only" ? "en" : "de"}
                  >
                    {word.plural}
                  </LP>
                )}
                <LDiv className="study-row">
                  <LineAudio text={word.de} src={speech[word.de]} />
                  <Link href={appendNavigationContext(`/vocabulary/${word.id}`,{entryContext:"lesson",returnPath:"/lessons/04"})}>Study card →</Link>
                </LDiv>
                <LDiv className="lesson-word-example">
                  <GermanText text={word.example} />
                  <LineAudio
                    text={word.example}
                    src={speech[word.example]}
                    compact
                  />
                  <LP>{word.translation}</LP>
                </LDiv>
              </LArticle>
            ))}
          </LDiv>
          <LDiv className="library-pagination"><LP role="status">Showing {Math.min(wordLimit,words.length)} of {words.length} words & expressions</LP>{wordLimit<words.length&&<LButton type="button" className="study-secondary" onClick={()=>setWordLimit(limit=>limit+12)}>Show more words</LButton>}</LDiv>
          {!words.length && <LP>No words match. Try another search.</LP>}
        </LSection>
      )}
      {tab === "Grammar" && (
        <LSection className="lesson-concepts">
          <LH2>Five patterns you can use today</LH2>
          {lessonFourConcepts.map((concept, i) => (
            <LArticle className="lesson-concept" key={concept.id}>
              <LSpan className="lesson-concept-number">0{i + 1}</LSpan>
              <LDiv>
                <LDiv className="study-row">
                  <LH3>{concept.title}</LH3>
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
                </LDiv>
                <LP className="lesson-concept-model">
                  <GermanText text={concept.de} />
                  <LineAudio
                    text={concept.de}
                    src={speech[concept.de]}
                    compact
                  />
                </LP>
                <LP>{concept.en}</LP>
                <LDiv className="lesson-examples">
                  {concept.examples.map((example) => (
                    <LDiv key={example}>
                      <GermanText text={example} />
                      <LineAudio text={example} src={speech[example]} compact />
                    </LDiv>
                  ))}
                </LDiv>
              </LDiv>
            </LArticle>
          ))}
        </LSection>
      )}
      {tab === "Verbs" && (
        <LSection>
          <LH2>Small changes, useful sentences</LH2>
          <LP className="muted">
            Tap any form to hear it. Notice the extra e in kostet and findet.
          </LP>
          <LDiv className="lesson-verbs">
            {lessonFourVerbs.map((verb) => (
              <LArticle key={verb.verb}>
                <LDiv className="study-row">
                  <LH3 lang="de">{verb.verb}</LH3>
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
                </LDiv>
                <LP>{verb.meaning}</LP>
                <LTable>
                  <LThead>
                    <LTr>
                      <LTh>Pronoun</LTh>
                      <LTh>Form</LTh>
                    </LTr>
                  </LThead>
                  <LTbody>
                    {verb.forms.map((form, i) => (
                      <LTr key={i}>
                        <LTd lang="de">
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
                        </LTd>
                        <LTd>
                          <GermanText text={form} />
                          <LineAudio
                            text={`${["ich", "du", "er", "wir", "ihr", "sie"][i]} ${form}`}
                            compact
                          />
                        </LTd>
                      </LTr>
                    ))}
                  </LTbody>
                </LTable>
                <LP className="muted">{verb.tip}</LP>
              </LArticle>
            ))}
          </LDiv>
        </LSection>
      )}
      {tab === "Phrases" && (
        <LSection>
          <LH2>A conversation in a furniture shop</LH2>
          <LP className="muted">
            Listen, repeat, then try saying it without the English.
          </LP>
          <LDiv className="lesson-phrases">
            {lessonFourPhrases.map(([de, en], i) => (
              <LArticle key={de}>
                <LDiv>
                  <LH3>
                    <GermanText text={de} />
                  </LH3>
                  <LP>{en}</LP>
                </LDiv>
                <LDiv className="study-row">
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
                </LDiv>
              </LArticle>
            ))}
          </LDiv>
        </LSection>
      )}
      {tab === "Practice" && (
        <LSection className="lesson-quiz" aria-labelledby="l4-practice">
          <LP className="study-eyebrow">Put it into practice</LP>
          <LH2 id="l4-practice">
            {finished
              ? "You finished this practice round."
              : `Question ${position + 1} of ${lessonFourQuiz.length}`}
          </LH2>
          {!finished && (position > 0 || choice !== null) && <LButton type="button" className="study-secondary" onClick={() => session.restart()}>Restart quiz</LButton>}
          {finished ? (
            <>
              <LP className="lesson-score">
                {correct}
                <LSpan> / {lessonFourQuiz.length}</LSpan>
              </LP>
              <LP>
                {correct === lessonFourQuiz.length
                  ? "You recalled every answer. Come back tomorrow and try again."
                  : "Use the explanations to revisit the tricky patterns, then try another round."}
              </LP>
              <LButton
                className="study-primary"
                type="button"
                onClick={() => session.restart()}
              >
                Practise again
              </LButton>
            </>
          ) : (
            <>
              <progress
                max={lessonFourQuiz.length}
                value={position}
                aria-label="Practice progress"
              />
              <LH3 lang="de">{exercise.q}</LH3>
              <LDiv className="lesson-quiz-options">
                {exercise.options.map((option) => (
                  <LButton
                    type="button"
                    key={option}
                    disabled={!session.ready || choice !== null}
                    data-result={
                      choice !== null && option === exercise.answer
                        ? "correct"
                        : choice === option
                          ? "wrong"
                          : undefined
                    }
                    onClick={() => session.chooseAnswer(option)}
                    lang="de"
                  >
                    {option}
                  </LButton>
                ))}
              </LDiv>
              {choice !== null && (
                <LDiv className="lesson-quiz-feedback" role="status">
                  <LStrong>
                    {choice === exercise.answer
                      ? "That’s right."
                      : `The answer is ${exercise.answer}.`}
                  </LStrong>
                  <LP>{exercise.why}</LP>
                  <LButton
                    type="button"
                    className="study-primary"
                    onClick={() => session.next()}
                  >
                    {position + 1 === lessonFourQuiz.length
                      ? "See my result"
                      : "Next question →"}
                  </LButton>
                </LDiv>
              )}
            </>
          )}
        </LSection>
      )}
      <LP className="book-credit">
        Vocabulary and lesson scope: Momente A1.1, coursebook pp. 29–32 and
        Deutsch–Englisch glossary pp. 5–6, © Hueber Verlag. Explanations and
        practice are authored study aids. Audio buttons use synthesized speech;
        original recordings are in the book.
      </LP>
    </LDiv>
  );
}

export function NewChapterCards() {
  const {matches}=useStudyScope();
  return (
    <LSection
      className="study-new-chapters"
      aria-labelledby="new-chapters-title"
    >
      <LDiv className="study-section-heading">
        <LDiv>
          <LP className="study-eyebrow">Keep your German growing</LP>
          <LH2 id="new-chapters-title">Your book, brought to life.</LH2>
          <LP className="muted">
            Original pages and audio. Words you can tap. A review list you
            choose.
          </LP>
        </LDiv>
        <Link className="study-primary" href="/book">
          Open my book →
        </Link>
      </LDiv>
      <LDiv className="study-chapter-cards">
        {courseChapters.slice(2).filter(c=>matches(tagsForLesson(c.number))).map((c) => (
          <Link href={`/lessons/0${c.number}`} key={c.number}>
            <LSpan className="study-chapter-badge">{String(c.number).padStart(2, "0")}</LSpan>
            <LDiv>
              <LSmall>
                {c.number === 4 ? "NEW LESSON" : "CONTINUE THE COURSE"}
              </LSmall>
              <LH3 lang="de">{c.title}</LH3>
              <LP>{c.topic}</LP>
            </LDiv>
            <LSpan aria-hidden="true">↗</LSpan>
          </Link>
        ))}
      </LDiv>
    </LSection>
  );
}

export function LessonThreeBridge() {
  return (
    <LDiv className="study-workspace">
      <Link className="study-back" href="/lessons">
        ← All lessons
      </Link>
      <LHeader className="study-page-header">
        <LDiv>
          <LP className="study-eyebrow">Lesson 3 · Family & languages</LP>
          <LH1 lang="de">Das ist meine Schwester.</LH1>
          <LP>Talk about your family and the languages you speak.</LP>
        </LDiv>
      </LHeader>
      <LDiv className="study-row">
        <Link className="study-primary" href="/book?page=coursebook-19">
          Open interactive book →
        </Link>
        <Link className="study-secondary" href="/book?page=workbook-14">
          Workbook
        </Link>
        <Link className="study-secondary" href="/vocabulary?lesson=03">
          Vocabulary cards
        </Link>
      </LDiv>
      <LDiv className="lesson-concepts">
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
          <LArticle className="lesson-concept" key={title}>
            <LSpan className="lesson-concept-number">0{i + 1}</LSpan>
            <LDiv>
              <LH2>{title}</LH2>
              <LP>
                <GermanText text={de!} />
              </LP>
              <LP>{en}</LP>
              <LDiv className="study-row">
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
              </LDiv>
            </LDiv>
          </LArticle>
        ))}
      </LDiv>
      <NewChapterCards />
    </LDiv>
  );
}
