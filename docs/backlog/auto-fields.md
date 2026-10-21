---
priority: p1
branch: backlog/auto-fields
depends_on: []
---
# Auto fields: item ID, creation log, last updated, created by

## Objective

Auto fields: item ID, creation log, last updated, created by

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Auto fields: item ID, creation log, last updated, created by works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented for tasks on the branch with tests; see `docs/features/task_auto_fields.md`. Collection rows are not covered. Not run (no network, node_modules or database): `rails db:migrate` (then diff `backend/db/schema.rb`, which was hand-edited), `rails test`, `cd frontend && npm install && npm run lint && npm test`, and a look at /tasks in a browser. Then remove this file and merge.
