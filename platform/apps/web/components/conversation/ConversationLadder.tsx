"use client";

import { useMemo, useState } from "react";
import type { LearnerEvent } from "@german-learning/learning";
import {
  CONVERSATION_LEVEL_IDS,
  advanceAfterComplete,
  buildConversationLevelCatalog,
  canAccessConversationLevel,
  createConversationUuid,
  initialConversationProgress,
  isLevelCompleted,
  metaForConversationLevel,
  selectConversationLevel,
  type ConversationLevelId,
  type ConversationSessionProgress,
} from "@/lib/conversation";
import type { NavigationContext } from "@/lib/content/navigation-context";
import { GuidedRecognitionLevel } from "./GuidedRecognitionLevel";
import { IndependentConstructionLevel } from "./IndependentConstructionLevel";
import { ModelLevel } from "./ModelLevel";
import { SpokenRolePlayLevel } from "./SpokenRolePlayLevel";
import { SubstitutionLevel } from "./SubstitutionLevel";

export function ConversationLadder({
  navigation: _navigation = null,
  onEvent,
}: {
  navigation?: NavigationContext | null;
  onEvent?: (event: LearnerEvent) => void;
}) {
  const sessionId = useMemo(() => createConversationUuid(), []);
  const catalog = useMemo(() => buildConversationLevelCatalog(), []);
  const [progress, setProgress] = useState<ConversationSessionProgress>(() =>
    initialConversationProgress(),
  );
  const [events, setEvents] = useState<LearnerEvent[]>([]);

  const current = metaForConversationLevel(progress.currentLevelId);

  function handleEvent(event: LearnerEvent) {
    setEvents((prev) => [...prev, event]);
    onEvent?.(event);
  }

  function completeLevel(levelId: ConversationLevelId) {
    setProgress((prev) => advanceAfterComplete(prev, levelId));
  }

  return (
    <div className="stack conversation-ladder" data-conversation="true">
      <header className="page-header">
        <p className="dense">Conversation</p>
        <h1>Five-level ladder</h1>
        <p className="lede">
          Published informal Q&amp;A only. In-session progress — persistence
          pending learner-state packet.
        </p>
      </header>

      <nav aria-label="Conversation levels" className="conversation-progress">
        <p className="dense" aria-live="polite">
          Current level: <strong>{current.label}</strong> ({current.progressLabel}
          )
        </p>
        <ol className="conversation-progress__list">
          {catalog.map((level) => {
            const accessible = canAccessConversationLevel(progress, level.id);
            const completed = isLevelCompleted(progress, level.id);
            const currentLevel = progress.currentLevelId === level.id;
            return (
              <li key={level.id}>
                <button
                  type="button"
                  className="conversation-progress__btn"
                  data-level-id={level.id}
                  data-accessible={accessible ? "true" : "false"}
                  data-completed={completed ? "true" : "false"}
                  data-current={currentLevel ? "true" : "false"}
                  aria-current={currentLevel ? "step" : undefined}
                  disabled={!accessible}
                  onClick={() =>
                    setProgress((prev) =>
                      selectConversationLevel(prev, level.id),
                    )
                  }
                >
                  <span>
                    {level.index + 1}. {level.shortLabel}
                  </span>
                  <span className="meta-chip">
                    {completed ? "Done" : currentLevel ? "Current" : accessible ? "Open" : "Locked"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {progress.currentLevelId === "model" ? (
        <ModelLevel
          sessionId={sessionId}
          onEvent={handleEvent}
          onComplete={() => completeLevel("model")}
        />
      ) : null}
      {progress.currentLevelId === "guided-recognition" ? (
        <GuidedRecognitionLevel
          sessionId={sessionId}
          onEvent={handleEvent}
          onComplete={() => completeLevel("guided-recognition")}
        />
      ) : null}
      {progress.currentLevelId === "substitution" ? (
        <SubstitutionLevel
          sessionId={sessionId}
          onEvent={handleEvent}
          onComplete={() => completeLevel("substitution")}
        />
      ) : null}
      {progress.currentLevelId === "independent-construction" ? (
        <IndependentConstructionLevel
          sessionId={sessionId}
          onEvent={handleEvent}
          onComplete={() => completeLevel("independent-construction")}
        />
      ) : null}
      {progress.currentLevelId === "spoken-role-play" ? (
        <SpokenRolePlayLevel
          sessionId={sessionId}
          onEvent={handleEvent}
          onComplete={() => completeLevel("spoken-role-play")}
        />
      ) : null}

      <p className="dense" data-session-events={String(events.length)}>
        In-session events: {events.length} (not persisted yet)
      </p>
      {/* Keep exact ordered IDs discoverable for tests */}
      <span hidden data-level-order={CONVERSATION_LEVEL_IDS.join(",")}>
        {CONVERSATION_LEVEL_IDS.join(",")}
      </span>
    </div>
  );
}
