---
priority: p2
depends_on: [custom-fields-on-tasks]
components: [frontend, backend]
---
# Filter and sort tasks by a custom field

## Objective

Custom fields on tasks can be shown and used in the places tasks are listed: filter the Tasks page by a custom field's value, sort by it, and show a field as a column in table-style task views.

## Requirements / notes

- Tasks (`/tasks`) can be filtered by one or more custom field values (equals for text/boolean, range for numbers and dates) and sorted by a field. The filter belongs in `GET /api/v1/tasks` (`task_field_values` is already preloaded there) and the pure matching and sorting functions in `frontend/src/data/taskField.ts`.
- Values are stored as JSON in `task_field_values.value`, so a range filter or sort on `integer`, `number`, `date` and `datetime` fields needs a cast in SQL (or an in-Ruby filter while Spaces stay small); decide and note which.
- Show the same tags (`TaskFieldsCell`) on the other task lists (folder page task list, hierarchy tree, Gantt row label) or deliberately leave them out.
- Today only the Tasks page (Backlog and Workboard) shows the values; folder contents and events do not send `custom_fields`.

## Context

Split out of `custom-fields-on-tasks` on 2026-11-01. Related: `saved-views-per-user-and-shared-views-saved-filters.md`, `data-files-filtering-sorting-and-api-enums.md`, `table-view-inline-editing.md`.

## Acceptance criteria

- A signed-in member of the Space can filter and sort the Tasks page by a custom field, in the web app, at phone width as well as desktop.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; the feature doc `docs/features/task_custom_fields.md` is updated and this file is removed.
