---
branch: backlog/notifications-inbox
priority: p2
depends_on: []
---
# Notifications inbox

## Objective

Notifications inbox

## Current state

None

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Notifications inbox works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests (the first source is task assignment). `Task#actor` here overlaps `Task#status_changed_by` on `backlog/status-change-history`; when both merge, use one accessor. To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand), `cd frontend && npm install && npm run lint && npm test`, then assign a task to another user and check their inbox in a browser. None of that could run here. Then remove this file and merge; `ongoing-tasks-with-check-ins` is then unblocked.
