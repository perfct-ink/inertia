---
branch: backlog/kanban-organize-by-epic
priority: p1
depends_on: []
components: [frontend, backend]
---
# Organize by epic

## Objective

Kanban: group by any field, swimlanes, WIP limits, configurable columns. Alex re-requested 2026-10-13, and asked specifically for **organize by epic** (swimlane per epic, plus a "No epic" lane), as an option you can toggle on or off

## Current state

Kanban exists on the fixed status enum (`/tasks?view=kanban`); the rest is missing

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Organize by epic works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Partial, on the branch: the organize-by-epic toggle with a lane per epic and a No epic lane (no drag and drop in lane mode). Still to do: group by any field, WIP limits, configurable columns, drag between lanes, add task in a lane. To verify: `cd frontend && npm install && npm run lint && npm test`, then try the toggle on the Workboard in a browser. None of that could run here. Leave this file on `main` until the rest ships.
