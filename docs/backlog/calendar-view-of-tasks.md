---
branch: backlog/calendar-view-of-tasks
priority: p1
depends_on: []
components: [frontend]
---
# Calendar view of tasks (not only events)

## Objective

Calendar view of tasks (not only events)

## Current state

Events have list/month views

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Calendar view of tasks (not only events) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests. To verify: `cd frontend && npm install && npm run lint && npm test`, then open /calendar in a browser at desktop and phone widths, in light and dark. None of that could run here (no node_modules). Then remove this file and merge.
