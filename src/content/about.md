# LifeRecompiled

## Overview

LifeRecompiled is a production-style React/Firebase application built as a product engineering case study.

It started as a simple blog app and evolved into a small community-style platform for publishing posts, discussing ideas, saving content, reporting issues, and managing user-owned content through a private dashboard.

The goal is not to imitate a large social platform. The goal is to demonstrate practical product engineering: data integrity, permissions, responsive UI, predictable UX states, backend-maintained logic, security rules, and deploy-ready infrastructure.

## What the app demonstrates

LifeRecompiled includes the core flows expected from a real full-stack product:

* public feed browsing with sorting, filtering, pagination, and post details
* email/password authentication with protected dashboard routes
* post creation, editing, archiving, soft delete, restore, and permanent delete flows
* threaded comments with replies, likes, reporting, and moderation-safe actions
* reactions connected to backend-owned counters and badge rules
* saved posts with Undo, sorting, pagination, and unavailable-post handling
* public profiles with bio, avatar, stats, highlights, and top posts
* dashboard sections for My Posts, Saved, Stats, Trash, and admin Moderation
* Support & feedback flow with useful debug context

## Engineering focus

The project focuses on correctness and maintainability rather than only visual CRUD screens.

Key implementation areas include:

* Firebase Auth and protected route handling
* Firestore data modeling for posts, users, comments, reactions, saved posts, reports, and user stats
* Cloud Functions for backend-owned counters, badge updates, cascade deletion, and scheduled maintenance
* role-based admin access through `users/{uid}.role`
* server-owned aggregate data through `userStats`
* deterministic reaction documents and idempotent backend processing
* responsive layouts for mobile, tablet, laptop, and desktop
* production-ready validation, smoke testing, and Firebase Hosting deployment

## Current status

The main MVP and redesign work are complete.

The app now has a polished dark-first product UI, a working dashboard, public browsing, reporting, moderation entry points, saved-post workflows, stats, comments, reactions, profiles, and support pages.

The remaining work is focused on future hardening and portfolio packaging, not rebuilding the core app.

## Roadmap

Planned follow-ups include:

* stronger moderation workflows
* review queue and moderation action history
* more automated tests and CI expansion
* additional production-readiness polish
* optional social login
* deeper analytics and profile insights

## Source

[GitHub repository](https://github.com/cole92/liferecompiled)
