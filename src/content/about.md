# LifeRecompiled — About

**Growth requires structure — and structure requires discipline.**

LifeRecompiled is a portfolio-grade full-stack web app that started as a simple “blog app” and evolved into a small developer/community platform.

It focuses on real product problems: reliable data integrity, permissions, UX polish, and deploy-ready infrastructure — not just “CRUD screens”.

It’s not trying to compete with big social platforms.  
It’s a small, practical product — built step by step — and a proof of work.

---

## What you can do in the app

### Public (guest)
- Browse the feed (cursor pagination + stable ordering).
- Sort posts (Newest / Oldest / Trending) and filter by category.
- Open any post and read comments + reactions.
- View public profiles (`/profile/:uid`) and author info.

> Guests can browse, but actions like commenting/saving/liking are gated with clear UX prompts.

### Auth & onboarding
- Email/password auth: Register, Login, Forgot password.
- Email verification gate before the app treats the user as “fully logged in”.
- Protected routes for dashboard features.

### Posts
- Create posts with title + optional description + main content, category, tags.
- Edit your own posts (time-limited edit window).
- Archive posts (read-only: disables interactions like comments/reactions).
- Soft delete to Trash (restore window) + hard delete (cascade when allowed).

### Comments
- Threaded comments (multi-level replies; depth-limited).
- Comment likes + “people who liked this” modal.
- Permissions: author can delete own comment; admin can delete too.
- Mobile-first comments UX (sheet pattern on small screens).

### Reactions + badges
- Deterministic per-user reaction toggles: Idea / Hot / Powerup.
- Post badges (e.g. Trending) and a user badge (Top Contributor) are driven by backend rules.

### Saved posts
- Save/unsave with Undo (prevents accidental removals).
- Handles “ghost saved posts” (if the original post disappears later).
- Save snapshot metadata (e.g. “Updated since saved”).

### Dashboard
- My Posts: Active/Archived/All filters, search by title, pagination.
- Saved: sort modes + pagination + ghost handling + Undo.
- Stats: charts for monthly posting activity + restore/delete ratio.
- Trash: restore or delete permanently.
- Moderation (admin): view reports and jump to target content.

### Profile & settings
- Public profile with highlights + top posts.
- Name + bio editing + profile picture.
- Image upload via Cloudinary (with repositioning).

### Support & feedback (auth-only)
- A structured Support & Feedback page for bug reports, UX issues, feature requests, etc.
- Available from the avatar menu once logged in.
- Includes useful debug context to make reports actionable.

---

## Behind the scenes (engineering focus)

### Data model (high level)
Firestore collections include:
- `posts` (content, tags, category, deleted/archived flags, reactionCounts, badges)
- `comments` (threading via parentId + postId)
- `reactions` (deterministic doc IDs)
- `userStats` (authoritative aggregates; server-managed)
- `users` (profile + role + public badge mirror)
- `reports` (moderation targets)

### Backend architecture: correctness-first
Reactions and badges are backend-owned and retry-safe via Cloud Functions v2:
- Idempotency markers (event IDs)
- Stale guards (create/delete races)
- Ledger pairing (prevents counter drift)

Trending is both:
- Count-driven (threshold-based)
- Time-driven (scheduled expiry)

Admin is derived from `users/{uid}.role` (not custom claims) and exposed to the UI via AuthContext.

`userStats` is treated as server-owned source of truth; the client reads it but does not write aggregates.

---

## Environments & deploy discipline
- Clear staging vs prod separation (Firebase project aliases).
- Frontend uses separate env configs; env files are not committed.
- Secrets are not stored in VITE_ env.
- Cloudinary config is managed via Firebase Functions runtime config (staging/prod).
- Node policy: app on Node 20, functions runtime Node 18.

---

## Links
- GitHub (source + docs): https://github.com/cole92/react-blog

---

## Roadmap (next)
- Social login (Google/GitHub)
- Stronger moderation workflows (review queue, actions log)
- Add tests + CI expansion