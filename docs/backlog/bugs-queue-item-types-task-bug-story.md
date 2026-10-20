---
priority: p2
branch: backlog/bugs-queue-item-types-task-bug-story
depends_on: []
---
# Bugs queue / item types (task, bug, story)

## Objective

Bugs queue / item types (task, bug, story)

## Context

Section "Agile" of the retired shared backlog.

## Acceptance criteria

- Bugs queue / item types (task, bug, story) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests; see `docs/features/task_kinds.md`. Not run (no network, no node_modules, no database): `rails db:migrate` (then diff `backend/db/schema.rb`, whose `kind` column and version line were hand-edited), `rails test`, `cd frontend && npm install && npm run lint && npm test`, and a look at /tasks in a browser. Then remove this file and merge.
