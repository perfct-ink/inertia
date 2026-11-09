---
priority: p2
depends_on: [dashboard-widgets]
components: [frontend]
---
# Dashboard widgets: chart, Gantt, workload, calendar and table

## Objective

More dashboard widget kinds, each embedding a view: **chart** (tasks by a field), **Gantt**, **workload**, **calendar** and **table**.

## Requirements / notes

Split from `dashboard-widgets.md` (Alex, 2026-11-09 groom), which builds the widget framework with number, progress and countdown first. Reuse the existing views (`docs/features/gantt_scheduling.md`, `workload.md`, `task_calendar.md`, `task_table.md`, `pivot.md`) in a compact widget size rather than building new ones.

## Context

Section "Dashboards and reporting" of the retired shared backlog.

## Acceptance criteria

- Each of the five widget kinds can be added to a dashboard, shows the scoped data, and links through to its full view.
- Works at 375px (widgets stack) and in light and dark mode. Failed API calls show an error to the user.
- Tests cover the new behaviour; the dashboard feature doc is updated and this file is removed.
