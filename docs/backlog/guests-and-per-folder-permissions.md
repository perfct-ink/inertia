---
priority: p2
depends_on: []
components: [frontend]
---
# Guests and per-board permissions (view-only, edit, owner)

## Objective

Guests and per-board permissions (view-only, edit, owner)

## Current state

`shares` exists: token links with view/edit on documents and folders; the `/shared/:token` page in the frontend is still a placeholder

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Guests and per-board permissions (view-only, edit, owner) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
