"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ItemProgress, LearningAnswer, LearningCapability } from "../../../../packages/learning/src/wortwerk/types.js";
import { objectiveDimensions } from "../../../../packages/learning/src/wortwerk/progress.js";
import type { PlayPack } from "@/lib/wortwerk/content.server";
import { encodeScope, playHref, type PlayScope } from "@/lib/wortwerk/links";
import { derivePatternMilestones, nearestPatternMilestone, type PatternMilestone } from "@/lib/wortwerk/milestones";
import { panelItemLabel } from "@/lib/wortwerk/panel-catalog";
import { safeSourceHref } from "@/lib/wortwerk/resources";

export type MilestonePanelProps = {
  selected: PlayPack; scope: PlayScope; capabilities: readonly LearningCapability[];
  progress: readonly ItemProgress[]; answers: readonly LearningAnswer[]; now: Date;
  headingLevel?: 2 | 3;
};

/** Today and Map share one scoped goal, with rewards derived entirely from evidence. */
export function MilestonePanel({ selected, scope, capabilities, progress, answers, now, headingLevel = 3 }: MilestonePanelProps) {
  const milestones = derivePatternMilestones(selected.pack, selected.language, capabilities, progress, answers, now);
  const next = nearestPatternMilestone(milestones);
  const unlocked = milestones.filter(milestone => milestone.learningComplete);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const Subheading = headingLevel === 2 ? "h3" : "h4";
  const scopedCapabilities = new Map(capabilities.filter(capability => capability.packId === selected.pack.id).map(capability => [capability.itemId, capability]));
  const scopedProgress = progress.filter(item => item.packId === selected.pack.id && scopedCapabilities.has(item.itemId)).map(item => {
    const segments = Object.fromEntries(Object.entries(item.segments).filter(([dimension]) => scopedCapabilities.get(item.itemId)!.dimensions.includes(dimension)));
    const parts = Object.values(segments).filter(part => part.assessment !== "self");
    return { ...item, segments, complete: parts.length > 0 && parts.every(part => part.state === "secured") };
  });
  const fallback = scopedProgress.filter(item => !item.complete && objectiveDimensions(item).length > 0).sort((left, right) => objectiveDimensions(right).filter(part => part.state === "secured").length - objectiveDimensions(left).filter(part => part.state === "secured").length)[0];
  const segment = fallback && objectiveDimensions(fallback).filter(part => part.state !== "secured").sort((left, right) => right.recallDates.length - left.recallDates.length)[0];
  const item = selected.pack.items.find(item => item.id === fallback?.itemId);
  const selfOnly = scopedProgress.some(item => Object.keys(item.segments).length > 0 && objectiveDimensions(item).length === 0);
  const practised = scopedProgress.filter(item => Object.values(item.segments).some(segment => segment.attempts > 0 || (segment.practiceAttempts ?? 0) > 0)).length;

  return <div className="ww-milestone"><Heading>Next milestone</Heading>
    {next ? <><Subheading>{next.title}</Subheading><p>{next.secured} / {next.learningItemIds.length} learning items secured · {next.remainingItemIds.length} more to {next.rule ? "unlock this pattern's rule card" : "complete this learning goal"}.</p>
      {next.challenge ? <p className="ww-muted">One item is reserved for an optional unfamiliar-word challenge. The full map cell includes every token.</p> : null}
      <Link className="ww-button" href={playHref({ ...scope, items: next.remainingItemIds }, { pack: selected.pack.id })}>Practise this pattern</Link>
      {!next.rule ? <p className="ww-muted">No source-backed rule card is available for this map cell.</p> : null}
    </> : milestones.length ? <p>Mapped learning goals are secured. Full map cells are complete when every token is secured.</p>
      : segment && item ? <p>Secure {segment.dimension} for <span lang={selected.language.locale}>{panelItemLabel(item)}</span>. Recall it correctly on {Math.max(1, 2 - segment.recallDates.length)} more calendar day{segment.recallDates.length === 1 ? "" : "s"}.</p>
        : selfOnly ? <p>Self-check practice: compare a response with its source model. {practised} {practised === 1 ? "item" : "items"} practised.</p>
          : <p>No eligible objective milestone remains in this selection. Self-check practice and due reviews stay available.</p>}
    {!milestones.length ? <p className="ww-muted">Rule cards and unfamiliar-word challenges need an authored pattern map in the current scope.</p> : null}
    {unlocked.map(milestone => <UnlockedRule key={`${milestone.id}:${encodeScope(scope)}`} milestone={milestone} selected={selected} scope={scope} headingLevel={headingLevel === 2 ? 3 : 4} />)}
  </div>;
}

function UnlockedRule({ milestone, selected, scope, headingLevel }: { milestone: PatternMilestone; selected: PlayPack; scope: PlayScope; headingLevel: 3 | 4 }) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  return <section className="ww-preview" aria-label={`${milestone.rule ? "Unlocked rule card" : "Secured learning goal"}: ${milestone.title}`}>
    <Heading>{milestone.rule ? "Rule card unlocked" : "Learning goal secured"} · {milestone.title}</Heading>
    {milestone.rule ? <><dl>{milestone.rule.fields.map(field => <div key={`${field.label}:${field.value}`}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
      <p className="ww-muted">Reference facts from language profile {milestone.rule.profileId}; examples from this pack&apos;s learning items.</p>
      <ul>{milestone.rule.examples.map(({ item, forms }) => <li key={item.id}><span lang={selected.language.locale}>{[item.article, item.lemma].filter(Boolean).join(" ")}{forms.length ? ` → ${forms.join(" · ")}` : ""}</span>
        {safeSourceHref(item.sourceRef?.href) ? <> · <Link href={safeSourceHref(item.sourceRef?.href)!}>Source example</Link></> : <> · {item.bookRef.book}, lesson {item.bookRef.lesson}{item.bookRef.page !== undefined ? `, page ${item.bookRef.page}` : ""}</>}
      </li>)}</ul></> : <p>No source-backed rule card is available for this map cell.</p>}
    {milestone.challenge && !milestone.challengeSeen ? <ChallengeButton milestone={milestone} selected={selected} scope={scope} />
      : <p className="ww-muted">{milestone.challengeSeen ? "The reserved challenge word has already been practised. No unfamiliar word remains for this challenge in the current scope." : "No unfamiliar-word challenge is available from the authored items in this scope."}</p>}
  </section>;
}

function ChallengeButton({ milestone, selected, scope }: { milestone: PatternMilestone; selected: PlayPack; scope: PlayScope }) {
  const router = useRouter();
  return <button className="ww-button" type="button" onClick={() => {
    if (!milestone.challenge || milestone.challengeSeen) return;
    // Build navigation only after the gesture: authored IDs can contain the answer.
    // The isolated Run owns normal task generation, grading and evidence recording.
    router.push(playHref({ ...scope, items: [milestone.challenge.itemId], count: 1,
      skills: [milestone.challenge.dimension] }, { pack: selected.pack.id, mode: "free" }));
  }}>Try one unfamiliar word</button>;
}
