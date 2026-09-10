"use client";

import Link from "next/link";
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

export function StudyProvider({
  dictionary,
  children,
}: {
  dictionary: DictionaryEntry[];
  children: ReactNode;
}) {
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
  const exact = dictionary.filter((entry) =>
    [entry.de, ...entry.forms].some((form) => dictionaryKey(form) === key),
  );
  const matches = (
    exact.length
      ? exact
      : dictionary.filter(
          (entry) =>
            key &&
            [entry.de, entry.en, ...entry.forms].some((form) =>
              dictionaryKey(form).includes(key),
            ),
        )
  ).slice(0, 12);
  return (
    <StudyContext.Provider
      value={{ state, ready, error, update, lookup, dictionary }}
    >
      {children}
      <button
        type="button"
        className="study-dictionary-launch"
        onClick={() => lookup("")}
        aria-label="Open dictionary"
      >
        <span aria-hidden="true">Aa</span> Dictionary
      </button>
      {error && (
        <p className="study-storage-error" role="alert">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        className="study-dictionary"
        aria-labelledby="dictionary-title"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <div className="study-dialog-head">
          <div>
            <p className="study-eyebrow">Keep your place</p>
            <h2 id="dictionary-title">Quick dictionary</h2>
          </div>
          <button
            type="button"
            className="study-icon-button"
            onClick={() => setOpen(false)}
            aria-label="Close dictionary"
          >
            ✕
          </button>
        </div>
        <label className="study-field">
          German or English
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try Stuhl, kostet, or chair"
            autoComplete="off"
          />
        </label>
        <div aria-live="polite" className="study-dictionary-results">
          {!key ? (
            <p className="muted">
              Look up a word or tap a German word as you read.
            </p>
          ) : matches.length ? (
            matches.map((entry) => (
              <article key={entry.id}>
                <div className="study-row">
                  <h3 lang="de">{entry.de}</h3>
                  <LineAudio text={entry.de} src={entry.audio} compact />
                </div>
                <p>{entry.en}</p>
                {entry.forms.length > 0 && (
                  <p className="dense" lang="de">
                    {[...new Set(entry.forms)].join(" · ")}
                  </p>
                )}
                {entry.example && (
                  <>
                    <p lang="de">{entry.example}</p>
                    <p className="muted">{entry.translation}</p>
                  </>
                )}
                <div className="study-row">
                  <SaveButton
                    item={{
                      id: `card-${entry.id}`,
                      title: entry.de,
                      meaning: entry.en,
                      kind: "word",
                      href: entry.href,
                      audio: entry.audio,
                    }}
                  />
                  <Link href={entry.href} onClick={() => setOpen(false)}>
                    Open study card →
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <p>
              No local definition for “{query}”. Try the base form, or look it
              up below.
            </p>
          )}
        </div>
        {key && (
          <div className="study-dictionary-footer">
            <a
              href={`https://dict.leo.org/german-english/${encodeURIComponent(query)}`}
              target="_blank"
              rel="noreferrer"
            >
              Look up in LEO ↗
            </a>
            <a
              href={`https://en.wiktionary.org/wiki/${encodeURIComponent(query)}`}
              target="_blank"
              rel="noreferrer"
            >
              Wiktionary ↗
            </a>
          </div>
        )}
      </dialog>
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
    <button
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
              savedAt: new Date().toISOString(),
              due: new Date().toISOString(),
            };
          return { ...old, saved: next };
        })
      }
    >
      <span aria-hidden="true">{saved ? "✓" : "+"}</span>
      {!compact && (saved ? "Saved" : "Save")}
    </button>
  );
}

export function GermanText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const study = useStudy();
  return (
    <span lang="de" className={`study-german ${className}`}>
      {text.split(/([\p{L}]+(?:[’'-][\p{L}]+)*)/u).map((part, i) =>
        /\p{L}/u.test(part) ? (
          <button
            type="button"
            className="study-word"
            key={i}
            onClick={() => study?.lookup(part)}
            aria-label={`Look up ${part}`}
          >
            {part}
          </button>
        ) : (
          part
        ),
      )}
    </span>
  );
}
