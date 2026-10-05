"use client";
import { LA, LArticle, LButton, LDetails, LDiv, LFooter, LForm, LH1, LH2, LH3, LHeader, LInput, LLabel, LP, LSection, LSmall, LSpan, LStrong, LSummary, LTable, LTbody, LTd, LTh, LThead, LTr } from "@/components/i18n/LocalizedElements";


import { useEffect, useId, useRef, useState } from "react";
import type { WordCard, WordForm } from "@/lib/content/word-card-types";
import { normalizeCardAnswer } from "@/lib/content/word-card-types";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import styles from "./word-cards.module.css";
import { GermanLookup, SaveButton } from "@/components/study/StudyProvider";
import { LineAudio, stopStudyAudio } from "@/components/study/StudyAudio";
import {StudyTagList} from "@/components/study/StudyScope";
import { savedWordCard } from "@/lib/study/saved-word-card";

function PatternToken({ text, card }: { text: string; card: WordCard }) {
  const forms = card.rows.flatMap(r => [r.singular, ...r.plurals]);
  const form = forms.find(f => f.text === text || f.text.replace(/^(der|die|das) /, "") === text);
  const stem = card.rows[0]!.singular.text.replace(/^(der|die|das) /, "");
  if (!form || text === stem) return <LStrong>{text}</LStrong>;
  const article = /^(der|die|das) /.exec(text)?.[0] ?? "";
  const word = text.slice(article.length);
  return <LStrong>{article && <LSpan className={styles[form.tone]}>{article}</LSpan>}{word.startsWith(stem) ? <>{stem}<LSpan className={`${styles.ending} ${styles[form.tone]}`}>{word.slice(stem.length)}</LSpan></> : <LSpan className={styles[form.tone]}>{word}</LSpan>}</LStrong>;
}
function ExampleText({ text, card }: { text: string; card: WordCard }) {
  const forms = card.rows.flatMap(row => [row.singular, ...row.plurals]);
  const parts = text.split(/([\p{L}]+(?:-[\p{L}]+)*)/u);
  return <GermanLookup text={text}>{parts.map((part, index) => {
    let matches = forms.filter(form => form.text.replace(/^(der|die|das) /, "") === part);
    const previous = parts[index - 2]?.toLocaleLowerCase("de-DE");
    // Identical forms (der/die Elektriker) need sentence context, not map insertion order.
    if (previous && ["der", "die", "das"].includes(previous)) matches = matches.filter(form => form.text.startsWith(`${previous} `));
    else if (previous && ["bin", "bist", "ist"].includes(previous)) matches = matches.filter(form => form.tone !== "plural");
    else if (previous && ["sind", "seid"].includes(previous)) matches = matches.filter(form => form.tone === "plural");
    const tones = new Set(matches.map(form => form.tone));
    const tone = tones.size === 1 ? matches[0]?.tone : undefined;
    return tone && tone !== "plain" ? <LSpan className={styles[tone]} key={index}>{part}</LSpan> : part;
  })}</GermanLookup>;
}
function Term({ form, stem }: { form: WordForm; stem: string }) {
  const match = /^(der|die|das) (.+)$/.exec(form.text);
  const word = match?.[2] ?? form.text;
  const hasEnding = stem && word.startsWith(stem) && word.length > stem.length;
  return <LDiv className={`${styles.term} ${styles[form.tone]}`}>
    <GermanLookup className={styles.word} text={form.text}>{match && <><LSpan className={styles.article}>{match[1]}</LSpan>{" "}</>}<LSpan className={styles.stem}>{hasEnding ? stem : word}</LSpan>{hasEnding && <LSpan className={styles.ending}>{word.slice(stem.length)}</LSpan>}</GermanLookup>
    <LineAudio text={form.text} src={form.audio} compact/>
  </LDiv>;
}

