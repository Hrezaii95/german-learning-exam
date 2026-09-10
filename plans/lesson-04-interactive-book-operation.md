# Lesson 4 and interactive learning book

Owner authorization: 2026-09-10. The owner delegates product decisions, implementation, source integration, verification and live deployment to Codex and will review the live URL. This supersedes the older Claude-only allocation and Lessons 1–2 scope for this release. Existing source attribution applies to the course media; generated speech remains identified as synthesized.

## Execution

1. Verify Lesson 4 against the local coursebook, workbook, glossary and recordings. Build a source-indexed, reproducible book manifest for Lessons 1–4 and preserve the original pages.
2. Deliver a responsive book reader: lesson/book/page navigation, original page view, readable text, original exercise tracks, line speech fallback, speed controls, translation/word lookup, bookmarks and resume.
3. Deliver Lesson 4 furniture, prices, descriptive language, articles and personal-pronoun study content, with vocabulary, grammar, phrases and checked practice. Integrate it into course navigation and existing vocabulary browsing.
4. Add a persistent personal review collection across book lines, word families and concepts; support selecting, deselecting, due review, answer reveal and recall ratings. Make dictionary lookup available without leaving study context.
5. Validate content/media references, persistence and failure handling, keyboard/mobile/desktop flows, TypeScript/lint/tests, production build and Pages gates.
6. Commit only this release's changes, push the deployment branch, verify the deployed workflow and live interactions, then deliver the live link.

## Product decisions

- Calm reading workspace using the current palette and typography; keep independently browsable study hubs.
- Original page images plus a selectable text reading mode. No fabricated timing claims: original recordings are mapped at exercise/page level; synthesized line audio is labelled.
- Local-first progress and saved items; no new account or paid service required. Unknown dictionary words have an explicit no-match state and reputable lookup links.
- Browser German speech provides a no-network fallback; reusable generated clips preferred where available. Audio failures stay visible and retryable.
- Existing unrelated working files and the dirty sample submodule stay outside the release.

## Acceptance

- Four lessons reachable from the book and lesson navigation, including a complete Lesson 4 study route.
- Every readable German book line offers audio; original tracks and page images resolve under the deployed base path.
- Dictionary works from a word click; saved selections survive reload and can be removed from the review collection.
- Checked practice gives corrective feedback; review ratings change due dates and never claim assessed mastery.
- Responsive browser verification, regression tests and production/deployment gates pass.

## Implemented release

- Lesson 4: 45 vocabulary and expression cards, five grammar concepts, four verb paradigms, twelve phrases and twelve corrective practice questions. All 45 cards also appear in the existing vocabulary hub and have individual study routes.
- Interactive coursebook and workbook: 32 source pages across Lessons 1–4, 1,652 selectable German text lines, 64 original exercise recordings (18 for Lesson 4), bookmarks, studied-page marks, resume, zoom and playback speed.
- Speech: 1,477 distinct utterances mapped to audio, including 1,378 new synthesized clips. Original and synthesized playback are identified separately and coordinated to prevent overlapping sound.
- One-click local dictionary, personal word/concept/phrase/line selections, deselection, notes, due review, recall ratings and JSON backup/restore. Storage failures are explicit and never produce a false saved state.
- 1,442 new public audio files passed media probing and checksum registration. Publisher attribution remains visible in the app.
- Production browser checks cover desktop and 390-pixel mobile layouts, original playback, dictionary dismissal, selection persistence, quiz feedback, page navigation, resume, backup recovery and denied storage.
- Release maintenance includes Next.js 16.3.4 and its patched image dependency, plus a regression fix for browsers that block service-worker registration.

Status: implementation and local release verification complete. All 791 automated tests, production export gates, attribution and production dependency audit pass. The final export passes 38 browser checks with zero runtime errors. The guarded Pages deployment is next; local and live browser results are recorded under `research/lesson-04-book/`.
