# LifeRecompiled

LifeRecompiled is a portfolio-grade full-stack web app that started as a simple "blog app" and evolved into a small developer/community platform.

Users can create posts, join discussions, react to content, save posts, manage their own content, and interact inside a small community-style platform with moderation, profile, and dashboard features.

## TL;DR

- Community-style posts, comments, reactions, saved posts, profiles, and moderation
- Backend-authoritative aggregates via Cloud Functions v2
- Deterministic reactions + idempotency ledger to prevent counter drift
- Soft delete + scheduled purge workflow (Trash -> permanent delete)
- Staging vs production discipline for safer deploys

The project focuses on **production-like engineering problems**:

- Data integrity under retries and race conditions
- Role-based access control (user vs admin)
- Backend-authoritative aggregates (counts, badges, stats)
- Robust pagination + UI-safe normalization
- Polished UX (undo flows, skeletons, modals, responsive layout)

---

## Demo

- Live: [liferecompiled.com](https://liferecompiled.com)
- Repository: [GitHub](https://github.com/cole92/liferecompiled)
- Public About page: `/about`
- Support & feedback: `/report` (auth-only)

---

## Table of contents

- [Tech stack](#tech-stack)
- [Key product features](#key-product-features)
- [Architecture at a glance](#architecture-at-a-glance)
- [Key engineering decisions](#key-engineering-decisions)
- [Data model (high level)](#data-model-high-level)
- [Cloud Functions v2](#cloud-functions-v2)
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

- Email/password auth: Register, Login, Forgot password (privacy-safe reset messaging)
- Email verification gate via global AuthProvider guard
- Session-safe verify flow with timeout-protected reload and anti-spam toasts
- Protected dashboard routes and admin-only moderation access

### Feed (Home)

- Global feed with **cursor pagination** (`startAfter`) and configurable page size
- Sort modes: Newest / Oldest / Trending
- Trending sort uses query-based filtering: `badges.trending == true` + stable ordering by `lastHotAt desc, createdAt desc`
- Category filtering with sort constraints
- Skeleton loading + clear end-of-list messaging

### Posts

- Create post with title, optional description, content, category, and tags
- Tags: max 5, each up to 20 chars, validated against a restricted character set
- Edit window limited to the first **7 days** after creation
- Manual archive mode makes posts visibly read-only
- Trash flow with restore window and Firestore-backed TTL filter queries

### Comments

- Comment authors can edit for **10 minutes** after posting
- Threaded replies with multi-level nesting
- Soft delete replaces content with a placeholder
- Comment likes + “people who liked this” modal
- Progressive loading with compact preview states
- Mobile-first comments UX using a sheet pattern

### Saved posts

- Save/unsave with **Undo** using a deferred write flow
- Robust join strategy via `Promise.allSettled`
- Ghost saved cards when the source post is missing or unavailable
- Snapshot metadata at save time, including “Updated since saved” support

### Dashboard & profiles

- Backend-powered dashboard stats from `userStats/{uid}`
- Monthly activity chart + Trash action ratios
- Server-side title search for My Posts
- Public profile pages with top posts, engagement stats, and zoomable avatars
- Settings flow for name, bio, and profile image upload/repositioning

### Moderation & support

- Admin moderation dashboard with report review and deep links to targets
- Admin actions: hard delete post cascade, soft delete comments
- Auth-only support/feedback route at `/report`
- Multiple report categories + optional reproduction steps + debug context helpers

---

## Architecture at a glance

**Client (React + Vite)**

- Reads posts, comments, profiles, and saved lists with cursor pagination
- Writes only safe, user-owned data
- Uses deterministic IDs for reaction toggles

**Platform services**

- **Firebase Auth** for authentication and verification state
- **Firestore** for canonical app data
- **Cloud Functions v2** for aggregates, badge logic, cleanup, and privileged mutations
- **Cloudinary** for image hosting and best-effort asset cleanup
- **Firebase Hosting** for deployment and custom domain delivery

### Realtime sync model (selected)

- Posts: subscribe or refetch the single `posts/{postId}` doc for `reactionCounts`, `badges`, and archived/read-only state
- Comments: real-time thread updates via `onSnapshot` over `comments` for a post
- Reactions: deterministic doc IDs allow single-doc checks (`getDoc` / optional single-doc `onSnapshot`) without listing the reactions collection

---

## Key engineering decisions

- Reaction counts are **backend-authoritative** and maintained by Cloud Functions rather than trusted client writes
- Reaction documents use **deterministic IDs** to simplify toggles and prevent duplicate state
- **Idempotency markers** and a **reaction ledger** prevent counter drift during retries or out-of-order events
- `userStats` is **server-owned** and read-only to clients
- Internal correctness collections are fully blocked from client access
- Trash and purge flows are separated to make deletion safer and more recoverable

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
  - `savedAt` + snapshot metadata (`postTitleAtSave`, `postUpdatedAtAtSave`)
- `reports/{compositeReportId}`
  - user create / admin review

---

## Cloud Functions v2

**Region:** `europe-central2`  
**Runtime:** Node 18  
**Patterns:** idempotency markers (`processedEvents`) + per-reaction ledger (`reactionLedger`) + stale guards

### Inventory

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

---

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
- Time rule: daily scheduler expires trending if `lastHotAt < now - 7 days` (or missing for legacy edge cases)

### 4) Powerup: Top Contributor latch

- Powerup increments post + author stats
- Self-powerup is rejected
- Top Contributor is **latched** when threshold is crossed (badge remains true even if counts later decrease)
- Badge is mirrored into `users/{uid}` for public UI

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

- `userStats`
  - read: self-only
  - write: denied (CF-only)
- `reports`
  - create: any authed user (must match `reportedBy`)
  - read/list/delete: admin-only
- `reactions`
  - list/query: denied
  - get/create/delete: allowed only in deterministic contract
- `users` (public profiles)
  - `get` allowed
  - `list` denied (prevents user enumeration)
- internal collections (`processedEvents`, `reactionLedger`)
  - deny all client access

---

## UX engineering highlights

- Consistent cursor pagination pattern across pages:
  - `limit(N)` + `startAfter(lastDoc)` + duplicate-safe append (Map merge by `id`)
  - a11y helpers: `aria-busy`, `aria-disabled`, end-of-list message with `aria-live="polite"`
- Safe author handling:
  - `users` allows single `get` but denies `list` (prevents enumeration)
  - missing author docs surface as not-found with fallback UI (`Unknown author` + default avatar)
- Reaction UI hardening:
  - transaction-based toggle + short cooldown
  - disabled when archived (read-only)
- Centralized toast utilities with stable IDs and anti-spam behavior
- Undo toast flow for Saved Posts:
  - optimistic remove
  - 7s undo window
  - deferred DB write
  - rollback on DB error
- Skeleton system for initial and incremental loading states
- Modal standards:
  - ESC to close
  - backdrop click to close
  - body scroll lock
- Responsive layout:
  - mobile sheet patterns (filters, comments)
  - dynamic grid behavior on larger screens
- UI-safe normalization:
  - invalid Firestore docs are skipped with warnings
  - missing authors receive fallback UI objects

---

## CI / Code quality

- GitHub Actions CI runs on push / pull request to `main`: `npm install` -> `npm run lint` -> `npm run build`
- ESLint + Prettier for consistent code style
- Optional Husky pre-commit hooks (if enabled locally)

---

## Local development

### Prereqs

- Node **20** for the app
- Node **18** for Cloud Functions runtime
- npm only (no yarn)
- Firebase CLI (`firebase --version`)
- Optional: nvm

### Install

```bash
npm install
```

### Environment

Create a `.env` in the project root (not committed). Provide `.env.example` in the repo.

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

`.firebaserc` aliases reduce wrong-project deploy risk:

- `staging`
- `prod`

Staging build example:

```bash
npm run build -- --mode staging
firebase deploy --only hosting --project staging
```

---

## Operations

- Staging Firestore backups are automated (GCS bucket + Workflows + Cloud Scheduler), scheduled weekly
- Bucket lifecycle policy deletes backup objects older than 30 days for cost control

---

## Testing

- Automated tests are a planned next step
- Current quality gates focus on linting, production builds, and manual end-to-end verification of core flows

---

## Gotchas / Lessons learned

- **Retries + out-of-order events.** Firestore triggers can re-run, so reaction counters needed idempotency markers (`processedEvents`) and explicit skip reasons to avoid double-apply.
- **Gen2 callable "CORS" can hide an auth issue.** A Cloud Run invoker misconfiguration can surface as a browser CORS preflight failure, so verify Cloud Run unauthenticated invocation settings and required composite indexes early.
- **Fast toggles create race conditions.** Reactions needed stale guards (`stale_create` / `stale_delete`) so outdated events are not applied during rapid user toggling.
- **Counters drift unless you track whether something was counted.** `reactionLedger` became the per-reaction source of truth: decrement only if the ledger says the increment was applied.
- **TTL is not correctness.** Firestore TTL deletion is async; TTL is used only to clean technical markers, never as a correctness mechanism.
- **Soft delete + scheduled purge is safer.** Trash provides a restore window, while a scheduler enforces retention and keeps the database clean without risky immediate-delete UX.
- **Self-interaction rules matter.** POWERUP rejects self-powerups at the backend to prevent gaming, while the UI communicates the rule clearly.
- **Firestore indexes are part of production reality.** Any real query mix (`where` + `orderBy`) will eventually require composite indexes, so it is better to design expecting that.
- **External cleanup must be best-effort.** Cloudinary deletes should never crash a hard-delete flow; the app should still delete database data even if asset cleanup fails.
- **Batch limits shape architecture.** The 500 writes-per-batch limit directly influenced cascade delete and subtree delete strategies.

---

## Roadmap

- Expand moderation workflows (review queue + actions log)
- Migrate off legacy Functions config approach
- Add tests + CI expansion
- Optional social login providers

---

## Author

Created by Aleksandar Todorovic.