/** The approved engineer card, with the same teaching anatomy for every word family. */
export function WordFamilyCard({ card }: { card: WordCard }) {
  const uid = useId();
  const [mode, setMode] = useState<"learn" | "recall">("learn");
  const [promptIndex, setPromptIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "case" | "wrong" | "shown" | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (mode === "recall") inputRef.current?.focus(); }, [mode]);
  const prompt = card.prompts[promptIndex]!;
  const hasPlural = card.rows.some(row => row.plurals.length > 0);
  const stem = card.rows[0]!.singular.text.replace(/^(der|die|das) /, "");
  const formCount = card.rows.reduce((total, row) => total + 1 + row.plurals.length, 0);
  const isProfession = card.category === "Profession";
  const lessonText = card.studyTags?.lessons.length?card.studyTags.lessons.map(n=>`Lesson ${n}`).join(" · "):(card.lessons.includes("1–3")||card.lessons.includes("1-3")) ? "Lessons 1–3" : card.lessons.filter(l => /^[1234]$/.test(l)).map(l => `Lesson ${l}`).join(" · ") || (card.lessons.includes("Teacher notes") ? "Teacher extra" : "Module 1");
  const switchMode = (next: "learn" | "recall") => {
    stopStudyAudio();
    setMode(next); setFeedback(null); setAnswer("");
  };
  function checkAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim()) { inputRef.current?.focus(); return; }
    const matched = prompt.answers.find(a => normalizeCardAnswer(a) === normalizeCardAnswer(answer));
    const exact = answer.trim().replace(/\s+/g, " ") === matched;
    const distinctPronoun = matched && ["sie", "Sie", "ihr", "Ihr"].includes(matched);
    setFeedback(!matched || (distinctPronoun && !exact) ? "wrong" : exact ? "correct" : "case");
  }
  return <LDiv className={styles.cardShell} data-word-card={card.id}>
    <LHeader className={styles.toolbar}>
      <SaveButton item={savedWordCard(card)} />
      <LDiv className={styles.brand}><LSpan className={styles.brandSymbol} aria-hidden="true">w</LSpan> WORD FAMILIES</LDiv>
      <LDiv className={styles.mode} role="group" aria-label="Study mode"><LButton type="button" aria-pressed={mode === "learn"} onClick={() => switchMode("learn")}>Learn</LButton><LButton type="button" aria-pressed={mode === "recall"} onClick={() => switchMode("recall")}>Recall</LButton></LDiv>
    </LHeader>
    <LArticle className={styles.card} aria-labelledby={`${uid}-title`}>
      <LHeader className={styles.hero}>
        <LDiv className={styles.identity}><LDiv className={styles.eyebrow}>{lessonText}<LSpan className={styles.dot} />{card.category === "Profession" ? "Professions" : card.category}</LDiv><LH1 id={`${uid}-title`}>{card.title}</LH1>{card.studyTags&&<StudyTagList tags={card.studyTags}/>}<LP className={styles.subline}>{formCount > 1 ? `One word family. ${formCount === 4 ? "Four" : formCount} useful forms.` : "One meaning. Learn it, hear it, use it."}</LP></LDiv>
        {card.image ? <img className={styles.heroImage} src={withPagesBaseAssetPath(card.image.path)} alt={card.image.alt} width={265} height={204} /> : <LDiv className={styles.meaningVisual} aria-hidden="true"><LSpan>{card.category === "Number" || card.category === "Alphabet" ? card.visual : card.visual === "profession" ? "↔" : card.visual === "origin" ? "↗" : card.visual === "language" ? "“ ”" : card.visual === "family" ? "⌘" : card.visual === "action" ? "→" : "Aa"}</LSpan><LSmall>{card.category === "Number" ? "SAY THE NUMBER" : card.category === "Alphabet" ? "SPELL IT ALOUD" : card.category === "Profession" ? "ONE JOB · ALL FORMS" : card.category.toUpperCase()}</LSmall></LDiv>}
      </LHeader>
      {mode === "learn" ? <LDiv>
        <LSection className={styles.forms} aria-labelledby={`${uid}-forms`}>
          <LH2 className={styles.sectionLabel} id={`${uid}-forms`}>{formCount > 1 ? "Learn the forms together" : "Learn the word"}</LH2>
          <LTable className={`${styles.formTable} ${!hasPlural ? styles.singleColumn : ""}`}><LThead><LTr><LTh scope="col"><LSpan className={styles.genderHead}>Form</LSpan></LTh><LTh scope="col">{hasPlural ? "Singular" : "German"}{hasPlural && <LSmall>{isProfession ? "one person" : "one"}</LSmall>}</LTh>{hasPlural && <LTh scope="col" className={styles.plural}>Plural<LSmall>{isProfession ? "several people" : "more than one"}</LSmall></LTh>}</LTr></LThead><LTbody>
            {card.rows.map((row, index) => <LTr key={`${row.singular.text}-${index}`}><LTh scope="row" className={`${styles.rowLabel} ${styles[row.singular.tone]}`}>{row.label}<LSmall className={styles.rowMeaning}>{row.meaning}</LSmall></LTh><LTd><LSpan className={`${styles.mobileGender} ${styles[row.singular.tone]}`}>{row.label}</LSpan><Term form={row.singular} stem={stem} />{!hasPlural && card.rows.length > 1 && <LSmall className={styles.usage}>{row.meaning}</LSmall>}{!hasPlural && row.usage && <LSmall className={styles.usage}>{row.usage}</LSmall>}</LTd>{hasPlural && <LTd><LSpan className={`${styles.mobileGender} ${styles.plural}`}>{row.label} plural</LSpan>{row.plurals.map(form => <Term key={form.text} form={form} stem={stem} />)}{!row.plurals.length && <LSmall className={styles.usage}>{row.usage || "This expression has no plural form."}</LSmall>}</LTd>}</LTr>)}
          </LTbody></LTable>
        </LSection>
        <LSection className={styles.pattern}><LH2 className={styles.sectionLabel}>Notice<br />the pattern</LH2><LDiv><LDiv className={styles.patternLine} lang="de">{card.pattern.map((part, i) => <LSpan key={`${i}-${part}`}>{i > 0 && <LSpan className={styles.arrow}>→</LSpan>}<PatternToken text={part} card={card} /></LSpan>)}</LDiv><LSmall>{card.tip}</LSmall></LDiv></LSection>
        <LSection className={styles.example}><LH2 className={styles.sectionLabel}>Use it</LH2><LDiv>{card.examples.map(ex => <LDiv key={ex.de}><LDiv className={styles.exampleLine}><LP className={styles.germanExample} lang="de"><ExampleText text={ex.de} card={card} /></LP><LineAudio text={ex.de} src={ex.audio} compact/></LDiv><LP className={styles.englishExample}>{ex.en}</LP></LDiv>)}<LP className={styles.grammarTip}>{isProfession ? "✧ After “Ich bin”, a profession usually has no article." : card.note.split(/(?<=[.!?])\s/)[0]}</LP></LDiv></LSection>
        <LSection className={styles.recallInvite}><LDiv><LH2>Ready to remember it?</LH2><LP>Hide the German. Say it from memory.</LP></LDiv><LButton type="button" className={styles.primary} onClick={() => switchMode("recall")}>Try recall <LSpan aria-hidden="true">→</LSpan></LButton></LSection>
      </LDiv> : <LSection aria-labelledby={`${uid}-prompt`}>
        <LDiv className={styles.practice}><LDiv className={styles.practiceHeader}><LH2 className={styles.sectionLabel}>Your turn</LH2><LSpan>{promptIndex + 1} / {card.prompts.length}</LSpan></LDiv><LH3 className={styles.prompt} id={`${uid}-prompt`}>{prompt.question}</LH3><LP className={styles.promptHint}>Say it aloud, or type your answer. Include the article for a noun.</LP>
          <LForm onSubmit={checkAnswer}><LDiv className={styles.answerRow}><LLabel htmlFor={`${uid}-answer`} className={styles.srOnly}>German answer</LLabel><LInput ref={inputRef} id={`${uid}-answer`} lang="de" value={answer} onChange={e => { setAnswer(e.target.value); setFeedback(null); }} placeholder="Your German answer…" autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={feedback === "wrong"} /><LButton className={styles.primary} type="submit">Check answer</LButton></LDiv></LForm>
          <LDiv className={styles.practiceActions}>{!feedback ? <LButton type="button" className={styles.textButton} onClick={() => setFeedback("shown")}>Show answer</LButton> : <LButton type="button" className={styles.secondary} onClick={() => { setPromptIndex((promptIndex + 1) % card.prompts.length); setAnswer(""); setFeedback(null); inputRef.current?.focus(); }}>Next form →</LButton>}</LDiv>
          {feedback && <LDiv className={styles.feedback} role="status"><LStrong lang="de">{prompt.answers.join(" / ")}</LStrong><LP>{feedback === "correct" ? "You remembered it." : feedback === "case" ? "The form is right. Check the capital letters in the answer above." : feedback === "wrong" ? "Compare your answer with the article, spelling and ending above." : "Read it once, then say it with your eyes closed."} {prompt.hint}</LP></LDiv>}
        </LDiv><LP className={styles.practiceFooter}>Switch to <LStrong>Learn</LStrong> to see the forms and example together.</LP>
      </LSection>}
      <LFooter className={styles.cardFooter}><LSpan><LSpan className={styles.male}>●</LSpan> masculine &nbsp; <LSpan className={styles.female}>●</LSpan> feminine &nbsp; <LSpan className={styles.neuter}>●</LSpan> neuter &nbsp; <LSpan className={styles.plural}>●</LSpan> plural</LSpan><LSpan>Generated audio</LSpan></LFooter>
      {mode === "learn" && <LDetails className={styles.sourceDetail}><LSummary>Lesson notes &amp; sources</LSummary><LP>Momente A1.1 · Kursbuch, Arbeitsbuch and German–English glossary, © Hueber Verlag. {card.teacherRows.length > 0 && `Also in your teacher’s professions list (row ${card.teacherRows.join(", ")}).`} </LP>{card.sources.map(source => <LP key={source}>{source.startsWith("https://") ? <LA href={source} target="_blank" rel="noreferrer">Additional lexical source</LA> : source}</LP>)}<LP>{card.priorities.join(" · ")}. Core: practise actively. Context and Classroom: recognise first. Teacher extra: follow your class assignment.</LP>{card.note && <LP>{card.note}</LP>}<LP>The word forms and meanings follow your vocabulary guide. Examples and memory cues were written for these cards; they are not quotations from the book. Audio is generated preview speech; independent German language and listening review is still pending.</LP></LDetails>}
    </LArticle><LP className={styles.below}>Learn the meaning. Notice the endings. Recall the whole family.</LP>
  </LDiv>;
}
