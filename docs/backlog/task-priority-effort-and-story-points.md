---
branch: backlog/task-priority-effort-and-story-points
priority: p1
depends_on: []
---
# Priority, effort/estimate, story points (estimated/actual)

## Objective

Priority, effort/estimate, story points (estimated/actual)

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Priority, effort/estimate, story points (estimated/actual) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests; editing existing tasks needs a task detail view (`task-detail-edit-milestone`). To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand), `cd frontend && npm install && npm run lint && npm test`, then add a task with a priority and points on /tasks in a browser. None of that could run here. Then remove this file and merge; `workload-view` is unblocked by it.
