# Workload

## What it does
`/workload` (sidebar rail "Workload") shows estimated hours per person per week for the next eight weeks. Each open (not done) task's estimate is spread evenly over the weekdays between its start date (or its due date, if it has no start) and its due date, then summed per assignee per week. A "Hours per week" field (default 40) sets the capacity; a week over it is marked in the cell with "over by N h" and a warning icon (text, not colour alone). Tasks with nobody assigned form an "Unassigned" row at the bottom. Open tasks with no estimate or no due date are not counted; a line under the table says how many.

## API and models
None: it reads tasks (`estimate_hours` from `backlog/task-priority-effort-and-story-points`) and Space members. Logic: `workload`, `hoursByWeek`, `weekStart`, `weekRange` in `frontend/src/data/workload.ts`; screen `view/workload/WorkloadScreen.tsx`. Stacked on `backlog/task-priority-effort-and-story-points` (merge it first).

## Who can view and change
Anyone in the Space can view; nothing here changes data.

## Tests
`frontend/src/data/workload.test.ts` (run with a small harness: all pass), `frontend/src/view/workload/WorkloadScreen.test.tsx`.

## Known limits
- One capacity for everyone (no per-person hours, leave or holidays), weeks fixed at the next eight, and no way to click through to a person's tasks.
- Hours are spread over Monday to Friday only; a task dated only on a weekend counts on its first day. Hours already worked (time tracking) are not subtracted.
- Story points are not converted to hours.

## History
- Implemented 2026-10-19 on branch `backlog/workload-view`. Not merged or deployed.
- Not verified: lint, type-check, the component test and the browser were not run (no node_modules). The pure functions' tests were run with a stand-in test runner.
