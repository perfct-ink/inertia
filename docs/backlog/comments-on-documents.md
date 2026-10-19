---
priority: p2
depends_on: [collaborate-on-entire-folders]
components: [backend]
---
# Comments on documents

## Objective

**Comments on documents** (Alex, 2026-10-13): others can comment on a document, either on a highlighted passage (inline) or on the document as a whole, with replies, @mentions, resolve/reopen and notifications

## Current state

No Comment model in the backend. Default: one polymorphic `comments` table shared with `comments-on-items.md`, with an optional anchor (text range in the doc) for inline comments. Needs commenter role from `collaborate-on-entire-folders.md`.

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Comments on documents works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
