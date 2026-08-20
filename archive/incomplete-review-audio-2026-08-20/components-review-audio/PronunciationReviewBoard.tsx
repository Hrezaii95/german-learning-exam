"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StatusMessage,
  useAnnouncement,
} from "@/components/a11y/StatusMessage";
import { ReviewClipRow } from "@/components/review-audio/ReviewClipRow";
import {
  SOUND_CLASSES,
  soundClassById,
  type PronunciationReviewClip,
  type PronunciationReviewSummary,
  type SoundClass,
  type SoundClassId,
} from "@/lib/audio/pronunciation-review";
import {
  REVIEW_VERDICT_LABELS,
  REVIEW_VERDICT_STORAGE_KEY,
  buildReviewExport,
  clearVerdict,
  decidedCount,
  emptyVerdictBook,
  isDecided,
  parseVerdictBook,
  recordChoice,
  recordNote,
  reviewExportFilename,
  serializeVerdictBook,
  verdictFor,
  withReviewer,
  type ReviewVerdictBook,
  type ReviewVerdictChoice,
} from "@/lib/audio/review-verdicts";

/**
 * Filter key: a sound class, or the bucket for clips that were never classed.
 * `NO_CLASS` keeps its literal type so `key === NO_CLASS` narrows the rest of
 * a key back to a real `SoundClassId`.
 */
const NO_CLASS = "no-class" as const;
type FilterKey = SoundClassId | typeof NO_CLASS;

const NO_CLASS_LABEL = "No sound class noted";

/** Shared empty list, so a clip without classes still gets a stable prop. */
const EMPTY_CLASSES: readonly SoundClass[] = Object.freeze([]);

/**
 * The listening surface itself.
 *
 * Everything that changes lives here; the clips arrive already built and are
 * never modified. The two things this component owns are which clips are on
 * screen and what the listener has said about them — and the second one is
 * written to its own storage key, never to anything a learner reads.
 */
