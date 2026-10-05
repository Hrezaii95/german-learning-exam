"use client";
import { LA, LArticle, LAside, LButton, LDialog, LDiv, LH2, LH3, LInput, LLabel, LP, LSmall, LSpan, LStrong } from "@/components/i18n/LocalizedElements";

import {StudyTagList} from "./StudyScope";
import {savedStudyTags} from "@/lib/study/saved-tags";

import Link from "@/components/i18n/LocalizedLink";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DictionaryEntry, SavedItem, StudyState } from "@/lib/study/types";
import {
  dictionaryKey,
  emptyStudy,
  parseStudy,
  STUDY_KEY,
} from "@/lib/study/storage";
import { LineAudio } from "./StudyAudio";
import { SelectionMeaning } from "./SelectionMeaning";
import { lookupEntries } from "@/lib/study/lookup";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";

type StudyContextValue = {
  state: StudyState;
  ready: boolean;
  error: string;
  update: (change: (old: StudyState) => StudyState) => boolean;
  lookup: (text: string) => void;
  dictionary: DictionaryEntry[];
};
const StudyContext = createContext<StudyContextValue | null>(null);
export const useStudy = () => useContext(StudyContext);

export function DictionaryLauncher() {
  const study = useStudy();
  if (!study) return null;
  return <LButton type="button" className="study-dictionary-launch" onClick={() => study.lookup("")} aria-label="Open dictionary">
    <LSpan aria-hidden="true">Aa</LSpan> Dictionary
  </LButton>;
}

