---
priority: p1
depends_on: []
---
# Progress (auto from subtasks), time tracking (start/stop timer, logged hours)

## Objective

Progress (auto from subtasks), time tracking (start/stop timer, logged hours)

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Progress (auto from subtasks), time tracking (start/stop timer, logged hours) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
