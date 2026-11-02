---
priority: p2
depends_on: []
components: [frontend, backend]
branch: backlog/collaborate-on-entire-folders
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

## Blocked
Incomplete. The agent working on this task was stopped before it finished, so the work so far is committed as it stood. Nothing was run beyond what the commit message lists. To finish: read the diff against main (`git diff origin/main...backlog/collaborate-on-entire-folders`), complete the requirements and acceptance criteria above, write or update the feature doc in `docs/features/` and its README row, merge the current main in, run the checks (`cd frontend && npm install && npm run lint && npm test`, `cd backend && rails db:migrate && rails test`), then remove this file.
