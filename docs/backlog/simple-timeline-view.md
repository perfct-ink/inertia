---
branch: backlog/simple-timeline-view
priority: p1
depends_on: []
components: [frontend]
---
# Timeline view (simpler than Gantt: bars, no dependencies)

## Objective

Timeline view (simpler than Gantt: bars, no dependencies)

## Current state

None

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Timeline view (simpler than Gantt: bars, no dependencies) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests. To verify: `cd frontend && npm install && npm run lint && npm test`, then open /timeline in a browser with dated tasks. None of that could run here (no node_modules). Then remove this file and merge.
