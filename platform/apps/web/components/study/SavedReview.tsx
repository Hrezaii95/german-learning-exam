"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { rateSavedItem } from "@/lib/study/storage";
import { GermanText, SaveButton, useStudy } from "./StudyProvider";
import { LineAudio } from "./StudyAudio";
import {BackupPanel} from "../learner-state/BackupPanel";
import {useStudyScope} from "./StudyScope";
import {savedStudyTags} from "@/lib/study/saved-tags";

export function SavedReview() {
  const study = useStudy();
  const {matches,scope}=useStudyScope();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [onlyDue, setOnlyDue] = useState(false);
  const [session, setSession] = useState<string[] | null>(null);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(()=>{setSession(null);setPosition(0);setRevealed(false);},[scope]);
  if (!study?.ready) return <p role="status">Loading your saved review…</p>;
  const items = Object.values(study.state.saved).filter(item=>matches(savedStudyTags(item,study.dictionary)));
  const due = items.filter((item) => !item.due || Date.parse(item.due) <= now);
  const visible = items
    .filter(
      (item) =>
        (kind === "all" || item.kind === kind) &&
        (!onlyDue || !item.due || Date.parse(item.due) <= now) &&
        `${item.title} ${item.meaning}`
          .toLocaleLowerCase("de")
          .includes(query.toLocaleLowerCase("de")),
    )
    .sort((a, b) => (a.savedAt ?? "").localeCompare(b.savedAt ?? ""));
  const current = session
    ? study.state.saved[session[position] ?? ""]
    : undefined;
  function advance() {
    setPosition((old) => old + 1);
    setRevealed(false);
  }
  return (
    <div className="study-workspace">
      <header className="study-page-header">
        <div>
          <p className="study-eyebrow">Your personal collection</p>
          <h1>My review</h1>
          <p className="muted">
            Choose what matters. Come back until it sticks.
          </p>
        </div>
        <Link className="study-secondary" href="/book">
          Back to the book →
        </Link>
      </header>
      <div className="study-stats">
        <div>
          <strong>{items.length}</strong>
          <span>saved items</span>
        </div>
        <div>
          <strong>{due.length}</strong>
          <span>ready to review</span>
        </div>
        <div>
          <strong>{study.state.bookmarks.length}</strong>
          <span>bookmarked pages</span>
        </div>
      </div>
      {session ? (
        <section className="study-recall">
          <div className="study-row">
            <p className="study-eyebrow">
              Recall · {Math.min(position + 1, session.length)} /{" "}
              {session.length}
            </p>
            <button
              type="button"
              className="study-secondary"
              onClick={() => setSession(null)}
            >
              End session
            </button>
          </div>
          {position >= session.length ? (
            <div className="study-recall-finish">
              <h2>A little practice, a stronger memory.</h2>
              <p>
                You worked through {session.length} items. Again brings an item
                back in 10 minutes; Remembered and Easy schedule it for a later
                day.
              </p>
              <button
                className="study-primary"
                type="button"
                onClick={() => setSession(null)}
              >
                Back to my collection
              </button>
            </div>
          ) : current ? (
            <>
              <p>Say the meaning before revealing it.</p>
              <h2>
                <GermanText text={current.title} />
              </h2>
              <LineAudio text={current.title} src={current.audio} />
              {!revealed ? (
                <button
                  className="study-primary"
                  type="button"
                  onClick={() => setRevealed(true)}
                >
                  Reveal meaning
                </button>
              ) : (
                <div className="study-recall-answer">
                  <p>{current.meaning}</p>
                  {current.note && <p>{current.note}</p>}
                  <p className="muted">How did that feel?</p>
                  <div className="study-row">
                    {(["again", "good", "easy"] as const).map((rating) => (
                      <button
                        className={
                          rating === "good"
                            ? "study-primary"
                            : "study-secondary"
                        }
                        type="button"
                        key={rating}
                        onClick={() => {
                          const saved = study.update((old) =>
                            old.saved[current.id]
                              ? {
                                  ...old,
                                  saved: {
                                    ...old.saved,
                                    [current.id]: rateSavedItem(
                                      old.saved[current.id]!,
                                      rating,
                                    ),
                                  },
                                }
                              : old,
                          );
                          if (saved) advance();
                        }}
                      >
                        {rating === "again"
                          ? "Again · 10 min"
                          : rating === "good"
                            ? "Remembered"
                            : "Easy"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p>This item was removed from your collection.</p>
              <button type="button" onClick={advance}>
                Next item
              </button>
            </>
          )}
        </section>
      ) : (
        <>
          <div className="study-review-tools">
            <label className="study-field">
              Find saved items
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your collection…"
              />
            </label>
            <label className="study-field">
              Type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="all">Everything</option>
                <option value="word">Words</option>
                <option value="concept">Concepts</option>
                <option value="phrase">Phrases</option>
                <option value="line">Book lines</option>
              </select>
            </label>
            <label className="study-check">
              <input
                type="checkbox"
                checked={onlyDue}
                onChange={(e) => setOnlyDue(e.target.checked)}
              />{" "}
              Due only
            </label>
            <button
              className="study-primary"
              type="button"
              disabled={!visible.length}
              onClick={() => {
                setSession(visible.map((item) => item.id));
                setPosition(0);
                setRevealed(false);
              }}
            >
              Review {visible.length} items →
            </button>
          </div>
          {!items.length ? (
            <section className="study-empty">
              <span aria-hidden="true">＋</span>
              <h2>Build a collection that is yours.</h2>
              <p>
                Save a word, a book line, or a grammar concept. Everything you
                choose appears here.
              </p>
              <div className="study-row">
                <Link className="study-primary" href="/lessons/04">
                  Explore Lesson 4
                </Link>
                <Link className="study-secondary" href="/vocabulary">
                  Browse word cards
                </Link>
              </div>
            </section>
          ) : !visible.length ? (
            <p className="study-empty">
              No items match these filters. Try another search or turn off Due
              only.
            </p>
          ) : (
            <div className="study-saved-grid">
              {visible.map((item) => (
                <article className="study-saved-card" key={item.id}>
                  <div className="study-row">
                    <span className="study-tag">
                      {item.kind}
                      {item.lesson ? ` · Lesson ${item.lesson}` : ""}
                    </span>
                    <SaveButton item={item} />
                  </div>
                  <h2>
                    <GermanText text={item.title} />
                  </h2>
                  <p>{item.meaning}</p>
                  <LineAudio text={item.title} src={item.audio} />
                  <label className="study-field">
                    My note
                    <textarea
                      key={`${item.id}-${item.savedAt}-${item.note ?? ""}`}
                      defaultValue={item.note ?? ""}
                      maxLength={3000}
                      placeholder="A translation, memory cue, or example…"
                      onBlur={(e) => {
                        const note = e.target.value;
                        study.update((old) =>
                          old.saved[item.id]
                            ? {
                                ...old,
                                saved: {
                                  ...old.saved,
                                  [item.id]: { ...old.saved[item.id]!, note },
                                },
                              }
                            : old,
                        );
                      }}
                    />
                  </label>
                  <div className="study-row">
                    <Link href={item.href}>Open in context →</Link>
                    <small>
                      {!item.due || Date.parse(item.due) <= now
                        ? "Ready to review"
                        : `Next: ${new Date(item.due).toLocaleDateString()}`}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <BackupPanel/>
    </div>
  );
}
