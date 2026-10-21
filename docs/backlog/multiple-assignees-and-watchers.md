---
priority: p1
branch: backlog/multiple-assignees-and-watchers
depends_on: []
---
# Multiple assignees (People) and watchers

## Objective

Multiple assignees (People) and watchers

## Requirements / notes

Today: single `assignee_id`.

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Multiple assignees (People) and watchers works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests; see `docs/features/task_assignees_and_watchers.md`. Not run (no network, node_modules or database): `rails db:migrate` (then diff `backend/db/schema.rb`, which was hand-edited), `rails test`, `cd frontend && npm install && npm run lint && npm test`, and a look at /tasks in a browser. Then remove this file and merge.
