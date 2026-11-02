---
priority: p2
depends_on: []
components: [backend]
branch: backlog/comments-on-items
---
# Comments ("Updates") on tasks, epics, initiatives, milestones, with @mentions and replies

## Objective

Comments ("Updates") on tasks, epics, initiatives, milestones, with @mentions and replies

## Current state

File-only extension; no backend Comment model

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Comments ("Updates") on tasks, epics, initiatives, milestones, with @mentions and replies works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Incomplete. The agent working on this task was cut off by the API daily cost limit (HTTP 429) before it finished, so the work so far is committed as it stood. Nothing was run beyond what the commit message lists. To finish: read the diff against main (`git diff origin/main...backlog/comments-on-items`), complete the requirements and acceptance criteria above, write or update the feature doc in `docs/features/` and its README row, run the checks (`cd frontend && npm install && npm run lint && npm test`, `cd backend && rails db:migrate && rails test`), then remove this file.
