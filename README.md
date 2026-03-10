# LifeRecompiled

LifeRecompiled is a portfolio-grade full-stack web app that started as a "blog app" and evolved into a small developer/community platform.

## TL;DR
- Community-style posts + comments + reactions
- Backend-authoritative aggregates via Cloud Functions v2
- Deterministic reactions + idempotency ledger to prevent counter drift
- Soft delete + scheduled purge (Trash → permanent delete)
- Staging vs prod discipline (safe deploy workflow)

The project focuses on **production-like engineering problems**:

- Data integrity under retries / races
- Role-based access (user vs admin)
- Backend-authoritative aggregates (counts, badges, stats)
- Robust pagination + UI-safe normalization
- Polished UX (undo, skeletons, modals, responsive layout)

---

## Demo

- Live: https://liferecompiled.com
- Repo: https://github.com/cole92/liferecompiled
- About: /about
- Support & feedback: /report (auth-only)

---

## Table of contents

- [Tech stack](#tech-stack)
- [Key product features](#key-product-features)
- [Architecture at a glance](#architecture-at-a-glance)
- [Data model (high level)](#data-model-high-level)
- [Cloud Functions v2 (inventory)](#cloud-functions-v2-inventory)
- [Backend correctness highlights](#backend-correctness-highlights)
- [Firestore security rules (key policies)](#firestore-security-rules-key-policies)
- [UX engineering highlights](#ux-engineering-highlights)
- [CI / Code quality](#ci--code-quality)
- [Local development](#local-development)
- [Deploy notes](#deploy-notes)
- [Operations](#operations)
- [Testing](#testing)
- [Gotchas / Lessons learned](#gotchas--lessons-learned)
- [Roadmap](#roadmap)
- [Author](#author)

---

## Tech stack

**Frontend**

- React + Vite
- React Router v6 (protected routes)
- Tailwind CSS (dark-first design system)
- Framer Motion (micro-interactions)
- react-toastify (centralized toasts + anti-spam)
- react-tooltip v5 (tooltips)
- Recharts + dayjs (stats charts + date formatting)
- Optional: react-dnd for tag reorder

**Backend / Cloud**

- Firebase Auth
- Firestore
- Firebase Hosting
- Cloud Functions v2 (Node 18 runtime)
- Cloudinary (image upload + best-effort cleanup on delete)

---

## Key product features

### Auth & access control

- Email/password auth: Register, Login, Forgot password (privacy-safe reset messaging).
- Email verification gate (global AuthProvider guard):
  - `currentUser.reload()` is wrapped with a timeout (prevents UI lock-ups).
  - If `emailVerified !== true`, user state is reset and a fire-and-forget `signOut()` is triggered.
  - Verify toast is shown once per session (anti-spam), with suppression after register.
  - Login shows a verify panel + "Resend verification" when needed.
- Protected routes for dashboard features; admin-only access for moderation and privileged deletes.

### Feed (Home)

- Global feed with **cursor pagination** (`startAfter`) and configurable page size (defaults + clamp; current UI uses 12 on Home).
- Sort: Newest / Oldest / Trending.
- Trending sort is query-based: `badges.trending == true` + `orderBy(lastHotAt desc, createdAt desc)` tie-breaker for stable pagination.
- Category filter (single-select mode + sort constraints).
- Skeleton loading + "You reached the end" helper.

### Posts

- Create: title + optional description + content, category, tags.
- Tags: max 5 tags; each ≤ 20 chars; allowed characters: alphanumeric + `. _ + - #`.
- Edit window:
  - Editing is available for the first **7 days** after creation (then the Edit action is disabled/hidden).
  - This is separate from archiving.
- Archive (manual by author):
  - Archived posts are visually marked and become read-only (editing and commenting disabled).
- Trash: soft delete with restore window.
- Trash view includes pagination-safe TTL filters (0–10 / 11–20 / 21–30 days left) implemented directly in Firestore queries.

### Comments

- Edit window: comment authors can edit their comment for **10 minutes** (then the Edit action auto-hides).
- Threaded comments (multi-level replies; UI supports depth ~4).
- Soft delete (placeholder replaces content).
- Comment likes + "people who liked this" modal.
- List UX: previews first 2 with "See more" lazy-load.
- Mobile-first comments UX (sheet pattern on small screens).

### Saved posts

- Save/unsave with **Undo** (deferred write, 7s).
- Robust join strategy (Promise.allSettled) resilient to missing/denied docs.
- Ghost saved cards when the original post is unavailable.
- Snapshot metadata at save-time ("Updated since saved" badge).

### Dashboard: Stats

- Read-only analytics view powered by backend aggregates (`userStats/{uid}`).
- Monthly posting activity chart + highlight for the most active month.
- Restore vs permanent-delete ratio (based on Trash actions).
- Hover tooltips for quick inspection.

### Dashboard: My Posts

- Filters: Active / Archived / All (server-driven).
- Server-side title search via `title_lc` prefix query (debounced ~300ms).
- Pagination pattern: cursor (`startAfter`) + duplicate-safe append.

### Profiles & Settings

- Public profile route: `/profile/:uid`
- Top posts (up to 3) + engagement stats.
- Zoomable avatars (modal, keyboard-ready).
- Settings: name + bio + profile image upload to Cloudinary, including drag-to-reposition.

### Moderation (Admin)

- Admin-only dashboard tab; direct URL access for non-admin shows AccessDenied.
- Reports list (post/comment) + deep link to the target.
- Admin actions:
  - hard delete post (cascade)
  - delete comments (soft delete)

### Support & feedback (auth-only)

- Route: `/report` (available via avatar menu)
- Category dropdown: support / bug / feedback / feature request / UI issue / performance / other
- Optional reproduction steps
- Includes debug context (route, uid, email)
- Email-based workflow:
  - open Gmail (web)
  - open email app (device)
  - copy report fallback
  - back home

---

## Architecture at a glance

**Client**

- Reads posts/comments/profiles/saved lists with cursor pagination.
- Writes only "safe" user-owned data.
- Uses deterministic IDs for reaction toggles.

**Firestore**

- Stores canonical entities (posts, comments, users, saved snapshots, reports).
- Enforces strict rules:
  - `userStats` is read-only for clients (CF-only writes).
  - `reactions` cannot be listed/queried by clients (anti-spam).
  - `reports` are user-create, admin-read/list/delete.

**Cloud Functions v2**

- Owns correctness of aggregates and "badge logic".
- Uses idempotency markers and ledger pairing to prevent drift.

---

### Realtime sync model (selected)

- Posts: subscribe or refetch the single `posts/{postId}` doc for `reactionCounts`, `badges`, and archived/read-only state.
- Comments: real-time thread updates via `onSnapshot` over `comments` for a post.
- Reactions: deterministic doc IDs allow single-doc checks (`getDoc` / optional single-doc `onSnapshot`) without listing the reactions collection.

---

## Data model (high level)

> Names may evolve, but the core split is stable.

- `posts/{postId}`
  - content fields, `deleted`, `archived`, tags, category
  - `reactionCounts: { idea, hot, powerup }` (backend-authoritative)
  - `badges` + `lastHotAt` for trending expiry
- `comments/{commentId}`
  - `postId`, `parentId` (threading), `deleted`, timestamps
- `users/{uid}`
  - profile fields + `role` + public `badges`
- `userStats/{uid}`
  - server-owned aggregates (CF-only writes)
  - used by Dashboard Stats (monthly activity + restore/delete counters)
- `reactions/{postId__uid__type}`
  - deterministic toggle docs (no list/query)
- `reactionLedger/{reactionId}` + `processedEvents/{type__eventId}`
  - internal correctness collections (deny all client access)
- `users/{uid}/savedPosts/{postId}`
  - `savedAt` + snapshot meta (`postTitleAtSave`, `postUpdatedAtAtSave`)
- `reports/{compositeReportId}`
  - user create / admin review

---

## Cloud Functions v2 (inventory)

**Region:** `europe-central2` (via `setGlobalOptions`)  
**Runtime:** Node 18  
**Patterns:** idempotency markers (`processedEvents`) + per-reaction ledger (`reactionLedger`) + stale guards

### Quick scan

| Function                                  | Trigger / type                      | What it does                                                | Touches                                                         |
| ----------------------------------------- | ----------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `ping`                                    | HTTP `onRequest`                    | Healthcheck (`pong`)                                        | -                                                               |
| `deletePostCascade`                       | Callable `onCall`                   | Hard delete cascade (author/admin) + Cloudinary best-effort | posts, comments, reactions, userStats, cloudinary               |
| `deleteCommentAndChildren`                | Callable `onCall`                   | Hard delete comment subtree (batched)                       | comments                                                        |
| `softDeleteComment`                       | Callable `onCall`                   | Soft delete comment (author/admin)                          | comments                                                        |
| `addCommentSecure`                        | Callable `onCall`                   | Create comment + rate limit + validation                    | comments                                                        |
| `updateUserStatsOnPostCreateV2`           | Firestore `onCreate posts/{postId}` | Increment author stats (monthly + total)                    | posts, userStats, processedEvents                               |
| `bumpRestoredOnPostUpdate`                | Firestore `onUpdate posts/{postId}` | Detect restore and bump stats                               | posts, userStats, processedEvents                               |
| `cleanupExpiredPostsV2`                   | Scheduler (daily)                   | Purge Trash posts older than 30d (cascade)                  | posts, comments, reactions, userStats, cloudinary               |
| `expireTrendingPostsV2`                   | Scheduler (daily)                   | Expire trending by `lastHotAt` (>7d)                        | posts                                                           |
| `reactionsIdeaOnCreateV2 / OnDeleteV2`    | Firestore triggers                  | Maintain `idea` counts + Most Inspiring badge               | reactions, posts, thresholds, ledger, markers                   |
| `reactionsHotOnCreateV2 / OnDeleteV2`     | Firestore triggers                  | Maintain `hot` counts + trending badge + `lastHotAt`        | reactions, posts, thresholds, ledger, markers                   |
| `reactionsPowerupOnCreateV2 / OnDeleteV2` | Firestore triggers                  | Maintain `powerup` counts + Top Contributor latch           | reactions, posts, userStats, users, thresholds, ledger, markers |

> “Touches” = main collections/services involved. Full reads/writes below.

<details>
<summary><b>Detailed reads/writes (expand)</b></summary>

#### HTTP

- `ping`
  - **Reads:** -
  - **Writes:** -

#### Callables (onCall)

- `deletePostCascade`
  - **Reads:** `posts/{postId}`, `users/{uid}` (role), reactions by `postId`, comments by `postID`
  - **Writes:** deletes `reactions/*`, `comments/*`, `posts/{postId}`; updates `userStats/{authorId}`; Cloudinary destroy (best-effort)

- `deleteCommentAndChildren`
  - **Reads:** `comments/{commentId}`, children by `parentID`
  - **Writes:** deletes multiple `comments/*` (batched <= 500)

- `softDeleteComment`
  - **Reads:** `comments/{commentId}`, `users/{uid}` (role)
  - **Writes:** updates `comments/{commentId}` (`deleted:true`, `deletedAt`)

- `addCommentSecure`
  - **Reads:** rate-limit query over `comments` (by `userID` + `timestamp`)
  - **Writes:** creates `comments/{newId}`

#### Firestore triggers

- `updateUserStatsOnPostCreateV2`
  - **Reads:** `posts/{postId}`, `userStats/{userId}`, `processedEvents/{event.id}`
  - **Writes:** updates/creates `userStats/{userId}`; writes `processedEvents/{event.id}` (+ `expiresAt`)

- `bumpRestoredOnPostUpdate`
  - **Reads:** `posts/{postId}` before/after, `userStats/{userId}`, `processedEvents/{event.id}`
  - **Writes:** updates/creates `userStats/{userId}`; writes `processedEvents/{event.id}` (+ `expiresAt`)

- Reactions (IDEA/HOT/POWERUP)
  - **Reads:** `reactions/{reactionId}`, `posts/{postId}`, `appSettings/reactionThresholds`, `reactionLedger/{reactionId}`, `processedEvents/*`
  - **Writes:** updates `posts.reactionCounts.*`, `posts.badges.*`, `posts.lastHotAt` (HOT); updates `userStats` (POWERUP); mirrors badge into `users` (Top Contributor); ledger + markers

#### Schedulers

- `cleanupExpiredPostsV2`
  - **Reads:** `posts` where `deleted == true` and `deletedAt <= now-30d`
  - **Writes:** cascade deletes + `userStats.permanentlyDeletedPosts` bump + Cloudinary best-effort cleanup

- `expireTrendingPostsV2`
  - **Reads:** `posts` where `badges.trending == true` and `lastHotAt` cutoff (or legacy `null`)
  - **Writes:** sets `posts/{postId}.badges.trending=false`

</details>

## Backend correctness highlights

### 1) Deterministic reaction toggles (client contract)

Reaction doc id: `postId__uid__reactionType`

Client can only:

- `get` (check active)
- `create` (toggle on)
- `delete` (toggle off)

Client cannot:

- `list` reactions
- `update` reactions

This reduces spam vectors and keeps the model simple.

### 2) Reactions: idempotency + stale guards + ledger pairing

Cloud Functions handle out-of-order events and retries.

Problems handled:

- stale create (create arrives after delete)
- stale delete (delete arrives after re-create)
- orphan delete (decrement without prior increment -> drift)

Final approach:

- Idempotency markers keyed by `event.id` (`processedEvents/{type__eventId}`)
- Stale guards:
  - onCreate verifies doc still exists
  - onDelete verifies doc not recreated
- Ledger pairing:
  - `reactionLedger/{reactionId}.active` determines whether an increment was actually applied
  - decrement only happens if ledger says it was counted
- All decrements clamp counters to `>= 0`

### 3) Trending badge: count rule + time expiry

- Count rule: HOT reaction count crosses threshold -> `badges.trending = true`
- Time rule: daily scheduler expires trending if `lastHotAt < now - 7 days` (or missing for legacy edge-cases)

### 4) Powerup: Top Contributor latch

- Powerup increments post + author stats.
- Self-powerup is rejected.
- Top Contributor is **latched** when threshold is crossed (badge remains true even if counts later decrease).
- Badge is mirrored into `users/{uid}` for public UI.

### 5) Cascade hard delete (callable)

Callable: `deletePostCascade`

- allowed: post author OR admin
- deletes in order:
  1. reactions
  2. comments
  3. post
- best-effort Cloudinary asset destroy (if `imagePublicId` exists)
- stats bump applies to the **authorId** (not requestor)

### 6) Comment deletion permissions

Callable: `softDeleteComment`

- allowed: comment author OR admin
- sets `deleted: true` + `deletedAt`

---

## Firestore security rules (key policies)

- `userStats`:
  - read: self-only
  - write: denied (CF-only)
- `reports`:
  - create: any authed user (must match `reportedBy`)
  - read/list/delete: admin-only
- `reactions`:
  - list/query: denied
  - get/create/delete: allowed only in deterministic contract
- `users` (public profiles):
  - `get` allowed
  - `list` denied (prevents user enumeration)
- internal collections (`processedEvents`, `reactionLedger`):
  - deny all client access

---

## UX engineering highlights

- Consistent cursor pagination pattern across pages:
  - `limit(N)` + `startAfter(lastDoc)` + duplicate-safe append (Map merge by `id`)
  - a11y helpers: `aria-busy`, `aria-disabled`, end-of-list message with `aria-live="polite"`
- Safe author handling:
  - `users` allows single `get` but denies `list` (prevents enumeration)
  - missing author docs surface as not-found (UI falls back to "Unknown author" + default avatar)
- Reaction UI hardening:
  - transaction-based toggle + short cooldown; disabled when archived (read-only)

- Centralized toast utilities (stable IDs + anti-spam).
- Undo toast (Saved -> Unsave):
  - optimistic remove
  - 7s undo window
  - deferred DB write
  - rollback on DB error
- Skeleton system (initial load + load-more placeholders).
- Modal standards:
  - ESC to close
  - backdrop click to close
  - body scroll lock
- Responsive layout:
  - mobile sheet patterns (filters, comments)
  - dynamic grid behavior on larger screens
- "UI-safe normalization":
  - invalid Firestore docs are skipped (with warnings)
  - missing authors get a fallback UI object

---

## CI / Code quality

- GitHub Actions CI runs on push/PR to `main`: `npm install` → `npm run lint` → `npm run build`.
- ESLint + Prettier for consistent code style.
- Optional Husky pre-commit hooks (if enabled).

---

## Local development

### Prereqs

- Node **20** for the app
- Node **18** for Cloud Functions runtime
- npm only (no yarn)
- Firebase CLI (`firebase --version`)
- (Optional) nvm

### Install

```bash
npm install
```

### Environment

Create a `.env` in project root (not committed). Provide `.env.example` in the repo.

Typical Firebase variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Security note: The Firebase web API key is restricted by HTTP referrers (allowed domains only).

### Run

```bash
npm run dev
```

Vite dev server: `http://localhost:5173`

### Lint / build

```bash
npm run lint
npm run build
```

Build output: `dist/`

---

## Deploy notes

### Cloud Functions

- Functions runtime: Node 18
- Firebase Functions v2
- Region: `europe-central2`

Deploy examples:

```bash
firebase deploy --only functions
firebase deploy --only hosting
```

### Environments: staging vs production

`.firebaserc` aliases reduce "wrong project deploy" risk:

- `staging`
- `prod`

Staging build example:

```bash
npm run build -- --mode staging
firebase deploy --only hosting --project staging
```

---

## Operations

- Staging Firestore backups are automated (GCS bucket + Workflows + Cloud Scheduler), scheduled weekly.
- Bucket lifecycle policy deletes backup objects older than 30 days (cost control).

---

## Testing

- Automated tests are planned (CI currently focuses on lint/build discipline).

---

## Gotchas / Lessons learned

- **Retries + out-of-order events.** Firestore triggers can re-run; reaction counters needed idempotency markers (`processedEvents`) and explicit skip reasons to avoid double-apply.
- **Gen2 callable "CORS" can be an auth issue.** A Cloud Run invoker misconfig can surface as a browser CORS preflight failure; verify Cloud Run unauthenticated invocations + composite indexes early.
- **Fast toggles create race conditions.** Reactions needed stale guards (`stale_create` / `stale_delete`) so we don’t apply outdated creates/deletes during rapid user toggling.
- **Counters drift unless you track "was it counted?".** `reactionLedger` became a per-reaction source of truth: decrement only if the ledger says the increment was applied.
- **TTL is not correctness.** Firestore TTL deletion is async; we use TTL only to clean technical markers, never as a correctness mechanism.
- **Soft delete + scheduled purge is safer.** Trash uses a restore window, while a scheduler enforces retention and keeps the DB clean without risky "delete now" UX.
- **Self-interaction rules.** POWERUP rejects self-powerups at the backend to prevent gaming; UI also communicates this clearly.
- **Firestore indexes are part of production reality.** Any real query mix (`where` + `orderBy`) will eventually require composite indexes - build expecting that.
- **External cleanup must be best-effort.** Cloudinary deletes should never crash a hard-delete flow; the app should still delete DB data even if external cleanup fails.
- **Batch limits shape architecture.** The 500 writes-per-batch limit directly influenced how cascade deletes and subtree deletes are implemented.

---

## Roadmap

- Expand moderation workflows (review queue + actions log)
- Migrate off legacy Functions config approach
- Add tests + CI expansion
- Optional social login providers

---

## Author

Created by Aleksandar Todorovic.
