"use client";

import "./wortwerk.css";
import "./daily.css";

import Link from "next/link";
import { useId, useState, useSyncExternalStore, type FormEvent } from "react";
import type { ContentPack, PackItem } from "../../../../packages/content/src/types/packs.js";
import type { SyncDoc } from "@/lib/wortwerk/sync-store";
import { wortwerkStore, type WortwerkStore } from "@/lib/wortwerk/store";
import { playHref } from "@/lib/wortwerk/links";
import type { PlayScope, StudySource } from "@/lib/study/scope";
import { BookDocumentReadOnlyError, requireBookDocumentsWritable, setBookDocument, confirmBookAdvance, parseBookPosition, resolveBookPosition,
  type BookAdvanceProposal, type BookPosition } from "@/lib/study/book-position";
import { bookLessons, companionScope, filterCompanionItems, lessonLoopLinks,
  type ScopeSelection, type ScopeSelectionMode } from "@/lib/wortwerk/book-companion";

const EMPTY_DOCS: readonly SyncDoc[] = [];
const SOURCES: { id: StudySource; label: string }[] = [
  { id: "course", label: "Course" }, { id: "teacher-extra", label: "Teacher extras" }, { id: "study-extra", label: "Personal extras" },
];
const touch = { minHeight: 44, minWidth: 44 };
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []; }
function toggle<T>(values: readonly T[], value: T): T[] { return values.includes(value) ? values.filter(v => v !== value) : [...values, value]; }
function selectionValue(value: unknown, book: string): ScopeSelection {
  const raw = object(value) ? value : {};
  const saved: Record<string, unknown> = object(raw.selection) ? raw.selection : { ...raw,
    mode: raw.upTo ? "position" : Array.isArray(raw.lessons) ? raw.lessons.length === 1 ? "one" : "multiple" : Array.isArray(raw.tags) && raw.tags.length ? "topics" : "position" };
  const modes: ScopeSelectionMode[] = ["position", "one", "multiple", "through", "topics", "due", "tricky"];
  return { mode: modes.includes(saved.mode as ScopeSelectionMode) ? saved.mode as ScopeSelectionMode : "position",
    book: typeof saved.book === "string" ? saved.book : book,
    lessons: Array.isArray(saved.lessons) ? saved.lessons.filter((n): n is number => Number.isSafeInteger(n) && Number(n) > 0 && Number(n) <= 10000) : [],
    tags: strings(saved.tags), sources: strings(saved.sources).filter((s): s is StudySource => SOURCES.some(source => source.id === s)),
    skills: strings(saved.skills), includeWholeCurrentLesson: saved.includeWholeCurrentLesson === true };
}
function docValue(docs: readonly SyncDoc[], key: string): unknown { return docs.find(doc => doc.key === key)?.value; }

export type ScopePickerProps = {
  pack: ContentPack; skills?: { id: string; label: string }[];
  smartSets?: { due?: readonly string[]; tricky?: readonly string[] };
  classPosition?: unknown; store?: WortwerkStore;
};

