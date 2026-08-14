"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildArticleChoicePrompt,
  createPracticeTimestamp,
  createPracticeUuid,
  emitObjectiveGameAttempt,
  measuredDimensionForEnabledGame,
  practiceActivityId,
  taskFamilyForEnabledGame,
} from "@/lib/games";
import type { GameFeedbackKind } from "@/lib/games/game-types";
import { GameActionBar, GameFeedback, type GameEventSink } from "./GameFeedback";

export function ArticleChoiceGame({
  sessionId,
  onEvent,
}: {
  sessionId: string;
  onEvent?: GameEventSink;
}) {
  const prompt = useMemo(() => buildArticleChoicePrompt("masculine"), []);
  const startedAt = useRef(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedbackKind, setFeedbackKind] = useState<GameFeedbackKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    if (!selected) {
      setFeedbackKind("empty");
      setMessage("Choose an article first.");
      return;
    }
    const result = emitObjectiveGameAttempt({
      gameId: "article-choice",
      rawAnswer: selected,
      expectedNormalized: prompt.correctArticle,
      revealed,
      hintsUsed,
      latencyMs: Math.max(0, Date.now() - startedAt.current),
      conceptId: prompt.conceptId,
      sessionId,
      eventId: createPracticeUuid(),
      timestamp: createPracticeTimestamp(),
      taskFamily: taskFamilyForEnabledGame("article-choice"),
      measuredDimension: measuredDimensionForEnabledGame("article-choice"),
      activityId: practiceActivityId("article-choice"),
    });
    if (result.emitted) onEvent?.(result.event);
    setFeedbackKind(result.grade?.feedbackKind ?? null);
    setMessage(result.grade?.feedbackMessage ?? null);
  }

  function retry() {
    setSelected(null);
    setRevealed(false);
    setHintsUsed(0);
    setFeedbackKind("retry");
    setMessage("Ready to try again.");
    startedAt.current = Date.now();
  }

  return (
    <section className="panel game-panel" aria-labelledby="article-choice-heading">
      <h2 id="article-choice-heading">Article choice</h2>
      <p className="muted">
        Choose the correct article for{" "}
        <span className="german" lang="de">
          {prompt.lemma}
        </span>
        .
      </p>
      <fieldset className="game-choice">
        <legend className="hub-field__label">Article</legend>
        {prompt.choices.map((article) => (
          <label key={article} className="game-choice__option">
            <input
              type="radio"
              name="article-choice"
              value={article}
              checked={selected === article}
              onChange={() => {
                setSelected(article);
                setMessage(null);
              }}
            />
            <span className="german" lang="de">
              {article}
            </span>
          </label>
        ))}
      </fieldset>
      <GameActionBar
        onSubmit={submit}
        onRetry={retry}
        onReveal={() => {
          setRevealed(true);
          setHintsUsed((n) => n + 1);
          setFeedbackKind("revealed");
          setMessage(`Correct article: ${prompt.correctArticle}`);
        }}
        revealDisabled={revealed}
      />
      <GameFeedback kind={feedbackKind} message={message} />
    </section>
  );
}
