"use client";

import { useCallback, useState, type ReactNode } from "react";

/**
 * The shared attempt → feedback live region (WCAG 4.1.3 Status Messages).
 *
 * Two independent defects used to silence this channel, and a learner who
 * cannot see the screen could not tell a wrong answer from a dead button:
 *
 *  1. Every feedback region was mounted together with its first message
 *     (`{feedback ? <p role="status">…` ). A live region that does not exist
 *     when its content arrives is not being watched yet, so the first message
 *     could pass unannounced.
 *  2. The outcome strings are constants ("Does not match the published form.").
 *     Setting React state to the value it already holds is a no-op: no
 *     re-render, no text-node mutation, no live-region event. A second
 *     identical outcome therefore produced complete silence.
 *
 * `Announcement` carries a monotonic `seq` beside the text, bumped on every
 * submission. `StatusMessage` renders the region from the first paint (empty
 * and visually collapsed while idle) and keys the message node on `seq`, so an
 * identical repeat still replaces that node and is announced again. Nothing
 * here depends on the message text differing.
 */
export type Announcement = Readonly<{
  /** What the learner should hear. Empty means the region is idle. */
  readonly text: string;
  /** Bumped on every announcement, including exact repeats. */
  readonly seq: number;
}>;

export const IDLE_ANNOUNCEMENT: Announcement = Object.freeze({
  text: "",
  seq: 0,
});

/** Next announcement from the current one. Exported so the reducer is testable. */
export function nextAnnouncement(
  current: Announcement,
  text: string | null,
): Announcement {
  return Object.freeze({ text: text ?? "", seq: current.seq + 1 });
}

/**
 * Feedback state for one live region. `announce` is safe to call with the same
 * string any number of times — each call is a distinct announcement.
 */
export function useAnnouncement(): readonly [
  Announcement,
  (text: string | null) => void,
] {
  const [announcement, setAnnouncement] =
    useState<Announcement>(IDLE_ANNOUNCEMENT);
  const announce = useCallback((text: string | null) => {
    setAnnouncement((current) => nextAnnouncement(current, text));
  }, []);
  return [announcement, announce] as const;
}

/**
 * Feedback state for a region that also carries an outcome kind (correct /
 * incorrect / revealed …). Same guarantee as `useAnnouncement`: `setMessage`
 * is an announcement every time it is called, even with the same words — the
 * practice grader returns fixed strings, so string inequality cannot be the
 * trigger.
 */
export function useFeedbackChannel<Kind extends string>(): {
  readonly kind: Kind | null;
  readonly message: string | null;
  readonly seq: number;
  readonly setFeedbackKind: (kind: Kind | null) => void;
  readonly setMessage: (message: string | null) => void;
} {
  const [state, setState] = useState<{
    kind: Kind | null;
    message: string | null;
    seq: number;
  }>({ kind: null, message: null, seq: 0 });

  const setFeedbackKind = useCallback((kind: Kind | null) => {
    setState((current) => ({ ...current, kind }));
  }, []);
  const setMessage = useCallback((message: string | null) => {
    setState((current) => ({ ...current, message, seq: current.seq + 1 }));
  }, []);

  return {
    kind: state.kind,
    message: state.message,
    seq: state.seq,
    setFeedbackKind,
    setMessage,
  };
}

export function StatusMessage({
  announcement,
  className = "",
  children,
}: {
  announcement: Announcement;
  /** Visual class, applied only while the region actually says something. */
  className?: string;
  /** Optional richer rendering of the same words (e.g. German with `lang`). */
  children?: ReactNode;
}) {
  const speaking = announcement.text.length > 0;
  return (
    <p
      className={
        speaking
          ? `live-region ${className}`.trim()
          : "live-region live-region--idle"
      }
      role="status"
      aria-live="polite"
      data-announcement-seq={announcement.seq}
    >
      {speaking ? (
        <span key={announcement.seq}>{children ?? announcement.text}</span>
      ) : null}
    </p>
  );
}