export function PronunciationReviewBoard({
  clips,
  summary,
}: {
  clips: readonly PronunciationReviewClip[];
  summary: PronunciationReviewSummary;
}) {
  const [book, setBook] = useState<ReviewVerdictBook>(emptyVerdictBook);
  const [restored, setRestored] = useState(false);
  const [storageProblem, setStorageProblem] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<readonly FilterKey[]>([]);
  const [onlyUndecided, setOnlyUndecided] = useState(false);
  const [grouped, setGrouped] = useState(true);
  const [announcement, announce] = useAnnouncement();

  const bookRef = useRef(book);
  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  /* --- this device remembers, nothing else does ------------------------- */

  useEffect(() => {
    try {
      setBook(parseVerdictBook(window.localStorage.getItem(REVIEW_VERDICT_STORAGE_KEY)));
    } catch {
      setStorageProblem(
        "This browser will not let the page read or keep notes, so nothing you write here will survive a reload.",
      );
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(
        REVIEW_VERDICT_STORAGE_KEY,
        serializeVerdictBook(book),
      );
      setStorageProblem(null);
    } catch {
      setStorageProblem(
        "The last note could not be kept on this device. Download the file before you close the tab.",
      );
    }
  }, [book, restored]);

  /* --- filtering and grouping ------------------------------------------- */

  /**
   * One stable array of sound classes per clip. Built once, because a fresh
   * array on every render would defeat `ReviewClipRow`'s memo and re-render
   * all 110 cards — and their audio elements — on each keystroke in a note.
   */
  const classesByClipId = useMemo(() => {
    const map = new Map<string, readonly SoundClass[]>();
    for (const clip of clips) {
      map.set(
        clip.id,
        Object.freeze(clip.soundClasses.map((id) => soundClassById(id))),
      );
    }
    return map;
  }, [clips]);

  const visible = useMemo(() => {
    return clips.filter((clip) => {
      if (activeFilters.length > 0) {
        const matches =
          clip.soundClasses.some((id) => activeFilters.includes(id)) ||
          (clip.soundClasses.length === 0 && activeFilters.includes(NO_CLASS));
        if (!matches) return false;
      }
      if (onlyUndecided && isDecided(book, clip.id)) return false;
      return true;
    });
  }, [clips, activeFilters, onlyUndecided, book]);

  const groups = useMemo(() => {
    const order: FilterKey[] = [...SOUND_CLASSES.map((entry) => entry.id), NO_CLASS];
    return order
      .map((key) => ({
        key,
        heading: key === NO_CLASS ? NO_CLASS_LABEL : soundClassById(key).label,
        listenFor: key === NO_CLASS ? null : soundClassById(key).listenFor,
        clips: visible.filter(
          (clip) => (clip.primaryClass ?? NO_CLASS) === key,
        ),
      }))
      .filter((group) => group.clips.length > 0);
  }, [visible]);

  const decided = decidedCount(book, clips);

  /* --- recording an opinion ---------------------------------------------- */

  const handleChoice = useCallback(
    (clip: PronunciationReviewClip, choice: ReviewVerdictChoice) => {
      const next = recordChoice(bookRef.current, {
        clipId: clip.id,
        sha256: clip.sha256,
        choice,
        decidedAt: new Date().toISOString(),
      });
      setBook(next);
      announce(
        `${REVIEW_VERDICT_LABELS[choice]} for ${clip.spokenText}. ${decidedCount(next, clips)} of ${clips.length} decided.`,
      );
    },
    [announce, clips],
  );

  const handleNote = useCallback(
    (clip: PronunciationReviewClip, note: string) => {
      setBook(
        recordNote(bookRef.current, {
          clipId: clip.id,
          sha256: clip.sha256,
          note,
          decidedAt: new Date().toISOString(),
        }),
      );
    },
    [],
  );

  const handleClear = useCallback(
    (clip: PronunciationReviewClip) => {
      const next = clearVerdict(bookRef.current, clip.id);
      setBook(next);
      announce(
        `Cleared ${clip.spokenText}. ${decidedCount(next, clips)} of ${clips.length} decided.`,
      );
    },
    [announce, clips],
  );

  function toggleFilter(key: FilterKey) {
    setActiveFilters((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key],
    );
  }

  /* --- carrying the sitting out of the room ------------------------------ */

  function downloadNotes() {
    const generatedAt = new Date().toISOString();
    const document_ = buildReviewExport({
      book: bookRef.current,
      clips,
      clipsInWholeGeneratedSet: summary.fullSetSize,
      generatedAt,
    });
    const blob = new Blob([`${JSON.stringify(document_, null, 2)}\n`], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = reviewExportFilename(generatedAt);
    document.body.append(link);
    link.click();
    link.remove();
    // Revoking in the same tick can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    announce(
      `Downloaded your notes on ${document_.rows.length} of ${clips.length} clips.`,
    );
  }

  const filterButtons: readonly {
    key: FilterKey;
    label: string;
    count: number;
  }[] = [
    ...summary.classCounts.map((entry) => ({
      key: entry.soundClass.id as FilterKey,
      label: entry.soundClass.label,
      count: entry.count,
    })),
    { key: NO_CLASS, label: NO_CLASS_LABEL, count: summary.unclassifiedCount },
  ];

  return (
    <div className="review-board">
      <section className="panel review-board__controls" aria-labelledby="review-controls-heading">
        <h2 id="review-controls-heading">Choose what to listen to</h2>

        <div className="review-board__reviewer">
          <label htmlFor="review-listener">Who is listening?</label>
          <input
            id="review-listener"
            type="text"
            autoComplete="name"
            value={book.reviewer}
            placeholder="Your name — it travels with the file you download"
            onChange={(event) =>
              setBook(withReviewer(bookRef.current, event.target.value))
            }
          />
        </div>

        <fieldset className="review-board__filters">
          <legend>Sound to focus on</legend>
          <p className="dense">
            Pick one or more. With none picked you get every clip, hardest sound
            first.
          </p>
          <div className="review-board__chips">
            {filterButtons.map((filter) => {
              const on = activeFilters.includes(filter.key);
              return (
                <button
                  key={filter.key}
                  type="button"
                  className="review-board__chip"
                  aria-pressed={on}
                  disabled={filter.count === 0}
                  data-filter={filter.key}
                  onClick={() => toggleFilter(filter.key)}
                >
                  {filter.label} ({filter.count})
                </button>
              );
            })}
            <button
              type="button"
              className="btn btn-secondary review-board__reset"
              onClick={() => setActiveFilters([])}
              disabled={activeFilters.length === 0}
            >
              Show every sound
            </button>
          </div>
        </fieldset>

        <div className="review-board__switches">
          <label className="review-board__switch">
            <input
              type="checkbox"
              checked={onlyUndecided}
              data-filter="undecided"
              onChange={(event) => setOnlyUndecided(event.target.checked)}
            />
            <span>Only the ones I have not decided yet</span>
          </label>
          <label className="review-board__switch">
            <input
              type="checkbox"
              checked={grouped}
              onChange={(event) => setGrouped(event.target.checked)}
            />
            <span>Group by sound</span>
          </label>
        </div>

        <details className="review-board__glossary">
          <summary>What each sound name means</summary>
          <dl>
            {SOUND_CLASSES.map((soundClass) => (
              <div key={soundClass.id}>
                <dt>{soundClass.label}</dt>
                <dd>{soundClass.listenFor}</dd>
              </div>
            ))}
            <div>
              <dt>{NO_CLASS_LABEL}</dt>
              <dd>
                The technical pass did not write down a sound to watch for on
                these, so listen to the whole clip.
              </dd>
            </div>
          </dl>
        </details>
      </section>

      <section className="panel review-board__progress" aria-labelledby="review-progress-heading">
        <h2 id="review-progress-heading">Where you are</h2>
        <p className="review-board__count">
          <strong>
            {restored ? decided : 0} of {clips.length}
          </strong>{" "}
          decided
          {restored ? "" : " — reading your earlier notes from this device"}
        </p>
        <progress
          className="review-board__bar"
          max={clips.length}
          value={restored ? decided : 0}
          aria-label={`Decided so far: ${restored ? decided : 0} of ${clips.length} clips`}
        />
        <p className="dense">
          Showing {visible.length} of {clips.length} clips.
        </p>
        <div className="review-board__actions">
          <button type="button" className="btn btn-primary" onClick={downloadNotes}>
            Download my notes
          </button>
        </div>
        <p className="dense">
          The download is one file holding every clip you decided on, the German
          it says, and the fingerprint of the exact recording you heard.
        </p>
        {storageProblem ? (
          <p className="review-board__warning" role="alert">
            {storageProblem}
          </p>
        ) : null}
        <StatusMessage announcement={announcement} className="review-board__spoken" />
      </section>

      {visible.length === 0 ? (
        <p className="panel review-board__empty">
          Nothing matches those choices. Clear a filter to bring clips back.
        </p>
      ) : grouped ? (
        groups.map((group) => (
          <section
            key={group.key}
            className="review-board__group"
            aria-labelledby={`group-${group.key}`}
            data-group={group.key}
          >
            <h2 id={`group-${group.key}`}>
              {group.heading} <span className="dense">({group.clips.length})</span>
            </h2>
            {group.listenFor ? <p className="lede">{group.listenFor}</p> : null}
            <ol className="review-board__list">
              {group.clips.map((clip) => (
                <ReviewClipRow
                  key={clip.id}
                  clip={clip}
                  classes={classesByClipId.get(clip.id) ?? EMPTY_CLASSES}
                  verdict={verdictFor(book, clip.id)}
                  onChoice={handleChoice}
                  onNote={handleNote}
                  onClear={handleClear}
                />
              ))}
            </ol>
          </section>
        ))
      ) : (
        <section className="review-board__group" aria-labelledby="group-all">
          <h2 id="group-all">
            Every clip <span className="dense">({visible.length})</span>
          </h2>
          <ol className="review-board__list">
            {visible.map((clip) => (
              <ReviewClipRow
                key={clip.id}
                clip={clip}
                classes={classesByClipId.get(clip.id) ?? EMPTY_CLASSES}
                verdict={verdictFor(book, clip.id)}
                onChoice={handleChoice}
                onNote={handleNote}
                onClear={handleClear}
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
