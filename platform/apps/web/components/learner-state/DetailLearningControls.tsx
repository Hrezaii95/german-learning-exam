"use client";

import { useEffect, useState } from "react";
import {
  LEARNER_BUILT_IN_TAGS,
  PERSISTENCE_LIMITS,
  type LearnerBuiltInTag,
} from "@german-learning/learning";
import { eligibleReviewTemplateCount } from "@/lib/learner-state";
import { useOptionalLearnerState } from "./LearnerStateProvider";

export function DetailLearningControls({ contentId }: { contentId: string }) {
  const learnerState = useOptionalLearnerState();
  const snapshot = learnerState?.snapshot;
  const controller = learnerState?.controller ?? null;
  const state = snapshot?.hydration?.state;
  const savedNote = state?.notes.find((row) => row.contentId === contentId)?.text ?? "";
  const [note, setNote] = useState(savedNote);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const eligibleCount = eligibleReviewTemplateCount(contentId);
  const addedCount = state?.reviewCards.filter((row) => row.conceptId === contentId).length ?? 0;

  useEffect(() => setNote(savedNote), [savedNote]);

  if (!snapshot) {
    return (
      <section className="panel learner-controls" aria-labelledby="learner-controls-heading">
        <h2 id="learner-controls-heading">My learning tools</h2>
        <p className="dense">Review cards, tags, and notes become available when local learning state loads in the browser.</p>
      </section>
    );
  }

  async function run(action: () => Promise<unknown>, success: string) {
    if (!controller || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch {
      setMessage("The change was not saved. Check the plain-text value and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (snapshot.status === "loading") {
    return <p className="dense" role="status">Loading local learning controls…</p>;
  }
  if (!state || !controller) {
    return <p className="placeholder-banner" role="status">{snapshot.statusMessage}</p>;
  }

  return (
    <section className="panel learner-controls" aria-labelledby="learner-controls-heading">
      <h2 id="learner-controls-heading">My learning tools</h2>
      <div className="detail-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || eligibleCount === 0 || addedCount === eligibleCount}
          onClick={() => run(
            () => controller.addReviewCardsForConcept(contentId),
            "Review cards added to today’s mission pool.",
          )}
        >
          {eligibleCount === 0
            ? "No review template yet"
            : addedCount === eligibleCount
              ? `Added to review (${addedCount})`
              : `Add to review (${eligibleCount})`}
        </button>
        <span className="dense">{addedCount}/{eligibleCount} eligible cards saved locally</span>
      </div>

      <fieldset className="learner-tag-grid">
        <legend>Tags</legend>
        {LEARNER_BUILT_IN_TAGS.map((tag) => {
          const active = state.tags.some((row) => row.contentId === contentId && row.tag === tag);
          return (
            <button
              key={tag}
              type="button"
              className={active ? "btn btn-primary" : "btn btn-secondary"}
              aria-pressed={active}
              disabled={busy}
              onClick={() => run(
                () => controller.toggleTag(contentId, tag as LearnerBuiltInTag),
                `${tag} tag ${active ? "removed" : "saved"}.`,
              )}
            >
              {tag}
            </button>
          );
        })}
      </fieldset>

      <label className="hub-field" htmlFor={`learner-note-${contentId.replace(/[^a-z0-9]/gi, "-")}`}>
        <span className="hub-field__label">Personal note</span>
        <textarea
          id={`learner-note-${contentId.replace(/[^a-z0-9]/gi, "-")}`}
          className="hub-input learner-note"
          value={note}
          maxLength={PERSISTENCE_LIMITS.maxNoteTextLength}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Plain text only"
        />
      </label>
      <div className="detail-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || note.length === 0}
          onClick={() => run(() => controller.saveNote(contentId, note), "Note saved locally.")}
        >
          Save note
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || savedNote.length === 0}
          onClick={() => run(() => controller.deleteNote(contentId), "Note deleted.")}
        >
          Delete note
        </button>
        <span className="dense">{note.length}/{PERSISTENCE_LIMITS.maxNoteTextLength}</span>
      </div>
      {message ? <p className="detail-feedback" role="status">{message}</p> : null}
    </section>
  );
}
