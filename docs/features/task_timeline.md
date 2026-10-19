# Task timeline

## What it does
`/timeline` (sidebar rail "Timeline") draws the Space's tasks as bars on a month axis: a bar from each task's start date to its due date (a task with only a due date is a one-day bar), ordered by start date, with a done/total count. "Group by epic" switches to epic rows each followed by its tasks (the same grouping the folder Gantt uses). It is deliberately simpler than the Gantt: no dependency arrows, no dragging, no critical path, no baselines. Tasks without a due date are not drawn; a line under the chart says how many.

## API and models
None: it reads `GET /api/v1/tasks` and `GET /api/v1/epics`. Rows come from `flatTaskRows` (new) and `groupGanttRows` in `frontend/src/data/schedule.ts`; the chart is the shared `components/Timeline.tsx`; screen: `view/timeline/TimelineScreen.tsx`.

## Who can view and change
Anyone in the Space can view; nothing on this page changes data.

## Tests
`frontend/src/data/schedule.test.ts` (`flatTaskRows`), `frontend/src/view/timeline/TimelineScreen.test.tsx`.

## Known limits
- Whole Space only: no folder, sprint or assignee filter, and no zoom or weekend options (`docs/backlog/gantt-zoom-and-weekends.md`).
- Rows are not editable; change dates on the Workboard, the Gantt or the task itself.
- Epic grouping lists every epic even when it has no tasks, and an epic without dates shows as undated below the chart.

## History
- Implemented 2026-10-19 on branch `backlog/simple-timeline-view`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser were not run (no node_modules).
