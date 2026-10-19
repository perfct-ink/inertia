# Workboard: organize by epic

## What it does
On the Workboard tab of `/tasks`, an "Organize by epic" checkbox (off by default, per visit) switches the board into swimlanes: one lane per epic that has tasks, in the epics' order, then a "No epic" lane for tasks without an epic. Each lane has the same five status columns (Backlog, To Do, In Progress, In Review, Done) holding only that epic's tasks, with a count in the lane title. The filters (folder, status, epic, sprint, search) still apply. Turn the checkbox off to return to the single board.

## API and models
No endpoint or model change. Lanes are built in the browser by `epicLanes` in `frontend/src/data/task.ts` from the tasks and epics already loaded; `LaneColumn` and the toggle are in `frontend/src/view/tasks/TasksScreen.tsx`.

## Who can view and change
Same as the Workboard.

## Tests
`frontend/src/data/task.test.ts` (`epicLanes`). The screen has no test of its own.

## Known limits
- Swimlane mode has no drag and drop: cards move with the arrow button (next status) because lanes would need their own drop targets. The plain board keeps drag and drop.
- Adding a task from a lane is not possible (the "Add task" buttons are on the plain board).
- Only grouping by epic; grouping by any field, WIP limits and configurable columns from `docs/backlog/kanban-organize-by-epic.md`'s wider objective are not built. The toggle is not remembered between visits.

## History
- Implemented 2026-10-19 on branch `backlog/kanban-organize-by-epic`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser were not run (no node_modules).
