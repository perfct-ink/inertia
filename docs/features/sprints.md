# Sprints

## What it does
- **Sprints page** (`/sprints`, also a Sprints button in the sidebar rail): create a sprint by title, then edit goal, start date, end date and status (Planned, Active, Done). Each card shows a progress bar and "done/total tasks done". Sprints can be deleted; their tasks are kept and lose the sprint.
- **Sprint board**: each sprint card has an "Open board" link to the Workboard filtered to that sprint (`/tasks?view=kanban&sprint_id=<id>`), which shows a header with the sprint title, status, dates, goal and progress above the usual status columns (drag between columns still works). `/sprint-board` opens the Space's active sprint's board, or, with no active sprint, a prompt to go to the Sprints page instead of an empty board.
- **Tasks page** (`/tasks`): a Sprint filter in the filter bar (also read from a `?sprint_id=` query parameter), and a sprint picker in the new-task row when the Space has sprints.

## API and models
- `sprints` table: `workspace_id`, `owner_id`, `title` (required), `goal`, `status` (planned, active, done), `start_date`, `end_date`. `tasks.sprint_id` references it.
- `Sprint` includes `PlanningItem` but deliberately not `BelongsToMilestone`: a sprint spans epics and initiatives rather than rolling up through them. `end_date` may not be before `start_date`; the owner must be a Space member. `tasks_count` and `done_tasks_count` are live counts.
- `/api/v1/sprints` (index, create, update, destroy), ordered by start date (undated last). `GET /api/v1/tasks?sprint_id=` filters. `sprint_id` is permitted on task create and update.
- Frontend: `view/sprints/SprintsScreen.tsx`, `api/sprints.ts`, `view/tasks/TasksScreen.tsx`.

## Who can view and change
Scoped to the current Space. I did not check role limits.

## Tests
None. There is no sprint model or controller test, and no `SprintsScreen` test, in the repo.

## Known limits
- The sprint board is the Workboard with a sprint filter and header, not a separate screen; there is no sidebar entry for `/sprint-board` (reach it from the Sprints page).
- Nothing starts or closes a sprint or carries unfinished tasks over; status is a plain dropdown. See `docs/backlog/sprint-start-close-carry-over.md`.
- A task's sprint can be set only when it is created; the original claim of "assignment on TasksScreen" is true only for the new-task row. See `docs/backlog/task-detail-edit-milestone.md`.
- The Sprints page has no owner field, though the API accepts `owner_id`. Goal and dates save on every keystroke or change.

## History
- Implemented 2026-10-15 (model, API, page, `tasks.sprint_id`, filter). Deployment not checked.
- Not implemented: active-sprint board, start/close/carry-over.
- Not verified: nothing was run; read from code only.
- Active sprint board added 2026-10-19 on branch `backlog/active-sprint-board`, not merged. Tests: `data/sprint.test.ts`, `components/SprintHeader.test.tsx`, `view/sprint_board/SprintBoardScreen.test.tsx`. Not verified: lint, type-check, tests and the browser did not run (no node_modules).
