"use client";
import { LButton, LDd, LDetails, LDiv, LDl, LDt, LFieldset, LH2, LInput, LLabel, LLegend, LOl, LP, LSection, LSpan, LStrong, LSummary } from "@/components/i18n/LocalizedElements";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StatusMessage,
  useAnnouncement,
} from "@/components/a11y/StatusMessage";
import { ReviewClipRow } from "@/components/review-audio/ReviewClipRow";
import {
  PRONUNCIATION_RISK_TAGS,
  riskTagById,
  type PronunciationReviewClip,
  type PronunciationReviewSummary,
  type PronunciationRiskTag,
  type PronunciationRiskTagId,
} from "@/lib/audio/pronunciation-review";
import {
  REVIEW_VERDICT_LABELS,
  REVIEW_VERDICT_STORAGE_KEY,
  buildReviewExport,
  clearVerdict,
  emptyVerdictBook,
  isReviewed,
  parseVerdictBook,
  recordNote,
  recordVerdict,
  reviewExportFilename,
  reviewedCount,
  serializeVerdictBook,
  verdictFor,
  withReviewer,
  type ReviewVerdict,
  type ReviewVerdictBook,
} from "@/lib/audio/review-verdicts";

/**
 * Filter key: a risk tag, or the bucket for clips the audit never flagged.
 * `NO_TAG` keeps its literal type so `key === NO_TAG` narrows the rest of a key
 * back to a real `PronunciationRiskTagId`.
 */
const NO_TAG = "no-tag" as const;
type FilterKey = PronunciationRiskTagId | typeof NO_TAG;

const NO_TAG_LABEL = "No sound flagged";

/** Shared empty list, so a clip without tags still gets a stable prop. */
const EMPTY_TAGS: readonly PronunciationRiskTag[] = Object.freeze([]);

