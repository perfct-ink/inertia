---
priority: p1
depends_on: []
components: [backend]
---
# Custom fields on tasks

## Objective

**Custom fields on tasks**, reusing the `table_fields` type system

## Requirements / notes

Today (checked 2026-11-09): Spaces can already define task fields of five kinds (tags, dropdown, checkbox, rating, vote) in their own `task_fields` / `task_field_values` tables (`docs/features/task_fields.md`), not the Collection `table_fields` type system. What's missing is the other common kinds: text, number, date, person, URL and so on.

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Custom fields on tasks works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
