---
priority: p1
depends_on: []
components: [frontend]
---
# Epic and feature planning view

## Objective

**Epic and feature planning view** (Alex, 2026-10-13): plan tasks by epic or by feature. Pick an epic or a feature (`feature-folder-type.md`, `feature-hierarchy.md`), see its tasks grouped by status, drag tasks from the backlog into it, set dates/estimates, and see its rollup

## Current state

Today tasks can be assigned an epic (`tasks.epic_id`) and `EpicsPage.tsx` lists epics with progress, but there's no planning screen. Feature planning needs `feature-hierarchy.md` and `create-tasks-from-a-feature-doc.md`.

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Epic and feature planning view works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
