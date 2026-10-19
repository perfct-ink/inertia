---
priority: p1
depends_on: []
components: [frontend, backend]
---
# Table view with inline editing, grouping, column show/hide, sort, filter

## Objective

Table view with inline editing, grouping, column show/hide, sort, filter

## Current state

Task list exists; check grouping/filter coverage

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Table view with inline editing, grouping, column show/hide, sort, filter works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
