# LifeRecompiled — About

**Growth requires structure — and structure requires discipline.**

LifeRecompiled is a portfolio-grade full-stack web app that started as a simple blog app and evolved into a small community-style platform for writing, discussion, feedback, and moderation.

It focuses on real product problems: reliable data integrity, permissions, UX polish, and deploy-ready infrastructure — not just “CRUD screens”.

It is not trying to compete with large social platforms.  
It is a small, practical product — built step by step — and a proof of work.

---

## What you can do in the app

### Public (guest)

- Browse the feed with cursor pagination and stable ordering
- Sort posts (Newest / Oldest / Trending) and filter by category
- Open any post and read comments + reactions
- View public profiles (`/profile/:uid`) and author info

> Guests can browse freely, but actions like commenting, saving, and reacting are gated with clear UX prompts.

### Auth & onboarding

- Email/password auth: Register, Login, Forgot password
- Email verification gate before the app treats the user as fully logged in
- Protected routes for dashboard features

### Posts

- Create posts with title, optional description, content, category, and tags
- Edit your own posts within a time-limited edit window
- Archive posts (read-only mode disables interactions like comments and reactions)
- Soft delete to Trash with a restore window
- Hard delete with cascade behavior when allowed

### Comments

- Threaded comments with multi-level replies
- Comment likes + “people who liked this” modal
- Permissions: comment authors can delete their own comments; admins can delete them too
- Mobile-first comments UX with a sheet pattern on smaller screens

### Reactions + badges

- Deterministic per-user reaction toggles: Idea / Hot / Powerup
- Post badges (such as Trending) and the user badge (Top Contributor) are driven by backend rules

### Saved posts

- Save / unsave with Undo to prevent accidental removals
- Handles ghost saved posts if the original post disappears later
- Stores snapshot metadata such as “Updated since saved”

### Dashboard

- My Posts: Active / Archived / All filters, search by title, pagination
- Saved: sort modes, pagination, ghost handling, Undo
- Stats: charts for monthly posting activity + restore/delete ratio
- Trash: restore or delete permanently
- Moderation (admin): view reports and jump to target content

### Profile & settings

- Public profile with highlights + top posts
- Name + bio editing + profile picture
- Image upload via Cloudinary with repositioning support

### Support & feedback (auth-only)

- A structured Support & Feedback page for bug reports, UX issues, feature requests, and more
- Available from the avatar menu once logged in
- Includes useful debug context to make reports more actionable

---

## Behind the scenes (engineering focus)

### Data model (high level)

Firestore collections include:

- `posts` (content, tags, category, deleted/archived flags, reaction counts, badges)
- `comments` (threading via `parentId` + `postId`)
- `reactions` (deterministic doc IDs)
- `userStats` (authoritative aggregates; server-managed)
- `users` (profiles, roles, and public badge state)
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

`userStats` is treated as a server-owned source of truth; the client reads it but does not write aggregates.

---

## Environments & deploy discipline

- Clear staging vs production separation through Firebase project aliases
- Frontend uses separate env configs; env files are not committed
- Secrets are managed outside the client and are not committed to the repository
- Cloudinary is used for image storage and cleanup flows
- Node policy: app on Node 20, functions runtime on Node 18

---

## Source

- GitHub (source + docs): https://github.com/cole92/liferecompiled

---

## Roadmap (next)

- Social login (Google / GitHub)
- Stronger moderation workflows (review queue, actions log)
- Add tests + CI expansion
