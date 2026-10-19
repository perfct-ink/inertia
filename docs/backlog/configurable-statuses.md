---
priority: p1
depends_on: []
components: [frontend]
---
# Configurable statuses (custom labels/colors per board)

## Objective

Configurable statuses (custom labels/colors per board)

## Requirements / notes

Today: fixed 5-value enum. Jira doc pushed back; still listed for parity.

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Configurable statuses (custom labels/colors per board) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
