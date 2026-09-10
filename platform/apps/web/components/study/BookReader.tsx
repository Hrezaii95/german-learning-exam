"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { courseChapters } from "@/lib/study/lesson-four";
import type {
  BookLine,
  BookManifest,
  BookTrack,
  BookPage,
} from "@/lib/study/types";
import { ListeningTranscript } from "@/components/audio/ListeningTranscript";
import { GermanText, SaveButton, useStudy } from "./StudyProvider";
import { LineAudio, stopStudyAudio } from "./StudyAudio";

function OriginalTrack({ track, rate }: { track: BookTrack; rate: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
  }, [rate]);
  return (
    <div className="book-track">
      <div className="study-row">
        <strong>{track.label}</strong>
        <span className="study-tag">Original audio</span>
      </div>
      {/* The transcript is available on demand alongside the original recording. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={ref}
        src={withPagesBaseAssetPath(track.src)}
        controls
        preload="none"
        aria-label={`${track.kind} ${track.label}, original recording`}
        onError={() => setFailed(true)}
        onPlay={(event) => {
          window.dispatchEvent(new Event("study-stop-audio"));
          window.speechSynthesis?.cancel();
          document.querySelectorAll("audio").forEach((audio) => {
            if (audio !== event.currentTarget) audio.pause();
          });
          event.currentTarget.playbackRate = rate;
        }}
      />
      <ListeningTranscript transcript={track.transcript} />
      {failed && (
        <p role="alert">
          Recording could not load.{" "}
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              ref.current?.load();
            }}
          >
            Retry audio
          </button>
        </p>
      )}
    </div>
  );
}

function OriginalPage({
  page,
  zoom,
  setZoom,
  selected,
  select,
}: {
  page: BookPage;
  zoom: number;
  setZoom: (value: number) => void;
  selected: string | null;
  select: (id: string) => void;
}) {
  return (
    <section
      className="book-original"
      aria-label={`Original ${page.kind} page ${page.printedPage}`}
    >
      <div className="book-page-toolbar">
        <span>Printed page {page.printedPage}</span>
        <label>
          Zoom{" "}
          <select
            aria-label="Page zoom"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          >
            <option value={0}>Fit width</option>
            <option value={100}>100% · Readable</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
            <option value={200}>200%</option>
            <option value={250}>250%</option>
            <option value={300}>300%</option>
          </select>
        </label>
      </div>
      <div
        className="book-page-scroll"
        tabIndex={0}
        role="region"
        aria-label="Book page. Scroll to read the enlarged page."
      >
        <div
          className="book-paper"
          style={{
            width: zoom ? `${zoom}%` : "100%",
            minWidth: zoom ? `${(900 * zoom) / 100}px` : 0,
          }}
        >
          <img
            key={page.image}
            src={withPagesBaseAssetPath(page.image)}
            width={page.width}
            height={page.height}
            alt={`Momente A1 ${page.kind}, Lesson ${page.lesson}, printed page ${page.printedPage}`}
          />
          {page.lines.map((value) => (
            <button
              key={value.id}
              type="button"
              className={`book-hotspot${selected === value.id ? " is-selected" : ""}`}
              style={{
                left: `${value.box[0]}%`,
                top: `${value.box[1]}%`,
                width: `${value.box[2]}%`,
                height: `${value.box[3]}%`,
              }}
              aria-label={`Select line: ${value.text}`}
              title={value.text}
              onClick={() => select(value.id)}
            />
          ))}
        </div>
      </div>
      <p className="book-page-caption">
        © Hueber Verlag · Tap a line to study it. Scroll across on a small
        screen, or choose Fit width.
      </p>
    </section>
  );
}

export function BookReader({
  book,
  speech,
}: {
  book: BookManifest;
  speech: Record<string, string>;
}) {
  const study = useStudy();
  const params = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<"read" | "page" | "split">("page");
  const [expanded, setExpanded] = useState(false);
  const fullscreen = useRef<HTMLDialogElement>(null);
  const [rate, setRate] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showContents, setShowContents] = useState(false);
  useEffect(() => {
    if (!expanded) {
      fullscreen.current?.close();
      return;
    }
    fullscreen.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  const pageId = params.get("page") ?? study?.state.resume ?? "coursebook-29";
  const page =
    book.pages.find((p) => p.id === pageId) ??
    book.pages.find((p) => p.id === "coursebook-29")!;
  const chapter = courseChapters.find((c) => c.number === page.lesson)!;
  const chapterPages = book.pages.filter(
    (p) => p.kind === page.kind && p.lesson === page.lesson,
  );
  const allKindPages = book.pages.filter((p) => p.kind === page.kind);
  const index = allKindPages.findIndex((p) => p.id === page.id);
  const tracks = book.audio.filter((track) => page.audioIds.includes(track.id));
  const line = page.lines.find((l) => l.id === selected);
  const marked = study?.state.bookmarks.includes(page.id) ?? false;
  const done = study?.state.completedPages.includes(page.id) ?? false;
  const results = useMemo(
    () =>
      search.trim().length < 2
        ? []
        : book.pages
            .flatMap((p) =>
              p.lines
                .filter((l) =>
                  l.text
                    .toLocaleLowerCase("de")
                    .includes(search.trim().toLocaleLowerCase("de")),
                )
                .slice(0, 3)
                .map((l) => ({ page: p, line: l })),
            )
            .slice(0, 18),
    [search, book],
  );
  const update = study?.update;
  const ready = study?.ready;
  useEffect(() => {
    if (ready)
      update?.((old) =>
        old.resume === page.id ? old : { ...old, resume: page.id },
      );
    return () => stopStudyAudio();
  }, [page.id, ready, update]);
  function go(id: string) {
    stopStudyAudio();
    setSelected(null);
    router.replace(`/book?page=${encodeURIComponent(id)}`, { scroll: false });
  }
  function lineMeaning(value: BookLine) {
    const match = study?.dictionary.find(
      (entry) => entry.example === value.text || entry.de === value.text,
    );
    return match
      ? match.example === value.text
        ? match.translation
        : match.en
      : `${page.kind === "coursebook" ? "Coursebook" : "Workbook"}, page ${page.printedPage}. Recall the meaning; add your own translation in My review.`;
  }
  const renderLine = (value: BookLine) => (
    <div
      key={value.id}
      data-line-id={value.id}
      className={`book-line${selected === value.id ? " is-active" : ""}`}
    >
      <p>
        <GermanText text={value.text} />
      </p>
      <div className="book-line-actions">
        <LineAudio
          text={value.text}
          src={speech[value.text]}
          rate={rate}
          compact
        />
        <SaveButton
          compact
          item={{
            id: value.id,
            title: value.text,
            meaning: lineMeaning(value),
            kind: "line",
            href: `/book?page=${page.id}`,
            lesson: page.lesson,
            audio: speech[value.text] ?? null,
          }}
        />
      </div>
    </div>
  );
  return (
    <div className="book-workspace">
      <header className="book-header">
        <div>
          <p className="study-eyebrow">Momente A1 · Lessons 1–4</p>
          <h1>Your interactive book</h1>
          <p className="muted">Read it. Hear it. Make it yours.</p>
        </div>
        <Link className="study-secondary" href="/saved">
          My review <span>{Object.keys(study?.state.saved ?? {}).length}</span>
        </Link>
      </header>
      <div className="book-top-tools">
        <button
          type="button"
          className="study-secondary"
          aria-expanded={showContents}
          onClick={() => setShowContents(!showContents)}
        >
          ☷ Contents & search
        </button>
        <div className="study-segmented" role="group" aria-label="Book type">
          {["coursebook", "workbook"].map((kind) => (
            <button
              type="button"
              key={kind}
              aria-pressed={page.kind === kind}
              onClick={() =>
                go(`${kind}-${kind === "coursebook" ? chapter.kb : chapter.ab}`)
              }
            >
              {kind === "coursebook" ? "Coursebook" : "Workbook"}
            </button>
          ))}
        </div>
        <label className="study-inline-field">
          Lesson
          <select
            value={page.lesson}
            onChange={(e) => {
              const next = courseChapters.find(
                (c) => c.number === Number(e.target.value),
              )!;
              go(
                `${page.kind}-${page.kind === "coursebook" ? next.kb : next.ab}`,
              );
            }}
          >
            {courseChapters.map((c) => (
              <option key={c.number} value={c.number}>
                {c.number} · {c.topic}
              </option>
            ))}
          </select>
        </label>
      </div>
      {showContents && (
        <aside className="book-contents" aria-label="Book contents">
          <div>
            <label className="study-field">
              Find text in the book
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the 32 pages…"
              />
            </label>
            {search.trim().length >= 2 ? (
              <div className="book-search-results" aria-live="polite">
                {!results.length && <p>No matching lines.</p>}
                {results.map((result) => (
                  <button
                    type="button"
                    key={result.line.id}
                    onClick={() => {
                      go(result.page.id);
                      setSelected(result.line.id);
                      setSearch("");
                      setShowContents(false);
                    }}
                  >
                    <small>
                      {result.page.kind} · p. {result.page.printedPage}
                    </small>
                    <span lang="de">{result.line.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="book-chapters">
                {courseChapters.map((c) => (
                  <button
                    type="button"
                    key={c.number}
                    aria-pressed={c.number === page.lesson}
                    onClick={() => {
                      go(
                        `${page.kind}-${page.kind === "coursebook" ? c.kb : c.ab}`,
                      );
                      setShowContents(false);
                    }}
                  >
                    <b>0{c.number}</b>
                    <span>
                      <strong lang="de">{c.title}</strong>
                      <small>{c.topic}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3>Bookmarked pages</h3>
            {!study?.state.bookmarks.length && (
              <p className="muted">Use Bookmark on any page to keep it here.</p>
            )}
            {study?.state.bookmarks.map((id) => {
              const p = book.pages.find((candidate) => candidate.id === id);
              return (
                p && (
                  <button
                    type="button"
                    className="study-secondary"
                    key={id}
                    onClick={() => go(id)}
                  >
                    {p.kind === "coursebook" ? "Coursebook" : "Workbook"} ·{" "}
                    {p.printedPage}
                  </button>
                )
              );
            })}
            <p className="dense">
              {study?.state.completedPages.length ?? 0} of {book.pages.length}{" "}
              pages marked studied
            </p>
          </div>
        </aside>
      )}
      <section className="book-chapter-title">
        <div>
          <span className="book-chapter-number">0{page.lesson}</span>
          <div>
            <p className="study-eyebrow">{chapter.topic}</p>
            <h2 lang="de">{chapter.title}</h2>
          </div>
        </div>
        <Link href={`/lessons/0${page.lesson}`}>Study lesson →</Link>
      </section>
      <div className="book-reading-tools">
        <div className="study-segmented" role="group" aria-label="Reading view">
          {(["split", "page", "read"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
            >
              {mode === "split"
                ? "Page + text"
                : mode === "page"
                  ? "Original page"
                  : "Reading mode"}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="study-secondary"
          onClick={() => setExpanded(true)}
        >
          Full screen ↗
        </button>
        <label className="study-inline-field">
          Speed
          <select
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          >
            <option value={0.65}>0.65×</option>
            <option value={0.8}>0.8×</option>
            <option value={1}>1×</option>
            <option value={1.15}>1.15×</option>
          </select>
        </label>
        <button
          type="button"
          className="study-secondary"
          aria-pressed={marked}
          onClick={() =>
            study?.update((old) => ({
              ...old,
              bookmarks: marked
                ? old.bookmarks.filter((id) => id !== page.id)
                : [...old.bookmarks, page.id],
            }))
          }
        >
          {marked ? "★ Bookmarked" : "☆ Bookmark"}
        </button>
      </div>
      <div className={`book-reading-grid book-view-${view}`}>
        {view !== "read" && (
          <OriginalPage
            page={page}
            zoom={zoom}
            setZoom={setZoom}
            selected={selected}
            select={setSelected}
          />
        )}
        <section
          id="book-listening"
          className="book-text-panel"
          aria-label="Page study tools"
        >
          {tracks.length > 0 && (
            <div className="book-original-audio">
              <h3>Listen to the book</h3>
              {tracks.map((track) => (
                <OriginalTrack key={track.id} track={track} rate={rate} />
              ))}
            </div>
          )}
          {line && (
            <div className="book-selected-line">
              <div className="study-row">
                <strong>Selected line</strong>
                <button
                  className="study-icon-button"
                  type="button"
                  aria-label="Clear selected line"
                  onClick={() => setSelected(null)}
                >
                  ✕
                </button>
              </div>
              {renderLine(line)}
            </div>
          )}
          {view !== "page" ? (
            <>
              <div className="book-text-heading">
                <h3>Read & explore</h3>
                <p>
                  Tap a word for its meaning.{" "}
                  <span>Synthesized line audio</span>
                </p>
              </div>
              <div className="book-readable-lines">
                {page.lines.map(renderLine)}
              </div>
            </>
          ) : (
            !line && (
              <p className="muted">
                Select a line on the original page to hear it, look up words, or
                save it.
              </p>
            )
          )}
        </section>
      </div>
      <footer className="book-page-nav">
        <button
          type="button"
          className="study-secondary"
          disabled={index <= 0}
          onClick={() => go(allKindPages[index - 1]!.id)}
        >
          ← Previous
        </button>
        <div className="book-page-dots" aria-label="Lesson pages">
          {chapterPages.map((p) => (
            <button
              type="button"
              key={p.id}
              aria-label={`Page ${p.printedPage}`}
              aria-current={p.id === page.id ? "page" : undefined}
              onClick={() => go(p.id)}
            >
              {p.printedPage}
              {study?.state.completedPages.includes(p.id) && (
                <span aria-hidden="true"> ✓</span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="study-primary"
          disabled={index === allKindPages.length - 1}
          onClick={() => go(allKindPages[index + 1]!.id)}
        >
          Next page →
        </button>
      </footer>
      <div className="study-row book-complete">
        <button
          type="button"
          className="study-secondary"
          aria-pressed={done}
          onClick={() =>
            study?.update((old) => ({
              ...old,
              completedPages: done
                ? old.completedPages.filter((id) => id !== page.id)
                : [...old.completedPages, page.id],
            }))
          }
        >
          {done ? "✓ Page studied" : "Mark page studied"}
        </button>
        <p className="muted">
          Your place, bookmarks, and review selections are saved on this device.
        </p>
      </div>
      <dialog
        className="book-fullscreen"
        ref={fullscreen}
        aria-labelledby="fullscreen-book-title"
        onCancel={() => setExpanded(false)}
        onClose={() => setExpanded(false)}
      >
        {expanded && (
          <>
            <div className="book-fullscreen-header">
              <h2 id="fullscreen-book-title">
                {page.kind === "coursebook" ? "Coursebook" : "Workbook"} · Page{" "}
                {page.printedPage}
              </h2>
              <button
                className="study-secondary"
                type="button"
                onClick={() => setExpanded(false)}
              >
                Close full screen
              </button>
            </div>
            {line && (
              <div className="book-selected-line">{renderLine(line)}</div>
            )}
            <OriginalPage
              page={page}
              zoom={zoom}
              setZoom={setZoom}
              selected={selected}
              select={setSelected}
            />
          </>
        )}
      </dialog>
      <p className="book-credit">
        Momente A1 · © Hueber Verlag.{" "}
        <Link href="/references">Sources & credits</Link>
      </p>
    </div>
  );
}