export function StudyProvider({
  dictionary: suppliedDictionary,
  children,
}: {
  dictionary?: DictionaryEntry[];
  children: ReactNode;
}) {
  const [dictionary,setDictionary]=useState<DictionaryEntry[]>(suppliedDictionary??[]);
  const [dictionaryLoaded,setDictionaryLoaded]=useState(Boolean(suppliedDictionary));
  const [dictionaryError,setDictionaryError]=useState("");
  const [dictionaryAttempt,setDictionaryAttempt]=useState(0);
  useEffect(()=>{
    if(suppliedDictionary){setDictionary(suppliedDictionary);setDictionaryLoaded(true);return;}
    let cancelled=false;
    setDictionaryError("");
    import("../../generated/study-dictionary.json").then(data=>{if(!cancelled){setDictionary(data.default as DictionaryEntry[]);setDictionaryLoaded(true);}}).catch(()=>{if(!cancelled)setDictionaryError("The dictionary could not load. Check your connection and try again.");});
    return()=>{cancelled=true;};
  },[suppliedDictionary,dictionaryAttempt]);
  const [state, setState] = useState<StudyState>(emptyStudy);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const memory = useRef(state);
  const writable = useRef(false);
  useEffect(() => {
    try {
      const next = parseStudy(localStorage.getItem(STUDY_KEY));
      memory.current = next;
      setState(next);
      writable.current = true;
    } catch {
      setError(
        "Saved study data could not be loaded. Existing data is preserved; check your browser storage settings.",
      );
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== STUDY_KEY) return;
      try {
        const next = parseStudy(event.newValue);
        memory.current = next;
        setState(next);
        writable.current = true;
        setError("");
      } catch {
        setError(
          "Another tab saved unreadable study data. Reload before continuing.",
        );
        writable.current = false;
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const update = useCallback((change: (old: StudyState) => StudyState) => {
    if (!writable.current) {
      setError(
        "Saving is unavailable. Your existing study data has been preserved.",
      );
      return false;
    }
    try {
      // Read the latest version before changing it so another tab's saves are retained.
      const latest = parseStudy(localStorage.getItem(STUDY_KEY));
      const next = change(latest);
      localStorage.setItem(STUDY_KEY, JSON.stringify(next));
      memory.current = next;
      setState(next);
      setError("");
      return true;
    } catch {
      setError(
        "Changes could not be saved. Browser storage may be full or unavailable. Your last saved version is preserved.",
      );
      return false;
    }
  }, []);
  const lookup = useCallback((text: string) => {
    setQuery(text.trim());
    setOpen(true);
  }, []);
  useEffect(() => {
    // Existing course components keep their morphology markup. Resolve the clicked
    // text node so their German words get the same dictionary without rewriting it.
    const clickWord = (event: MouseEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        !target.closest('[lang="de"]') ||
        target.closest("button,a,input,textarea,select,audio,dialog") ||
        window.getSelection()?.toString()
      )
        return;
      const doc = document as Document & {
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null;
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
      };
      const position = doc.caretPositionFromPoint?.(
        event.clientX,
        event.clientY,
      );
      const range = position
        ? null
        : doc.caretRangeFromPoint?.(event.clientX, event.clientY);
      const node = position?.offsetNode ?? range?.startContainer;
      const offset = position?.offset ?? range?.startOffset ?? -1;
      if (!node || node.nodeType !== Node.TEXT_NODE || !target.contains(node))
        return;
      const word = [
        ...(node.textContent ?? "").matchAll(/[\p{L}]+(?:[’'-][\p{L}]+)*/gu),
      ].find(
        (match) =>
          offset >= match.index! && offset <= match.index! + match[0].length,
      );
      if (word) lookup(word[0]);
    };
    document.addEventListener("click", clickWord);
    return () => document.removeEventListener("click", clickWord);
  }, [lookup]);
  useEffect(() => {
    if (open) {
      if (!dialog.current?.open) dialog.current?.showModal();
      input.current?.focus();
    } else dialog.current?.close();
  }, [open]);
  const key = dictionaryKey(query);
  const result = lookupEntries(dictionary, query);
  const matches = result.entries;
  return (
    <StudyContext.Provider
      value={{ state, ready:ready&&dictionaryLoaded, error, update, lookup, dictionary }}
    >
      {dictionaryError&&<LAside role="alert" className="study-storage-error">{dictionaryError} <LButton type="button" onClick={()=>setDictionaryAttempt(n=>n+1)}>Retry dictionary</LButton></LAside>}
      <LP className="sr-only" id="german-lookup-help" lang="en">Use Left and Right to choose a word, Enter for its meaning, or Alt+Enter for the whole phrase.</LP>
      {children}
      <SelectionMeaning lookup={lookup} />
      {error && (
        <LP className="study-storage-error" role="alert">
          {error}
        </LP>
      )}
      <LDialog
        ref={dialog}
        className="study-dictionary"
        aria-labelledby="dictionary-title"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <LDiv className="study-dialog-head">
          <LDiv>
            <LP className="study-eyebrow">Keep your place</LP>
            <LH2 id="dictionary-title">Quick dictionary</LH2>
          </LDiv>
          <LButton
            type="button"
            className="study-icon-button"
            onClick={() => setOpen(false)}
            aria-label="Close dictionary"
          >
            ✕
          </LButton>
        </LDiv>
        <LLabel className="study-field">
          German or English · word, phrase, or sentence
          <LInput
            ref={input}
            aria-label="German or English"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try Stuhl or Das finde ich auch."
            autoComplete="off"
          />
        </LLabel>
        <LDiv aria-live="polite" className="study-dictionary-results">
          {!dictionaryLoaded&&<LP role="status">{dictionaryError||"Loading your dictionary…"}{dictionaryError&&<LButton type="button" onClick={()=>setDictionaryAttempt(n=>n+1)}>Try again</LButton>}</LP>}
          {!dictionaryLoaded ? null : !key ? (
            <LP className="muted">
              Tap a German word, or highlight a phrase or sentence and choose Meaning of selection.
            </LP>
          ) : matches.length ? (
            <>
            {!result.exact && <LP className="muted">Related study cards — choose the phrase that matches your meaning.</LP>}
            {matches.map((entry) => (
              <LArticle key={entry.id} data-lookup-kind={entry.kind ?? "word"}>
                <LP className="study-eyebrow">{entry.kind === "phrase" ? "Phrase card" : entry.kind === "sentence" ? "Sentence meaning" : "Vocabulary"}</LP>
                <LDiv className="study-row">
                  <LH3 lang="de" className={entry.displayForms?.[0] && !entry.de.includes(" / ") ? `study-tone-${entry.displayForms[0].tone}` : undefined}>{entry.de}</LH3>
                  <LineAudio text={entry.de} src={entry.audio} compact />
                </LDiv>
                <LP>{entry.en}</LP>
                {entry.studyTags&&<StudyTagList tags={entry.studyTags}/>}
                {entry.displayForms?.length ? (
                  <LDiv className="study-dictionary-forms">
                    {entry.displayForms.map((form, index) => <LDiv key={index} className={`study-dictionary-form study-tone-${form.tone}`}>
                      <LSmall>{form.label}</LSmall><LStrong lang="de">{form.text}</LStrong>
                    </LDiv>)}
                  </LDiv>
                ) : entry.forms.length > 0 && (
                  <LP className="dense" lang="de">
                    {[...new Set(entry.forms)].join(" · ")}
                  </LP>
                )}
                {entry.example && (
                  <>
                    <LP lang="de">{entry.example}</LP>
                    <LP className="muted">{entry.translation}</LP>
                  </>
                )}
                <LDiv className="study-row">
                  <SaveButton
                    item={{
                      id: entry.saveId ?? `card-${entry.id}`,
                      title: entry.de,
                      meaning: entry.en,
                      kind: entry.kind === "phrase" ? "phrase" : entry.kind === "sentence" ? "line" : "word",
                      href: entry.href,
                      audio: entry.audio,
                      ...(entry.studyTags?{studyTags:entry.studyTags}:{}),
                    }}
                  />
                  {entry.href.includes("#") ? <LA href={withPagesBaseAssetPath(entry.href.replace(/\/?#/, "/#"))} onClick={() => setOpen(false)}>{entry.href.startsWith("/cheat-sheets") ? "Open cheat sheet →" : "Open phrase card →"}</LA> : <Link href={entry.href} onClick={() => setOpen(false)}>
                    {entry.kind === "phrase" ? "Open phrase card →" : entry.href.startsWith("/book") ? "Open book page →" : entry.href.startsWith("/cheat-sheets") ? "Open cheat sheet →" : "Open study card →"}
                  </Link>}
                </LDiv>
              </LArticle>
            ))}</>
          ) : (
            <LP>
              No local definition for “{query}” yet. You can translate this selection below.
            </LP>
          )}
        </LDiv>
        {key && (
          <LDiv className="study-dictionary-footer">
            <LA href={`https://translate.google.com/?sl=de&tl=en&text=${encodeURIComponent(query)}&op=translate`}
              target="_blank" rel="noreferrer">Translate with Google ↗ (external)</LA>
            <LA
              href={`https://dict.leo.org/german-english/${encodeURIComponent(query)}`}
              target="_blank"
              rel="noreferrer"
            >
              Look up in LEO ↗
            </LA>
            <LA
              href={`https://en.wiktionary.org/wiki/${encodeURIComponent(query)}`}
              target="_blank"
              rel="noreferrer"
            >
              Wiktionary ↗
            </LA>
          </LDiv>
        )}
      </LDialog>
    </StudyContext.Provider>
  );
}

export function SaveButton({
  item,
  compact = false,
}: {
  item: SavedItem;
  compact?: boolean;
}) {
  const study = useStudy();
  if (!study) return null;
  const saved = Boolean(study.state.saved[item.id]);
  return (
    <LButton
      className={`study-save${saved ? " is-saved" : ""}`}
      type="button"
      disabled={!study.ready}
      aria-pressed={saved}
      aria-label={`${saved ? "Remove from" : "Save to"} review: ${item.title}`}
      title={saved ? "Remove from review" : "Save for review"}
      onClick={() =>
        study.update((old) => {
          const next = { ...old.saved };
          if (next[item.id]) delete next[item.id];
          else
            next[item.id] = {
              ...item,
              studyTags:savedStudyTags(item,study.dictionary),
              savedAt: new Date().toISOString(),
              due: new Date().toISOString(),
            };
          return { ...old, saved: next };
        })
      }
    >
      <LSpan aria-hidden="true">{saved ? "✓" : "+"}</LSpan>
      {!compact && (saved ? "Saved" : "Save")}
    </LButton>
  );
}

export function GermanLookup({ text, children, className = "", tabIndex = 0 }: { text: string; children?: ReactNode; className?: string | undefined; tabIndex?: number }) {
  const study = useStudy();
  return <LButton type="button" lang="de" className={`study-word ${className}`} tabIndex={tabIndex} aria-label={`Look up ${text}`}
    onClick={() => { if (!window.getSelection()?.toString().trim()) study?.lookup(text); }}>{children ?? text}</LButton>;
}

export function GermanText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const study = useStudy();
  const parts = text.split(/([\p{L}]+(?:[’'-][\p{L}]+)*)/u);
  const firstWord = parts.findIndex(part => /\p{L}/u.test(part));
  return (
    <LSpan lang="de" className={`study-german ${className}`} role="toolbar" aria-label={text} aria-describedby={study ? "german-lookup-help" : undefined}
      onKeyDown={event => {
        if (event.altKey && event.key === "Enter") { event.preventDefault(); study?.lookup(text); return; }
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const words = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(".study-word"));
        const index = words.indexOf(event.target as HTMLButtonElement);
        if (index < 0) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? words.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + words.length) % words.length;
        words.forEach((word, i) => { word.tabIndex = i === next ? 0 : -1; });
        words[next]?.focus();
      }}>
      {parts.map((part, i) =>
        /\p{L}/u.test(part) ? (
          <GermanLookup
            text={part}
            tabIndex={i === firstWord ? 0 : -1}
            key={i}
          >{part}{parts[i + 1]?.match(/^[.,!?;:…]+/u)?.[0] ?? ""}</GermanLookup>
        ) : (
          i > 0 ? part.replace(/^[.,!?;:…]+/u, "") : part
        ),
      )}
    </LSpan>
  );
}

export function MeaningButton({ text }: { text: string }) {
  const study = useStudy();
  if (!study) return null;
  return <LButton type="button" className="study-meaning-button" aria-label={`Meaning: ${text}`}
    onClick={() => study.lookup(text)}>Meaning</LButton>;
}
