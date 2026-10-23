"use client";

import { useId, useState } from "react";
import { withPagesBasePath } from "@/lib/content/pages-base-path";
import { challengeHref, type BlitzChallenge } from "@/lib/wortwerk/challenges";

/** Creating and copying a self-reported target always starts with a user gesture. */
export function ChallengeShare({ challenge }: { challenge: BlitzChallenge }) {
  const id = useId();
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  async function share() {
    try {
      const url = new URL(challengeHref(challenge), window.location.origin);
      url.pathname = withPagesBasePath(url.pathname);
      setLink(url.href);
      if (!navigator.clipboard?.writeText) { setMessage("Select and copy the challenge link below."); return; }
      await navigator.clipboard.writeText(url.href);
      setMessage("Challenge link copied.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The challenge link could not be copied."); }
  }
  return <section aria-labelledby={id}><h2 id={id}>Share this Blitz target</h2><p>A self-reported target for this exact pack, practice selection and difficulty. The link contains your score and selection, with no name or answers.</p><button type="button" className="ww-button" onClick={() => { void share(); }}>Copy Blitz challenge link</button>{link ? <label>Blitz challenge link<textarea rows={3} readOnly value={link} onFocus={event => event.currentTarget.select()} style={{ width: "100%", boxSizing: "border-box", minHeight: 88, overflowWrap: "anywhere" }} /></label> : null}<p role="status" aria-live="polite">{message}</p></section>;
}
