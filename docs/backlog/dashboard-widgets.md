---
priority: p2
depends_on: [dashboards-across-folders-boards]
components: [backend]
---
# Dashboard widgets: number, progress and countdown

## Objective

Widgets you can add, remove and arrange on the dashboard: **number** (a count, e.g. open or overdue tasks), **progress** (a battery bar for a folder, epic or milestone) and **countdown** (days to a milestone).

## Requirements / notes

Split (Alex, 2026-11-09 groom): these three come first because they reuse rollups that exist. Chart, Gantt, workload, calendar and table widgets are `dashboard-view-widgets.md`, after this.

## Context

Section "Dashboards and reporting" of the retired shared backlog.

## Acceptance criteria

- Number, progress and countdown widgets work as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
