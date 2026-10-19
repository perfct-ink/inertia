---
priority: p2
depends_on: []
components: [frontend, backend]
---
# Collaborate on entire folders

## Objective

**Collaborate on entire folders** (Alex, 2026-10-13): invite named people to a folder with viewer / commenter / editor / owner roles; access covers every document, file, task and sub-folder inside it

## Current state

Today each Space belongs to one user (`workspaces.user_id`) and sharing is by anonymous token link only. Needs a `folder_memberships` table (user, folder, role), inherited by sub-folders, plus invite-by-email and a "Shared with me" list. Real-time co-editing already exists via `collab-server`.

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Collaborate on entire folders works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
