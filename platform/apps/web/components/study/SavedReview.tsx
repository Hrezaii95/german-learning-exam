"use client";
import { LArticle, LButton, LDiv, LH1, LH2, LHeader, LInput, LLabel, LOption, LP, LSection, LSelect, LSmall, LSpan, LStrong, LTextarea } from "@/components/i18n/LocalizedElements";


import Link from "@/components/i18n/LocalizedLink";
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
  useEffect(()=>{setOnlyDue(new URLSearchParams(window.location.search).get("due")==="1");},[]);
  const [session, setSession] = useState<string[] | null>(null);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(()=>{setSession(null);setPosition(0);setRevealed(false);},[scope]);
  if (!study?.ready) return <LP role="status">Loading your saved review…</LP>;
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
    <LDiv className="study-workspace">
      <LHeader className="study-page-header">
        <LDiv>
          <LP className="study-eyebrow">Your personal collection</LP>
          <LH1>My review</LH1>
          <LP className="muted">
            Your saved collection and self-rated recall. Choose what matters, then review it when due.
          </LP>
        </LDiv>
        <Link className="study-secondary" href="/book">
          Back to the book →
        </Link>
      </LHeader>
      <LP className="muted">Looking for exercises with checked answers? <Link href="/review">Open guided review</Link> or <Link href="/practice">choose free practice</Link>.</LP>
      <LDiv className="study-stats">
        <LDiv>
          <LStrong>{items.length}</LStrong>
          <LSpan>saved items</LSpan>
        </LDiv>
        <LDiv>
          <LStrong>{due.length}</LStrong>
          <LSpan>ready to review</LSpan>
        </LDiv>
        <LDiv>
          <LStrong>{study.state.bookmarks.length}</LStrong>
          <LSpan>bookmarked pages</LSpan>
        </LDiv>
      </LDiv>
      {session ? (
        <LSection className="study-recall">
          <LDiv className="study-row">
            <LP className="study-eyebrow">
              Recall · {Math.min(position + 1, session.length)} /{" "}
              {session.length}
            </LP>
            <LButton
              type="button"
              className="study-secondary"
              onClick={() => setSession(null)}
            >
              End session
            </LButton>
          </LDiv>
          {position >= session.length ? (
            <LDiv className="study-recall-finish">
              <LH2>A little practice, a stronger memory.</LH2>
              <LP>
                You worked through {session.length} items. Again brings an item
                back in 10 minutes; Remembered and Easy schedule it for a later
                day.
              </LP>
              <LButton
                className="study-primary"
                type="button"
                onClick={() => setSession(null)}
              >
                Back to my collection
              </LButton>
            </LDiv>
          ) : current ? (
            <>
              <LP>Say the meaning before revealing it.</LP>
              <LH2>
                <GermanText text={current.title} />
              </LH2>
              <LineAudio text={current.title} src={current.audio} />
              {!revealed ? (
                <LButton
                  className="study-primary"
                  type="button"
                  onClick={() => setRevealed(true)}
                >
                  Reveal meaning
                </LButton>
              ) : (
                <LDiv className="study-recall-answer">
                  <LP>{current.meaning}</LP>
                  {current.note && <LP>{current.note}</LP>}
                  <LP className="muted">How did that feel?</LP>
                  <LDiv className="study-row">
                    {(["again", "good", "easy"] as const).map((rating) => (
                      <LButton
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
                      </LButton>
                    ))}
                  </LDiv>
                </LDiv>
              )}
            </>
          ) : (
            <>
              <LP>This item was removed from your collection.</LP>
              <LButton type="button" onClick={advance}>
                Next item
              </LButton>
            </>
          )}
        </LSection>
      ) : (
        <>
          <LDiv className="study-review-tools">
            <LLabel className="study-field">
              Find saved items
              <LInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your collection…"
              />
            </LLabel>
            <LLabel className="study-field">
              Type
              <LSelect value={kind} onChange={(e) => setKind(e.target.value)}>
                <LOption value="all">Everything</LOption>
                <LOption value="word">Words</LOption>
                <LOption value="concept">Concepts</LOption>
                <LOption value="phrase">Phrases</LOption>
                <LOption value="line">Book lines</LOption>
              </LSelect>
            </LLabel>
            <LLabel className="study-check">
              <LInput
                type="checkbox"
                checked={onlyDue}
                onChange={(e) => setOnlyDue(e.target.checked)}
              />{" "}
              Due only
            </LLabel>
            <LButton
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
            </LButton>
          </LDiv>
          {!items.length ? (
            <LSection className="study-empty">
              <LSpan aria-hidden="true">＋</LSpan>
              <LH2>Build a collection that is yours.</LH2>
              <LP>
                Save a word, a book line, or a grammar concept. Everything you
                choose appears here.
              </LP>
              <LDiv className="study-row">
                <Link className="study-primary" href="/lessons/04">
                  Explore Lesson 4
                </Link>
                <Link className="study-secondary" href="/vocabulary">
                  Browse word cards
                </Link>
              </LDiv>
            </LSection>
          ) : !visible.length ? (
            <LP className="study-empty">
              No items match these filters. Try another search or turn off Due
              only.
            </LP>
          ) : (
            <LDiv className="study-saved-grid">
              {visible.map((item) => (
                <LArticle className="study-saved-card" key={item.id}>
                  <LDiv className="study-row">
                    <LSpan className="study-tag">
                      {item.kind}
                      {item.lesson ? ` · Lesson ${item.lesson}` : ""}
                    </LSpan>
                    <SaveButton item={item} />
                  </LDiv>
                  <LH2>
                    <GermanText text={item.title} />
                  </LH2>
                  <LP>{item.meaning}</LP>
                  <LineAudio text={item.title} src={item.audio} />
                  <LLabel className="study-field">
                    My note
                    <LTextarea
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
                  </LLabel>
                  <LDiv className="study-row">
                    <Link href={item.href}>Open in context →</Link>
                    <LSmall>
                      {!item.due || Date.parse(item.due) <= now
                        ? "Ready to review"
                        : `Next: ${new Date(item.due).toLocaleDateString()}`}
                    </LSmall>
                  </LDiv>
                </LArticle>
              ))}
            </LDiv>
          )}
        </>
      )}
      <BackupPanel/>
    </LDiv>
  );
}
