# Sprints

## What it does
- **Sprints page** (`/sprints`, also a Sprints button in the sidebar rail): create a sprint by title, then edit goal, start date, end date and status (Planned, Active, Done). Each card shows a progress bar and "done/total tasks done". Sprints can be deleted; their tasks are kept and lose the sprint.
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
- No active-sprint board; the Tasks kanban is by status across all tasks. See `docs/backlog/active-sprint-board.md`.
- Nothing starts or closes a sprint or carries unfinished tasks over; status is a plain dropdown. See `docs/backlog/sprint-start-close-carry-over.md`.
- A task's sprint can be set only when it is created; the original claim of "assignment on TasksScreen" is true only for the new-task row. See `docs/backlog/task-detail-edit-milestone.md`.
- The Sprints page has no owner field, though the API accepts `owner_id`. Goal and dates save on every keystroke or change.

## History
- Implemented 2026-10-15 (model, API, page, `tasks.sprint_id`, filter). Deployment not checked.
- Not implemented: active-sprint board, start/close/carry-over.
- Not verified: nothing was run; read from code only.
