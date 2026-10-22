"use client";

import Link from "next/link";
import { useState } from "react";
import { encodeScope } from "@/lib/wortwerk/links";
import { puzzleShareGrid, type PuzzleOutcome } from "../../../../packages/learning/src/wortwerk/challenges.js";
import { usePlayContent } from "./PlayProvider";

export function ChallengeLinks() {
  const content = usePlayContent();
  const pack = content?.selectedPack;
  if (!pack) return <p><Link href="/play/packs">Choose a pack for optional challenges</Link></p>;
  const query = new URLSearchParams({ scope: encodeScope(content?.scope ?? { v: 1 }), pack: pack.pack.id });
  return <nav className="ww-actions" aria-label="Optional challenges"><Link className="ww-button" href={`/play/blitz?${query.toString()}`}>Blitz · 60 seconds</Link><Link className="ww-button" href={`/play/run?mode=boss&${query.toString()}`}>Boss · this scope</Link><Link className="ww-button" href={`/play/puzzle?pack=${encodeURIComponent(pack.pack.id)}`}>Daily puzzle · six items</Link></nav>;
}

export function PuzzleShare({ date, outcomes }: { date: string; outcomes: readonly PuzzleOutcome[] }) {
  const [message, setMessage] = useState("");
  const grid = puzzleShareGrid(outcomes);
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(`Wortwerk · ${date}\n${grid}`);
      setMessage("Result grid copied. It contains no words or answers.");
    } catch { setMessage("Copy is unavailable here. You can select and copy the grid below."); }
  }
  return <section aria-label="Daily puzzle result"><p>{date}</p><output aria-label="Puzzle share grid">{grid}</output><div className="ww-actions"><button className="ww-button" type="button" onClick={() => { void copy(); }}>Copy result grid</button></div><p role="status">{message}</p></section>;
}
