"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PackItem } from "../../../../packages/content/src/types/packs.js";
import { calendarDate, shiftCalendarDate } from "../../../../packages/learning/src/wortwerk/dates.js";
import { matchesPlayScope, type PlayScope } from "@/lib/study/scope";
import type { PlayPack } from "@/lib/wortwerk/content.server";
import { playHref } from "@/lib/wortwerk/links";
import { safeSourceHref } from "@/lib/wortwerk/resources";
import { wortwerkStore, type WortwerkStore } from "@/lib/wortwerk/store";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { usePlayContent } from "./PlayProvider";
import { BackupPanel } from "./BackupPanel";

type Annotation = { v: 1; packId: string; itemId: string; word: string; note: string; examples: string[] };
type Entry = { key: string; item: PackItem; word: string; manualDifficult: boolean; misses: number; saved?: Annotation };
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function wordValue(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= 1000 && !/[\u0000-\u001f\u007f-\u009f]/u.test(value); }
function keyFor(packId: string, itemId: string, word: string): string { return JSON.stringify([packId, itemId, word.normalize("NFC").trim()]); }
function annotationKey(key: string): string { return `deck.annotation:${key}`; }
function sourceLabel(item: PackItem): string {
  if (item.type === "lexeme") return item.lemma;
  if (item.type === "sentence") return item.text;
  if ("title" in item) return item.title;
  if ("prompt" in item) return typeof item.prompt === "string" ? item.prompt : [item.prompt.instruction, item.prompt.stem].filter(Boolean).map(part => part!.tokens.map(token => token.type === "gap" ? "___" : token.text).join("")).join(" ");
  if (item.type === "dialogue") return item.turns[0]?.text ?? "Dialogue practice";
  return item.section;
}
function annotation(value: unknown): Annotation | undefined {
  return record(value) && value.v === 1 && typeof value.packId === "string" && typeof value.itemId === "string" && wordValue(value.word)
    && typeof value.note === "string" && value.note.length <= 10000 && Array.isArray(value.examples) && value.examples.length <= 10 && value.examples.every(example => typeof example === "string" && example.length <= 2000)
    ? value as Annotation : undefined;
}
export function InvestmentPanel({ store = wortwerkStore }: { store?: WortwerkStore }) { return <><PersonalDeck store={store} /><BackupPanel store={store} /></>; }
export function PersonalDeck({ store = wortwerkStore }: { store?: WortwerkStore }) {
  const content = usePlayContent();
  return content?.selectedPack ? <DeckContent key={content.selectedPack.pack.id} selected={content.selectedPack} scope={content.scope} store={store} /> : <section className="ww-panel"><h2>Personal deck</h2><p>Choose a pack to see your saved practice words.</p><Link className="ww-button" href="/play/packs">Choose a pack</Link></section>;
}
function DeckContent({ selected, scope, store }: { selected: PlayPack; scope: PlayScope; store: WortwerkStore }) {
  const state = useWortwerkState({ store });
  const [selectedId, setSelectedId] = useState("");
  const [onlyDifficult, setOnlyDifficult] = useState(false);
  const scopedItems = useMemo(() => selected.pack.items.filter(item => matchesPlayScope(item, scope)), [selected.pack, scope]);
  const byId = new Map(scopedItems.map(item => [item.id, item]));
  const entries = new Map<string, Entry>();
  const ensure = (itemId: string, word: string): Entry | undefined => {
    const item = byId.get(itemId);
    if (!item || !wordValue(word)) return undefined;
    const normalized = word.normalize("NFC").trim();
    const key = keyFor(selected.pack.id, itemId, normalized);
    const entry = entries.get(key) ?? { key, item, word: normalized, manualDifficult: false, misses: 0 };
    entries.set(key, entry); return entry;
  };
  const selfAssessed = new Set<string>();
  for (const event of [...state.snapshot.events].filter(event => event.schemaVersion === 1 && Number.isFinite(Date.parse(event.createdAt)) && Date.parse(event.createdAt) <= state.now.getTime()).sort((a, b) => a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    if (!record(event.payload)) continue;
    if (event.type === "answer" && event.payload.selfAssessed === true) selfAssessed.add(event.id);
    if (event.type !== "deck.add" && event.type !== "deck.difficult") continue;
    const payload = event.payload;
    if (payload.packId !== selected.pack.id || typeof payload.itemId !== "string" || !wordValue(payload.word)) continue;
    const entry = ensure(payload.itemId, payload.word);
    if (entry && event.type === "deck.difficult" && typeof payload.difficult === "boolean") entry.manualDifficult = payload.difficult;
  }
  for (const doc of state.snapshot.docs) {
    if (doc.schemaVersion !== 1 || !doc.key.startsWith("deck.annotation:")) continue;
    const saved = annotation(doc.value);
    if (saved?.packId !== selected.pack.id || doc.key !== annotationKey(keyFor(saved.packId, saved.itemId, saved.word))) continue;
    const entry = ensure(saved.itemId, saved.word);
    if (entry) entry.saved = saved;
  }
  const firstDate = shiftCalendarDate(calendarDate(state.now, state.timeZone), -13);
  const misses = new Map<string, number>();
  for (const answer of state.answers) {
    if (answer.packId !== selected.pack.id || answer.correct || selfAssessed.has(answer.eventId) || !byId.has(answer.itemId)
      || calendarDate(new Date(answer.createdAt), state.timeZone) < firstDate) continue;
    misses.set(answer.itemId, (misses.get(answer.itemId) ?? 0) + 1);
  }
  for (const [itemId, count] of misses) if (count >= 2) {
    const item = byId.get(itemId)!;
    const entry = ensure(itemId, sourceLabel(item).replace(/\s+/gu, " ").trim());
    if (entry) entry.misses = count;
  }
  for (const entry of entries.values()) entry.misses = misses.get(entry.item.id) ?? 0;
  const visible = [...entries.values()].filter(entry => !onlyDifficult || entry.manualDifficult || entry.misses >= 2).sort((a, b) => a.word.localeCompare(b.word, selected.language.locale));
  const available = scopedItems.filter(item => item.type === "lexeme" || item.type === "sentence");
  function add() {
    const item = byId.get(selectedId);
    if (!item) return;
    const word = sourceLabel(item);
      const alreadySaved = state.snapshot.events.some(event => event.type === "deck.add" && record(event.payload) && event.payload.packId === selected.pack.id && event.payload.itemId === item.id && event.payload.word === word);
    if (!alreadySaved) store.appendEvent("deck.add", { packId: selected.pack.id, itemId: item.id, word });
    setSelectedId("");
  }
  return <section className="ww-panel" aria-labelledby="ww-personal-deck-heading"><h2 id="ww-personal-deck-heading">Personal deck</h2><p>Save words while reading, mark an item Difficult, and keep your own notes and examples. Two missed answers in the last 14 local calendar days also add an item here.</p><label className="ww-pack-select">Add a source item<select value={selectedId} onChange={event => setSelectedId(event.target.value)}><option value="">Choose an item</option>{available.map(item => <option key={item.id} value={item.id}>{sourceLabel(item)}</option>)}</select></label><button type="button" className="ww-button" disabled={!selectedId} onClick={add}>Save to personal deck</button><label style={{ display: "flex", alignItems: "center", gap: ".5rem", minHeight: 44 }}><input type="checkbox" checked={onlyDifficult} onChange={event => setOnlyDifficult(event.target.checked)} />Show Difficult only</label><p className="ww-muted">Notes and examples are private learner data. They do not change the authored pack.</p>{visible.length ? visible.map(entry => <DeckEntry key={entry.key} entry={entry} selected={selected} scope={scope} store={store} />) : <p>No saved items match this pack and scope yet.</p>}</section>;
}
function DeckEntry({ entry, selected, scope, store }: { entry: Entry; selected: PlayPack; scope: PlayScope; store: WortwerkStore }) {
  const [noteDraft, setNoteDraft] = useState<string | undefined>();
  const [examplesDraft, setExamplesDraft] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const note = noteDraft ?? entry.saved?.note ?? "";
  const examples = examplesDraft ?? entry.saved?.examples.join("\n") ?? "";
  const href = safeSourceHref(entry.item.sourceRef?.href);
  function save() {
    const existing = store.getSnapshot().docs.find(doc => doc.key === annotationKey(entry.key));
    if (existing && (existing.schemaVersion > 1 || record(existing.value) && typeof existing.value.v === "number" && existing.value.v > 1)) { setMessage("These saved annotations need a newer app. Update before changing them."); return; }
    const values = [...new Set(examples.split(/\r?\n/u).map(value => value.trim()).filter(Boolean))];
    if (note.length > 10000 || values.length > 10 || values.some(value => value.length > 2000)) { setMessage("Use up to 10 examples, with at most 2,000 characters each, and a note up to 10,000 characters."); return; }
    store.setDoc(annotationKey(entry.key), { v: 1, packId: selected.pack.id, itemId: entry.item.id, word: entry.word, note, examples: values });
    setNoteDraft(undefined); setExamplesDraft(undefined); setMessage(store.getSnapshot().storageStatus === "persistent" ? "Notes and examples saved." : "Notes and examples saved in memory for this tab.");
  }
  return <article className="ww-preview"><h3 lang={selected.language.locale}>{entry.word}</h3>{entry.item.type === "lexeme" && entry.word === entry.item.lemma ? <p>{entry.item.meaning}</p> : <p className="ww-muted">Saved from your source item.</p>}{entry.misses >= 2 ? <p>Automatic Difficult · {entry.misses} missed answers in the last 14 days.</p> : null}<label style={{ display: "flex", alignItems: "center", gap: ".5rem", minHeight: 44 }}><input type="checkbox" checked={entry.manualDifficult} onChange={event => store.appendEvent("deck.difficult", { packId: selected.pack.id, itemId: entry.item.id, word: entry.word, difficult: event.target.checked })} />Mark Difficult: {entry.word}</label><label className="ww-pack-select">Private note for {entry.word}<textarea rows={3} maxLength={10000} value={note} onChange={event => setNoteDraft(event.target.value)} style={{ minHeight: 88, width: "100%", boxSizing: "border-box" }} /></label><label className="ww-pack-select">Own examples for {entry.word} · one per line<textarea rows={3} value={examples} onChange={event => setExamplesDraft(event.target.value)} lang={selected.language.locale} style={{ minHeight: 88, width: "100%", boxSizing: "border-box" }} /></label><div className="ww-actions"><button type="button" className="ww-button" onClick={save}>Save notes for {entry.word}</button><Link className="ww-button" href={playHref({ ...scope, items: [entry.item.id] }, { pack: selected.pack.id, mode: "free" })}>Practise {entry.word}</Link>{href ? <Link className="ww-button" href={href}>Open source card</Link> : null}</div>{message ? <p role="status">{message}</p> : null}</article>;
}