export function ScopePicker({ pack, skills = [], smartSets = {}, classPosition, store = wortwerkStore }: ScopePickerProps) {
  const id = useId();
  const docs = useSyncExternalStore(store.subscribe, () => store.getSnapshot().docs, () => EMPTY_DOCS);
  const books = [...new Set([...pack.items.map(item => item.bookRef.book), ...pack.units.flatMap(unit => unit.bookRef ? [unit.bookRef.book] : [])])].sort();
  const saved = docValue(docs, "study.scope");
  const revision = JSON.stringify(saved);
  const [draft, setDraft] = useState<{ revision: string | undefined; value: ScopeSelection } | null>(null);
  const derived = selectionValue(saved, books[0] ?? "");
  const selected = draft && draft.revision === revision ? draft.value : derived;
  const selection = books.includes(selected.book) ? selected : selectionValue(undefined, books[0] ?? "");
  const position = resolveBookPosition(docValue(docs, "study.position"), classPosition, selection.book);
  const scope = companionScope(selection, position, smartSets);
  const lessons = bookLessons(pack, selection.book);
  const positionLessons = position ? [...new Set([...lessons, position.lesson])].sort((a, b) => a - b) : lessons;
  const tags = [...new Set(pack.items.filter(item => item.bookRef.book === selection.book).flatMap(item => item.tags))].sort();
  const matching = scope ? filterCompanionItems(pack, scope) : [];
  const [message, setMessage] = useState("");

  function change(patch: Partial<ScopeSelection>, confirmedPosition = position) {
    try {
      requireBookDocumentsWritable(store, ["study.position", "study.scope"]);
      const next = { ...selection, ...patch };
      const nextScope = companionScope(next, confirmedPosition, smartSets);
      if (nextScope) {
        setBookDocument(store, "study.scope", { ...nextScope, selection: next });
        setDraft(null);
      } else setDraft({ revision, value: next });
      setMessage("");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "This selection could not be saved."); }
  }
  function savePosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      requireBookDocumentsWritable(store, ["study.position", "study.scope"]);
      const form = new FormData(event.currentTarget);
      const page = String(form.get("page") ?? "").trim();
      const next = parseBookPosition({ v: 1, book: selection.book, lesson: Number(form.get("lesson")),
        ...(page ? { page: Number(page) } : {}), lessonDone: form.get("lessonDone") === "on" });
      const nextSelection: ScopeSelection = { ...selection, mode: "position" };
      const nextScope = companionScope(nextSelection, next, smartSets);
      if (!nextScope) throw new Error("Invalid position scope");
      setBookDocument(store, "study.position", next);
      setBookDocument(store, "study.scope", { ...nextScope, selection: nextSelection });
      setDraft(null);
      setMessage(`Book position saved: Lesson ${next.lesson}${next.page === undefined ? "" : `, page ${next.page}`}.`);
    } catch (reason) { setMessage(reason instanceof BookDocumentReadOnlyError ? reason.message : "Choose a lesson and, if known, a positive printed page number."); }
  }
  const loops = position ? lessonLoopLinks(pack, position) : null;
  const positionKey = JSON.stringify([selection.book, position]);
  return <section className="ww-panel ww-scope" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}>Practise your book</h2>
    <p>Choose your place once. Earlier lessons and the pages you have reached stay in your Daily Run.</p>
    {books.length > 1 ? <label>Book<select style={touch} value={selection.book} onChange={event => change({ book: event.target.value, lessons: [] }, resolveBookPosition(docValue(docs, "study.position"), classPosition, event.target.value))}>{books.map(book => <option key={book} value={book}>{book}</option>)}</select></label> : null}
    {books.length ? <form key={positionKey} onSubmit={savePosition} className="ww-position-form">
      <fieldset><legend>Your confirmed book position</legend>
        <label>Current lesson<select name="lesson" defaultValue={position?.lesson ?? lessons[0]} style={touch} required>{positionLessons.map(lesson => <option key={lesson} value={lesson}>Lesson {lesson}</option>)}</select></label>
        <label>Printed page <span className="ww-muted">(leave blank if unknown)</span><input name="page" type="number" min="1" max="10000" step="1" defaultValue={position?.page ?? ""} style={touch} inputMode="numeric" /></label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, ...touch }}><input name="lessonDone" type="checkbox" defaultChecked={position?.lessonDone ?? false} style={touch} />I have finished this lesson</label>
        <button className="ww-button" style={touch} type="submit">Confirm book position</button>
      </fieldset>
    </form> : <p>This pack has no authored book references yet.</p>}
    <label>Practice selection<select style={touch} value={selection.mode} onChange={event => change({ mode: event.target.value as ScopeSelectionMode })}>
      <option value="position">Up to my book position</option><option value="one">One lesson</option><option value="multiple">Several lessons</option><option value="through">Up to a lesson</option><option value="topics">Topics</option>
      <option value="due">Due items</option><option value="tricky">Tricky items</option>
    </select></label>
    {selection.mode === "position" ? <label style={{ display: "flex", alignItems: "center", gap: 8, ...touch }}><input type="checkbox" checked={selection.includeWholeCurrentLesson} onChange={event => change({ includeWholeCurrentLesson: event.target.checked })} style={touch} />Include the whole current lesson</label> : null}
    {["one", "through"].includes(selection.mode) ? <label>Lesson<select style={touch} value={selection.lessons[0] ?? ""} onChange={event => change({ lessons: event.target.value ? [Number(event.target.value)] : [] })}><option value="">Choose a lesson</option>{lessons.map(lesson => <option key={lesson} value={lesson}>Lesson {lesson}</option>)}</select></label> : null}
    {selection.mode === "multiple" ? <fieldset><legend>Lessons</legend>{lessons.map(lesson => <label key={lesson} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginInlineEnd: 12, ...touch }}><input type="checkbox" checked={selection.lessons.includes(lesson)} onChange={() => change({ lessons: toggle(selection.lessons, lesson) })} style={touch} />Lesson {lesson}</label>)}</fieldset> : null}
    <fieldset><legend>Topics</legend>{tags.length ? tags.map(tag => <label key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginInlineEnd: 12, ...touch }}><input type="checkbox" checked={selection.tags.includes(tag)} onChange={() => change({ tags: toggle(selection.tags, tag) })} style={touch} />{tag}</label>) : <p>No topics are authored in this pack.</p>}</fieldset>
    <fieldset><legend>Sources</legend>{SOURCES.filter(source => pack.items.some(item => item.source === source.id || item.sourceRef?.sources.includes(source.id))).map(source => <label key={source.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginInlineEnd: 12, ...touch }}><input type="checkbox" checked={selection.sources.includes(source.id)} onChange={() => change({ sources: toggle(selection.sources, source.id) })} style={touch} />{source.label}</label>)}</fieldset>
    {skills.length ? <fieldset><legend>Skills</legend>{skills.map(skill => <label key={skill.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginInlineEnd: 12, ...touch }}><input type="checkbox" checked={selection.skills.includes(skill.id)} onChange={() => change({ skills: toggle(selection.skills, skill.id) })} style={touch} />{skill.label}</label>)}</fieldset> : null}
    <p className="ww-muted">Lesson, topic, source and skill filters combine. Unchecked groups include all choices in that group. With no known page, only earlier lessons are included. Items without a page in your current lesson stay out until you finish it or include the whole lesson.</p>
    <p role="status">{message || (scope ? `${matching.length} items in this practice selection.` : selection.mode === "position" ? "Confirm your book position to practise these pages." : "Choose a non-empty selection to start practice.")}</p>
    <div className="ww-actions"><button type="button" className="ww-button" style={touch} onClick={() => change({ mode: "position", lessons: [], tags: [], sources: [], skills: [], includeWholeCurrentLesson: false })}>Reset practice filters</button>{scope && matching.length ? <Link className="ww-button ww-button--primary" style={touch} href={playHref(scope, { pack: pack.id })}>Practise this selection</Link> : <button type="button" className="ww-button" style={touch} disabled>Practise this selection</button>}</div>
    {loops ? <nav aria-label="Lesson practice loop" className="ww-actions">{loops.preview ? <Link className="ww-button" style={touch} href={loops.preview}>Preview next lesson · 5 min</Link> : null}<Link className="ww-button" style={touch} href={loops.today}>Practise today&apos;s pages</Link><Link className="ww-button" style={touch} href={loops.boss}>Lesson boss</Link><Link className="ww-button" style={touch} href={loops.dailyRun}>Daily Run up to my position</Link></nav> : null}
    {scope ? <PrintableScope pack={pack} scope={scope} /> : null}
  </section>;
}