/**
 * The listening surface itself.
 *
 * Everything that changes lives here; the clips arrive already built and are
 * never modified. The two things this component owns are which clips are on
 * screen and what the listener has said about them — and the second is written
 * to its own storage key, never to anything a learner reads.
 *
 * No Node builtin can be reached from this file's import graph, and that is
 * load-bearing rather than incidental: the first attempt at this page imported
 * the manifest reader for its constants and broke the static export outright.
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
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false);
  const [grouped, setGrouped] = useState(true);
  const [announcement, announce] = useAnnouncement();

  const bookRef = useRef(book);
  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  /* --- this device remembers, nothing else does ------------------------- */

  useEffect(() => {
    try {
      setBook(
        parseVerdictBook(window.localStorage.getItem(REVIEW_VERDICT_STORAGE_KEY)),
      );
    } catch {
      setStorageProblem(
        "This browser will not let the page read or keep notes, so nothing written here will survive a reload.",
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
        "The last note could not be kept on this device. Download the file before closing the tab.",
      );
    }
  }, [book, restored]);

  /* --- filtering and grouping ------------------------------------------- */

  /**
   * One stable array of risk tags per clip. Built once, because a fresh array
   * on every render would defeat `ReviewClipRow`'s memo and re-render all 110
   * cards — and their audio elements — on each keystroke in a note.
   */
  const tagsByClipId = useMemo(() => {
    const map = new Map<string, readonly PronunciationRiskTag[]>();
    for (const clip of clips) {
      map.set(
        clip.id,
        Object.freeze(clip.riskTags.map((id) => riskTagById(id))),
      );
    }
    return map;
  }, [clips]);

  const visible = useMemo(() => {
    return clips.filter((clip) => {
      if (activeFilters.length > 0) {
        const matches =
          clip.riskTags.some((id) => activeFilters.includes(id)) ||
          (clip.riskTags.length === 0 && activeFilters.includes(NO_TAG));
        if (!matches) return false;
      }
      if (onlyUnreviewed && isReviewed(book, clip.id)) return false;
      return true;
    });
  }, [clips, activeFilters, onlyUnreviewed, book]);

  const groups = useMemo(() => {
    const order: FilterKey[] = [
      ...PRONUNCIATION_RISK_TAGS.map((entry) => entry.id),
      NO_TAG,
    ];
    return order
      .map((key) => ({
        key,
        heading: key === NO_TAG ? NO_TAG_LABEL : riskTagById(key).label,
        listenFor: key === NO_TAG ? null : riskTagById(key).listenFor,
        clips: visible.filter((clip) => (clip.primaryRiskTag ?? NO_TAG) === key),
      }))
      .filter((group) => group.clips.length > 0);
  }, [visible]);

  const reviewed = reviewedCount(book, clips);

  /* --- recording an opinion ---------------------------------------------- */

  const handleVerdict = useCallback(
    (clip: PronunciationReviewClip, verdict: ReviewVerdict) => {
      const next = recordVerdict(bookRef.current, {
        clipId: clip.id,
        sha256: clip.sha256,
        verdict,
        recordedAt: new Date().toISOString(),
      });
      setBook(next);
      announce(
        `${REVIEW_VERDICT_LABELS[verdict]} for ${clip.spokenText}. ${reviewedCount(next, clips)} of ${clips.length} reviewed.`,
      );
    },
    [announce, clips],
  );

  const handleNote = useCallback((clip: PronunciationReviewClip, note: string) => {
    setBook(
      recordNote(bookRef.current, {
        clipId: clip.id,
        sha256: clip.sha256,
        note,
        recordedAt: new Date().toISOString(),
      }),
    );
  }, []);

  const handleClear = useCallback(
    (clip: PronunciationReviewClip) => {
      const next = clearVerdict(bookRef.current, clip.id);
      setBook(next);
      announce(
        `Cleared ${clip.spokenText}. ${reviewedCount(next, clips)} of ${clips.length} reviewed.`,
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
    const notes = buildReviewExport({
      book: bookRef.current,
      clips,
      clipsInWholeGeneratedSet: summary.fullSetSize,
      generatedAt,
    });
    const blob = new Blob([`${JSON.stringify(notes, null, 2)}\n`], {
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
      `Downloaded notes on ${notes.rows.length} of ${clips.length} clips.`,
    );
  }

  const filterButtons: readonly {
    key: FilterKey;
    label: string;
    count: number;
  }[] = [
    ...summary.tagCounts.map((entry) => ({
      key: entry.riskTag.id as FilterKey,
      label: entry.riskTag.label,
      count: entry.count,
    })),
    { key: NO_TAG, label: NO_TAG_LABEL, count: summary.untaggedCount },
  ];

  return (
    <LDiv className="review-board">
      {/* Two real columns on a wide screen: the controls and the running count
          on the left, the clips on the right. The wrapper is what makes the
          left column sticky correctly — a sticky grid item whose row is only
          as tall as itself has no range to travel, so without this the panel
          would scroll away with the first clip. */}
      <LDiv className="review-board__aside">
        <LSection
          className="panel review-board__controls"
          aria-labelledby="review-controls-heading"
        >
          <LH2 id="review-controls-heading">Choose what to listen to</LH2>

          <LDiv className="review-board__reviewer">
            <LLabel htmlFor="review-listener">Who is listening?</LLabel>
            <LInput
              id="review-listener"
              type="text"
              autoComplete="name"
              value={book.reviewer}
              placeholder="Your name — it travels with the file you download"
              onChange={(event) =>
                setBook(withReviewer(bookRef.current, event.target.value))
              }
            />
          </LDiv>

          <LFieldset className="review-board__filters">
            <LLegend>Sound to focus on</LLegend>
            <LP className="dense">
              Pick one or more. With none picked you get every clip, hardest sound
              first.
            </LP>
            <LDiv className="review-board__chips">
              {filterButtons.map((filter) => {
                const on = activeFilters.includes(filter.key);
                return (
                  <LButton
                    key={filter.key}
                    type="button"
                    className="review-board__chip"
                    aria-pressed={on}
                    disabled={filter.count === 0}
                    data-filter={filter.key}
                    onClick={() => toggleFilter(filter.key)}
                  >
                    {/* Two spans with a real space between them: the count is
                        pushed to the right edge for scanning, while the spoken
                        name stays "German r (72)" instead of running together. */}
                    <LSpan className="review-board__chip-label">
                      {filter.label}
                    </LSpan>{" "}
                    <LSpan className="review-board__chip-count">
                      ({filter.count})
                    </LSpan>
                  </LButton>
                );
              })}
              <LButton
                type="button"
                className="btn btn-secondary review-board__reset"
                onClick={() => setActiveFilters([])}
                disabled={activeFilters.length === 0}
              >
                Show every sound
              </LButton>
            </LDiv>
          </LFieldset>

          <LDiv className="review-board__switches">
            <LLabel className="review-board__switch">
              <LInput
                type="checkbox"
                checked={onlyUnreviewed}
                data-filter="unreviewed"
                onChange={(event) => setOnlyUnreviewed(event.target.checked)}
              />
              <LSpan>Only the ones I have not reviewed yet</LSpan>
            </LLabel>
            <LLabel className="review-board__switch">
              <LInput
                type="checkbox"
                checked={grouped}
                data-filter="grouped"
                onChange={(event) => setGrouped(event.target.checked)}
              />
              <LSpan>Group by sound</LSpan>
            </LLabel>
          </LDiv>

          <LDetails className="review-board__glossary">
            <LSummary>What each sound name means</LSummary>
            <LDl>
              {PRONUNCIATION_RISK_TAGS.map((tag) => (
                <LDiv key={tag.id}>
                  <LDt>{tag.label}</LDt>
                  <LDd>{tag.listenFor}</LDd>
                </LDiv>
              ))}
              <LDiv>
                <LDt>{NO_TAG_LABEL}</LDt>
                <LDd>
                  The technical pass did not write down a sound to watch for on
                  these, so listen to the whole clip.
                </LDd>
              </LDiv>
            </LDl>
          </LDetails>
        </LSection>

        <LSection
          className="panel review-board__progress"
          aria-labelledby="review-progress-heading"
        >
          <LH2 id="review-progress-heading">Where you are</LH2>
          <LP className="review-board__count" data-reviewed-count={reviewed}>
            <LStrong>
              {restored ? reviewed : 0} of {clips.length}
            </LStrong>{" "}
            reviewed
            {restored ? "" : " — reading your earlier notes from this device"}
          </LP>
          <progress
            className="review-board__bar"
            max={clips.length}
            value={restored ? reviewed : 0}
            aria-label={`Reviewed so far: ${restored ? reviewed : 0} of ${clips.length} clips`}
          />
          <LP className="dense" data-visible-count={visible.length}>
            Showing {visible.length} of {clips.length} clips.
          </LP>
          <LDiv className="review-board__actions">
            <LButton
              type="button"
              className="btn btn-primary"
              onClick={downloadNotes}
            >
              Download my notes
            </LButton>
          </LDiv>
          <LP className="dense">
            The download is one file holding every clip you judged, the German it
            says, and the fingerprint of the exact recording you heard.
          </LP>
          {storageProblem ? (
            <LP className="review-board__warning" role="alert">
              {storageProblem}
            </LP>
          ) : null}
          <StatusMessage
            announcement={announcement}
            className="review-board__spoken"
          />
        </LSection>
      </LDiv>

      <LDiv className="review-board__stream">
        {visible.length === 0 ? (
          <LP className="panel review-board__empty">
            Nothing matches those choices. Clear a filter to bring clips back.
          </LP>
        ) : grouped ? (
          groups.map((group) => (
            <LSection
              key={group.key}
              className="review-board__group"
              aria-labelledby={`group-${group.key}`}
              data-group={group.key}
            >
              <LH2 id={`group-${group.key}`}>
                {group.heading}{" "}
                <LSpan className="dense">({group.clips.length})</LSpan>
              </LH2>
              {group.listenFor ? <LP className="lede">{group.listenFor}</LP> : null}
              <LOl className="review-board__list">
                {group.clips.map((clip) => (
                  <ReviewClipRow
                    key={clip.id}
                    clip={clip}
                    tags={tagsByClipId.get(clip.id) ?? EMPTY_TAGS}
                    entry={verdictFor(book, clip.id)}
                    onVerdict={handleVerdict}
                    onNote={handleNote}
                    onClear={handleClear}
                  />
                ))}
              </LOl>
            </LSection>
          ))
        ) : (
          <LSection className="review-board__group" aria-labelledby="group-all">
            <LH2 id="group-all">
              Every clip <LSpan className="dense">({visible.length})</LSpan>
            </LH2>
            <LOl className="review-board__list">
              {visible.map((clip) => (
                <ReviewClipRow
                  key={clip.id}
                  clip={clip}
                  tags={tagsByClipId.get(clip.id) ?? EMPTY_TAGS}
                  entry={verdictFor(book, clip.id)}
                  onVerdict={handleVerdict}
                  onNote={handleNote}
                  onClear={handleClear}
                />
              ))}
            </LOl>
          </LSection>
        )}
      </LDiv>
    </LDiv>
  );
}
