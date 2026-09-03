"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { WordCard, WordForm } from "@/lib/content/word-card-types";
import { normalizeCardAnswer } from "@/lib/content/word-card-types";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import styles from "./word-cards.module.css";

function Speaker() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function PatternToken({ text, card }: { text: string; card: WordCard }) {
  const forms = card.rows.flatMap(r => [r.singular, ...r.plurals]);
  const form = forms.find(f => f.text === text || f.text.replace(/^(der|die|das) /, "") === text);
  const stem = card.rows[0]!.singular.text.replace(/^(der|die|das) /, "");
  if (!form || text === stem) return <strong>{text}</strong>;
  const article = /^(der|die|das) /.exec(text)?.[0] ?? "";
  const word = text.slice(article.length);
  return <strong>{article && <span className={styles[form.tone]}>{article}</span>}{word.startsWith(stem) ? <>{stem}<span className={`${styles.ending} ${styles[form.tone]}`}>{word.slice(stem.length)}</span></> : <span className={styles[form.tone]}>{word}</span>}</strong>;
}
function ExampleText({ text, card }: { text: string; card: WordCard }) {
  const words = new Map(card.rows.flatMap(r => [r.singular, ...r.plurals]).filter(f => f.tone !== "plain").map(f => [f.text.replace(/^(der|die|das) /, ""), f.tone]));
  return <>{text.split(/([\p{L}]+(?:-[\p{L}]+)*)/u).map((part, index) => words.has(part) ? <span className={styles[words.get(part)!]} key={index}>{part}</span> : part)}</>;
}
function Term({ form, stem, play, playing }: { form: WordForm; stem: string; play: (path: string, text: string) => void; playing: string | null }) {
  const match = /^(der|die|das) (.+)$/.exec(form.text);
  const word = match?.[2] ?? form.text;
  const hasEnding = stem && word.startsWith(stem) && word.length > stem.length;
  return <div className={`${styles.term} ${styles[form.tone]}`}>
    <span className={styles.word} lang="de">{match && <><span className={styles.article}>{match[1]}</span>{" "}</>}<span className={styles.stem}>{hasEnding ? stem : word}</span>{hasEnding && <span className={styles.ending}>{word.slice(stem.length)}</span>}</span>
    {form.audio && <button className={styles.listen} type="button" aria-label={`Listen: ${form.text}`} aria-pressed={playing === form.text} onClick={() => play(form.audio!, form.text)}><Speaker /></button>}
  </div>;
}