export function BookAdvancePrompt({ proposal, store = wortwerkStore, classPosition }: { proposal: BookAdvanceProposal; store?: WortwerkStore; classPosition?: unknown }) {
  const [state, setState] = useState<"pending" | "confirmed" | "dismissed">("pending");
  const [error, setError] = useState("");
  if (state === "dismissed") return null;
  if (state === "confirmed") return <p role="status">Book position updated.</p>;
  return <section className="ww-panel" aria-label="Confirm book position advance"><p>{proposal.message}</p><div className="ww-actions"><button type="button" className="ww-button ww-button--primary" style={touch} onClick={() => {
    try {
      const next = confirmBookAdvance(store, proposal, { classPosition });
      const saved = store.getDoc("study.scope");
      const selection = selectionValue(saved, next.book);
      if (!saved || selection.mode === "position") {
        const scope = companionScope({ ...selection, book: next.book }, next);
        if (scope) setBookDocument(store, "study.scope", { ...scope, selection: { ...selection, book: next.book } });
      }
      setState("confirmed");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Review your book position again."); }
  }}>Confirm advance</button><button type="button" className="ww-button" style={touch} onClick={() => setState("dismissed")}>Keep my position</button></div>{error ? <p role="alert">{error}</p> : null}</section>;
}

function printableText(item: PackItem): { prompt: string; answer: string } {
  if (item.type === "lexeme") return { prompt: [item.article, item.lemma].filter(Boolean).join(" "), answer: [item.meaning, ...(item.forms?.plural ?? [])].join(" · ") };
  if (item.type === "sentence") return { prompt: item.text, answer: item.translation };
  if (item.type === "grammarPoint") return { prompt: item.title, answer: item.explanation };
  if (item.type === "text") return { prompt: item.title, answer: item.body };
  if (item.type === "dialogue") return { prompt: item.turns.map(turn => `${turn.speaker}: ${turn.text}`).join("\n"), answer: "" };
  if (item.type === "examTask") return { prompt: item.section, answer: item.instructions ?? "" };
  return { prompt: typeof item.prompt === "string" ? item.prompt : item.prompt.instruction.tokens.map(token => token.type === "gap" ? token.label : token.text).join(""),
    answer: item.type === "drill" ? "" : (item.modelAnswers ?? []).join("\n") };
}

/** An isolated print document contains precisely the current shared scope. */
export function printCurrentScope(pack: ContentPack, scope: PlayScope): void {
  const frame = document.createElement("iframe");
  frame.title = "Current practice selection to print";
  frame.style.width = "0"; frame.style.height = "0"; frame.style.border = "0"; frame.style.position = "absolute";
  document.body.append(frame);
  const target = frame.contentDocument;
  if (!target) { frame.remove(); throw new Error("Printing is unavailable in this browser"); }
  target.documentElement.lang = pack.language;
  target.title = `${pack.title} — current practice selection`;
  const style = target.createElement("style");
  style.textContent = "body{font-family:system-ui,sans-serif;margin:16mm;color:var(--ink,#203536)}table{width:100%;border-collapse:collapse}th,td{border:1px solid var(--line,#e4ddd2);padding:3mm;text-align:left;vertical-align:top;overflow-wrap:break-word;hyphens:auto}tr{break-inside:avoid}caption{text-align:left;margin-bottom:4mm}h1{font-size:18pt}";
  target.head.append(style);
  const title = target.createElement("h1"); title.textContent = pack.title; target.body.append(title);
  const table = target.createElement("table");
  const items = filterCompanionItems(pack, scope);
  const caption = target.createElement("caption"); caption.textContent = `${items.length} items in the current practice selection`; table.append(caption);
  const header = target.createElement("tr");
  for (const label of ["Item", "Meaning / reference", "Book location"]) { const cell = target.createElement("th"); cell.textContent = label; header.append(cell); }
  table.append(header);
  for (const item of items) {
    const row = target.createElement("tr"); const text = printableText(item);
    for (const value of [text.prompt, text.answer, `Lesson ${item.bookRef.lesson}${item.bookRef.page === undefined ? "" : ` · page ${item.bookRef.page}`}`]) { const cell = target.createElement("td"); cell.textContent = value; row.append(cell); }
    table.append(row);
  }
  target.body.append(table);
  const cleanup = () => frame.remove();
  frame.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
  try { frame.contentWindow?.focus(); frame.contentWindow?.print(); }
  catch { cleanup(); throw new Error("Printing is unavailable in this browser"); }
  // Browsers without afterprint still release the temporary document.
  setTimeout(cleanup, 60_000);
}
export function PrintableScope({ pack, scope }: { pack: ContentPack; scope: PlayScope }) {
  const [error, setError] = useState("");
  return <div className="ww-print-selection"><button type="button" className="ww-button" style={touch} onClick={() => { try { printCurrentScope(pack, scope); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Printing is unavailable"); } }}>Print current selection</button>{error ? <p role="alert">{error}</p> : null}</div>;
}
