"use client";
import { LButton, LDiv, LFieldset, LH2, LLabel, LLegend, LP, LSection, LSpan, LTextarea } from "@/components/i18n/LocalizedElements";


import { useEffect, useState } from "react";
import {
  StatusMessage,
  useAnnouncement,
} from "@/components/a11y/StatusMessage";
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
  const [message, setMessage] = useAnnouncement();
  const eligibleCount = eligibleReviewTemplateCount(contentId);
  const addedCount = state?.reviewCards.filter((row) => row.conceptId === contentId).length ?? 0;

  useEffect(() => setNote(savedNote), [savedNote]);

  if (!snapshot) {
    return (
      <LSection className="panel learner-controls" aria-labelledby="learner-controls-heading">
        <LH2 id="learner-controls-heading">My learning tools</LH2>
        <LP className="dense">Review cards, tags, and notes become available when local learning state loads in the browser.</LP>
      </LSection>
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
    return <LP className="dense" role="status">Loading local learning controls…</LP>;
  }
  if (!state || !controller) {
    return <LP className="placeholder-banner" role="status">{snapshot.statusMessage}</LP>;
  }

  return (
    <LSection className="panel learner-controls" aria-labelledby="learner-controls-heading">
      <LH2 id="learner-controls-heading">My learning tools</LH2>
      <LDiv className="detail-actions">
        <LButton
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
        </LButton>
        <LSpan className="dense">{addedCount}/{eligibleCount} eligible cards saved locally</LSpan>
      </LDiv>

      <LFieldset className="learner-tag-grid">
        <LLegend>Tags</LLegend>
        {LEARNER_BUILT_IN_TAGS.map((tag) => {
          const active = state.tags.some((row) => row.contentId === contentId && row.tag === tag);
          return (
            <LButton
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
            </LButton>
          );
        })}
      </LFieldset>

      <LLabel className="hub-field" htmlFor={`learner-note-${contentId.replace(/[^a-z0-9]/gi, "-")}`}>
        <LSpan className="hub-field__label">Personal note</LSpan>
        <LTextarea
          id={`learner-note-${contentId.replace(/[^a-z0-9]/gi, "-")}`}
          className="hub-input learner-note"
          value={note}
          maxLength={PERSISTENCE_LIMITS.maxNoteTextLength}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Plain text only"
        />
      </LLabel>
      <LDiv className="detail-actions">
        <LButton
          type="button"
          className="btn btn-secondary"
          disabled={busy || note.length === 0}
          onClick={() => run(() => controller.saveNote(contentId, note), "Note saved locally.")}
        >
          Save note
        </LButton>
        <LButton
          type="button"
          className="btn btn-secondary"
          disabled={busy || savedNote.length === 0}
          onClick={() => run(() => controller.deleteNote(contentId), "Note deleted.")}
        >
          Delete note
        </LButton>
        <LSpan className="dense">{note.length}/{PERSISTENCE_LIMITS.maxNoteTextLength}</LSpan>
      </LDiv>
      <StatusMessage announcement={message} className="detail-feedback" />
    </LSection>
  );
}
