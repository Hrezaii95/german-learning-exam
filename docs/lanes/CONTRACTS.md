# Lane contracts (shared interfaces)

The three lanes (`docs/lanes/README.md`) build against these interfaces instead of against each other's code, so they can work at the same time. **Changing this file needs the owner's OK.** Do it in a separate tiny PR titled `contracts: …`, and the owner tells the other lanes.

---

## 1. Design tokens (Lane 1 defines; everyone uses)
Lane 1 defines these custom properties in `platform/apps/web/app/globals.css` in its **first PR**. The values come from the reference design (audit §1).

| Token | Value |
|---|---|
| `--tone-masc` | `#245fa7` |
| `--tone-fem` | `#b82e4c` |
| `--tone-neut` | `#237149` |
| `--tone-plural` | `#8c4daa` |
| `--tone-plain` | `#3d5d55` |
| `--ink` | `#203536` |
| `--ink-muted` | `#596660` |
| `--paper` | `#fffdf8` |
| `--canvas` | `#f3efe8` |
| `--line` | `#e4ddd2` |
| `--action` | `#345d4c` |
| `--chip-ending-bg` | `#f8e1a1` |
| `--chip-ending-line` | `#b27b19` |
| `--chip-umlaut-bg` | `#dfd6f2` |
| `--chip-umlaut-line` | `#8760af` |
| `--focus-ring` | `#345d4c` |

- Lanes 2 and 3 use them **with fallbacks** (e.g. `var(--tone-masc, #245fa7)`), so they never wait for Lane 1.
- Nobody adds new hex literals outside these tokens.

## 2. Navigation and the account slot
- Lane 1 creates **`platform/apps/web/lib/content/nav.ts`** as the single navigation source:
  ```ts
  export type Role = "student" | "teacher" | "admin";
  export type NavItem = {
    id: string; label: string; href: string; icon: string;
    placement: Array<"rail" | "tabs" | "menu">;
    roles?: Role[];     // shown only when signed in with one of these roles
    order: number;
  };
  export const NAV_ITEMS: NavItem[] = [ /* … */ ];
  ```
  The desktop rail, the tablet bar and the mobile tabs all render from it.
- Lane 1 also creates the stub `platform/apps/web/components/account/AccountSlot.tsx` (`export function AccountSlot(){ return null; }`) and renders it in the shell header and in the mobile Menu. **After that PR merges, Lane 3 owns this file** and makes it show Sign in / the avatar menu.
- Lanes 2 and 3 add their nav entries (`play`; `dashboard`, `teaching`, `admin`) **only after Lane 1's nav PR has merged**, each as one entry in its own commented block in `NAV_ITEMS`.

## 3. Route ownership
| Routes | Owner |
|---|---|
| `/play/**` | Lane 2 |
| `/login/`, `/account/`, `/dashboard/`, `/teacher/**`, `/admin/**`, `/api/**` | Lane 3 |
| every other route | Lane 1 |

- Use no dynamic segments in new routes; pass ids in query strings (static export).
- Never hard-code `/german-learning-exam`. Use Next `Link` / `basePath`-aware helpers, because the app must work at both `/german-learning-exam/` (GitHub Pages) and `/` (german.learnilabs.com).

## 4. Persistence and sync
- Local state must be **syncable**: either an append-only event log with globally unique ids, or small last-write-wins documents.
- Lane 3 owns `platform/packages/sync` and the registry. Lane 2 implements its store against this interface structurally (it may copy the types into `lib/wortwerk/sync-store.ts` until `packages/sync` exists):
  ```ts
  export type SyncEvent = {
    id: string;            // uuid v7, generated on the device
    store: string;         // e.g. "wortwerk"
    deviceId: string;
    createdAt: string;     // ISO 8601
    schemaVersion: number;
    type: string;          // e.g. "answer", "assignment.progress"
    payload: unknown;      // JSON only
  };
  export type SyncDoc = {
    store: string; key: string; updatedAt: string; deviceId: string;
    schemaVersion: number; value: unknown;
  };
  export interface SyncStore {
    store: string;
    schemaVersion: number;
    strategy: "event-log" | "lww-doc";
    localEventsSince?(cursor: string | null): Promise<{ events: SyncEvent[]; cursor: string }>;
    applyRemoteEvents?(events: SyncEvent[]): Promise<void>; // must be idempotent
    localDocs?(): Promise<SyncDoc[]>;
    applyRemoteDocs?(docs: SyncDoc[]): Promise<void>;        // newest updatedAt wins
  }
  ```