/** The approved engineer card, with the same teaching anatomy for every word family. */
export function WordFamilyCard({ card }: { card: WordCard }) {
  const uid = useId();
  const [mode, setMode] = useState<"learn" | "recall">("learn");
  const [promptIndex, setPromptIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "case" | "wrong" | "shown" | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => () => { audioRef.current?.pause(); }, []);
  useEffect(() => { if (mode === "recall") inputRef.current?.focus(); }, [mode]);
  const prompt = card.prompts[promptIndex]!;
  const hasPlural = card.rows.some(row => row.plurals.length > 0);
  const stem = card.rows[0]!.singular.text.replace(/^(der|die|das) /, "");
  const formCount = card.rows.reduce((total, row) => total + 1 + row.plurals.length, 0);
  const isProfession = card.category === "Profession";
  const lessonText = card.lessons.includes("1–3") ? "Lessons 1–3" : card.lessons.filter(l => /^[123]$/.test(l)).map(l => `Lesson ${l}`).join(" · ") || (card.lessons.includes("Teacher notes") ? "Teacher extra" : "Module 1");
  const switchMode = (next: "learn" | "recall") => {
    audioRef.current?.pause(); audioRef.current = null; setPlaying(null); setAudioStatus("");
    setMode(next); setFeedback(null); setAnswer("");
  };
  async function play(path: string, text: string) {
    audioRef.current?.pause();
    const clip = new Audio(withPagesBaseAssetPath(path));
    audioRef.current = clip; setPlaying(text); setAudioStatus(`Playing: ${text}`);
    clip.onended = () => { if (audioRef.current === clip) { setPlaying(null); setAudioStatus(""); } };
    try { await clip.play(); } catch { if (audioRef.current === clip) { setPlaying(null); setAudioStatus("Audio could not play. Please try again."); } }
  }
  function checkAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim()) { inputRef.current?.focus(); return; }
    const matched = prompt.answers.find(a => normalizeCardAnswer(a) === normalizeCardAnswer(answer));
    const exact = answer.trim().replace(/\s+/g, " ") === matched;
    const distinctPronoun = matched && ["sie", "Sie", "ihr", "Ihr"].includes(matched);
    setFeedback(!matched || (distinctPronoun && !exact) ? "wrong" : exact ? "correct" : "case");
  }
  return <div className={styles.cardShell} data-word-card={card.id}>
    <header className={styles.toolbar}>
      <div className={styles.brand}><span className={styles.brandSymbol} aria-hidden="true">w</span> WORD FAMILIES</div>
      <div className={styles.mode} role="group" aria-label="Study mode"><button type="button" aria-pressed={mode === "learn"} onClick={() => switchMode("learn")}>Learn</button><button type="button" aria-pressed={mode === "recall"} onClick={() => switchMode("recall")}>Recall</button></div>
    </header>
    <article className={styles.card} aria-labelledby={`${uid}-title`}>
      <header className={styles.hero}>
        <div className={styles.identity}><div className={styles.eyebrow}>{lessonText}<span className={styles.dot} />{card.category === "Profession" ? "Professions" : card.category}</div><h1 id={`${uid}-title`}>{card.title}</h1><p className={styles.subline}>{formCount > 1 ? `One word family. ${formCount === 4 ? "Four" : formCount} useful forms.` : "One meaning. Learn it, hear it, use it."}</p></div>
        {card.image ? <img className={styles.heroImage} src={withPagesBaseAssetPath(card.image.path)} alt={card.image.alt} width={265} height={204} /> : <div className={styles.meaningVisual} aria-hidden="true"><span>{card.category === "Number" || card.category === "Alphabet" ? card.visual : card.visual === "profession" ? "↔" : card.visual === "origin" ? "↗" : card.visual === "language" ? "“ ”" : card.visual === "family" ? "⌘" : card.visual === "action" ? "→" : "Aa"}</span><small>{card.category === "Number" ? "SAY THE NUMBER" : card.category === "Alphabet" ? "SPELL IT ALOUD" : card.category === "Profession" ? "ONE JOB · ALL FORMS" : card.category.toUpperCase()}</small></div>}
      </header>
      {mode === "learn" ? <div>
        <section className={styles.forms} aria-labelledby={`${uid}-forms`}>
          <h2 className={styles.sectionLabel} id={`${uid}-forms`}>{formCount > 1 ? "Learn the forms together" : "Learn the word"}</h2>
          <table className={`${styles.formTable} ${!hasPlural ? styles.singleColumn : ""}`}><thead><tr><th scope="col"><span className={styles.genderHead}>Form</span></th><th scope="col">{hasPlural ? "Singular" : "German"}{hasPlural && <small>{isProfession ? "one person" : "one"}</small>}</th>{hasPlural && <th scope="col" className={styles.plural}>Plural<small>{isProfession ? "several people" : "more than one"}</small></th>}</tr></thead><tbody>
            {card.rows.map((row, index) => <tr key={`${row.singular.text}-${index}`}><th scope="row" className={`${styles.rowLabel} ${styles[row.singular.tone]}`}>{row.label}<small className={styles.rowMeaning}>{row.meaning}</small></th><td><span className={`${styles.mobileGender} ${styles[row.singular.tone]}`}>{row.label}</span><Term form={row.singular} stem={stem} play={play} playing={playing} />{!hasPlural && card.rows.length > 1 && <small className={styles.usage}>{row.meaning}</small>}{!hasPlural && row.usage && <small className={styles.usage}>{row.usage}</small>}</td>{hasPlural && <td><span className={`${styles.mobileGender} ${styles.plural}`}>{row.label} plural</span>{row.plurals.map(form => <Term key={form.text} form={form} stem={stem} play={play} playing={playing} />)}{!row.plurals.length && <small className={styles.usage}>{row.usage || "This expression has no plural form."}</small>}</td>}</tr>)}
          </tbody></table>
        </section>
        <section className={styles.pattern}><h2 className={styles.sectionLabel}>Notice<br />the pattern</h2><div><div className={styles.patternLine} lang="de">{card.pattern.map((part, i) => <span key={`${i}-${part}`}>{i > 0 && <span className={styles.arrow}>→</span>}<PatternToken text={part} card={card} /></span>)}</div><small>{card.tip}</small></div></section>
        <section className={styles.example}><h2 className={styles.sectionLabel}>Use it</h2><div>{card.examples.map(ex => <div key={ex.de}><div className={styles.exampleLine}><p className={styles.germanExample} lang="de"><ExampleText text={ex.de} card={card} /></p>{ex.audio && <button type="button" className={styles.listen} aria-label={`Listen to example: ${ex.de}`} aria-pressed={playing === ex.de} onClick={() => play(ex.audio!, ex.de)}><Speaker /></button>}</div><p className={styles.englishExample}>{ex.en}</p></div>)}<p className={styles.grammarTip}>{isProfession ? "✧ After “Ich bin”, a profession usually has no article." : card.note.split(/(?<=[.!?])\s/)[0]}</p></div></section>
        <section className={styles.recallInvite}><div><h2>Ready to remember it?</h2><p>Hide the German. Say it from memory.</p></div><button type="button" className={styles.primary} onClick={() => switchMode("recall")}>Try recall <span aria-hidden="true">→</span></button></section>
      </div> : <section aria-labelledby={`${uid}-prompt`}>
        <div className={styles.practice}><div className={styles.practiceHeader}><h2 className={styles.sectionLabel}>Your turn</h2><span>{promptIndex + 1} / {card.prompts.length}</span></div><h3 className={styles.prompt} id={`${uid}-prompt`}>{prompt.question}</h3><p className={styles.promptHint}>Say it aloud, or type your answer. Include the article for a noun.</p>
          <form onSubmit={checkAnswer}><div className={styles.answerRow}><label htmlFor={`${uid}-answer`} className={styles.srOnly}>German answer</label><input ref={inputRef} id={`${uid}-answer`} lang="de" value={answer} onChange={e => { setAnswer(e.target.value); setFeedback(null); }} placeholder="Your German answer…" autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={feedback === "wrong"} /><button className={styles.primary} type="submit">Check answer</button></div></form>
          <div className={styles.practiceActions}>{!feedback ? <button type="button" className={styles.textButton} onClick={() => setFeedback("shown")}>Show answer</button> : <button type="button" className={styles.secondary} onClick={() => { setPromptIndex((promptIndex + 1) % card.prompts.length); setAnswer(""); setFeedback(null); inputRef.current?.focus(); }}>Next form →</button>}</div>
          {feedback && <div className={styles.feedback} role="status"><strong lang="de">{prompt.answers.join(" / ")}</strong><p>{feedback === "correct" ? "You remembered it." : feedback === "case" ? "The form is right. Check the capital letters in the answer above." : feedback === "wrong" ? "Compare your answer with the article, spelling and ending above." : "Read it once, then say it with your eyes closed."} {prompt.hint}</p></div>}
        </div><p className={styles.practiceFooter}>Switch to <strong>Learn</strong> to see the forms and example together.</p>
      </section>}
      <footer className={styles.cardFooter}><span><span className={styles.male}>●</span> masculine &nbsp; <span className={styles.female}>●</span> feminine &nbsp; <span className={styles.neuter}>●</span> neuter &nbsp; <span className={styles.plural}>●</span> plural</span><span>Generated audio</span></footer>
      {mode === "learn" && <details className={styles.sourceDetail}><summary>Lesson notes &amp; sources</summary><p>Momente A1.1 · Kursbuch, Arbeitsbuch and German–English glossary, © Hueber Verlag. {card.teacherRows.length > 0 && `Also in your teacher’s professions list (row ${card.teacherRows.join(", ")}).`} </p>{card.sources.map(source => <p key={source}>{source.startsWith("https://") ? <a href={source} target="_blank" rel="noreferrer">Additional lexical source</a> : source}</p>)}<p>{card.priorities.join(" · ")}. Core: practise actively. Context and Classroom: recognise first. Teacher extra: follow your class assignment.</p>{card.note && <p>{card.note}</p>}<p>The word forms and meanings follow your vocabulary guide. Examples and memory cues were written for these cards; they are not quotations from the book. Audio is generated preview speech; independent German language and listening review is still pending.</p></details>}
    </article><p className={styles.below}>Learn the meaning. Notice the endings. Recall the whole family.</p>{audioStatus && <p className={styles.status} role="status">{audioStatus}</p>}
  </div>;
}