- Lane 2 exports `wortwerkSyncStores: SyncStore[]` from `platform/apps/web/lib/wortwerk/sync-store.ts`. It includes:
  - the event log (answers, sessions, assignment progress);
  - the docs `study.position` (book position) and `study.scope`, plus the Wortwerk settings.
- Lane 3 registers these stores, wraps the existing `LearnerStateStorageAdapter`, and ships the data. It **never changes Lane 2's event shapes**.
- All learner progress derives from events. No progress is kept only in a derived cache that sync can't rebuild.

## 5. Teacher-extra overlay packs
- Lane 3 serves class extras at `GET /api/me/extras` as an array of content packs in the **same pack schema** as `platform/content/packs/*`, with `source: "teacher-extra"` on every item and the class id in the pack id.
- Lane 2's pack loader exposes `registerOverlayPacks(packs: ContentPack[]): void` (client side, idempotent). Lane 3 calls it after sign-in and on class changes.

## 6. Scope encoding (play links, "Play this sheet", assignments)
`/play/run?scope=<base64url(JSON)>[&assignment=<id>]`, where the JSON (v1) is:
```json
{ "v": 1, "book": "momente-a1",
  "upTo": { "lesson": 5, "page": 62 },
  "lessons": [2, 4], "tags": ["food"], "sources": ["course", "teacher-extra"],
  "skills": ["meaning", "gender", "plural", "listening"],
  "items": ["W012-0"], "count": 20 }
```
- Every field except `v` is optional.
- Lane 2 owns the parser and exports `encodeScope` / `decodeScope` / `playHref(scope)` from `lib/wortwerk/links.ts`.
- Lane 1 may build links from this format directly before that file exists.
- Unknown fields are ignored. A higher `v` shows a "please update" message.

## 7. Assignment progress
- When `/play/run` has an `assignment` parameter, Lane 2 emits `assignment.progress` events: `{assignmentId, answered, correct, bySkill: {skill: {answered, correct}}, completed: boolean}`.
- Lane 3 derives `assignment_progress` on the server from synced events. Signed-out students get the Class mode A result code (Lane 2 UI) instead.

## 8. Session on the client
Lane 3 provides `platform/apps/web/lib/account/session.ts`:
```ts
export type SessionUser = { id: string; displayName: string; role: "student" | "teacher" | "admin" };
export function useSession(): { status: "loading" | "signed-out" | "signed-in" | "unavailable"; user?: SessionUser; flags: Record<string, boolean> };
```
- `unavailable` means there is no API (the GitHub Pages build or offline). Every screen must work signed out.
- Lane 2 may read `useSession` to label things ("Synced to your account"). It never calls `/api` directly, except through Lane 3 helpers.

## 9. Illustrations
- Lane 1 keeps `SubjectVocabularyVisual`'s props backward-compatible; new props must be optional.
- Illustrations take their colour from `currentColor`. Lane 2 renders question-state art inside a wrapper with `color: var(--ink)` (the no-giveaway rule), with no changes to Lane 1 files.

## 10. Embeddable game panels
- Lane 2 exports `TodayPanel` (`components/wortwerk/TodayPanel.tsx`) and `ProgressSummary` (`components/wortwerk/ProgressSummary.tsx`). Both are client components with no required props, and they read local state.
- Lane 3 embeds them on `/dashboard/`. Until they exist, Lane 3 shows a "Go to today's practice" link to `/play/`.

## 11. Shared append-only files
These files may be touched by more than one lane, **append-only, inside the lane's own commented block**:
- `platform/apps/web/scripts/smoke-pages.mjs` (route lists);
- `platform/apps/web/scripts/offline-export.ts` (precache lists);
- `lib/content/nav.ts` (`NAV_ITEMS`);
- `platform/package.json` (`scripts` only; new dependencies are Lane 3 only, and other lanes ask the owner first);
- `docs/INDEX.md`.

On a conflict: rebase on `origin/codex/live-alpha` and keep both sides. Regenerate `package-lock.json` with `npm install`; never hand-merge it.
