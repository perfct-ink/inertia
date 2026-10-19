# Sprints

## What it does
- **Sprints page** (`/sprints`, also a Sprints button in the sidebar rail): create a sprint by title, then edit goal, start date, end date and status (Planned, Active, Done). Each card shows a progress bar and "done/total tasks done". Sprints can be deleted; their tasks are kept and lose the sprint.
- **Start and close**: a planned sprint has a "Start sprint" button (it becomes Active; a missing start date becomes today); an active one has "Close sprint", which asks where unfinished tasks go (another sprint that isn't done, or no sprint), moves them in one request, marks the sprint Done and reports "N tasks done, M moved on". Done tasks stay in the closed sprint. A closed sprint cannot be started again, and only an active sprint can be closed. The status dropdown on the card was replaced by the status text and these buttons, so a sprint can no longer be set to Done by hand without carry-over.
- **Tasks page** (`/tasks`): a Sprint filter in the filter bar (also read from a `?sprint_id=` query parameter), and a sprint picker in the new-task row when the Space has sprints.

## API and models
- `sprints` table: `workspace_id`, `owner_id`, `title` (required), `goal`, `status` (planned, active, done), `start_date`, `end_date`. `tasks.sprint_id` references it.
- `Sprint` includes `PlanningItem` but deliberately not `BelongsToMilestone`: a sprint spans epics and initiatives rather than rolling up through them. `end_date` may not be before `start_date`; the owner must be a Space member. `tasks_count` and `done_tasks_count` are live counts.
- `POST /api/v1/sprints/:id/start`, `POST /api/v1/sprints/:id/close` (`carry_to_sprint_id`, nil for none) return the sprint (close adds `completed` and `carried_over`); invalid transitions or a carry target that is the sprint itself, finished or in another Space return 422 (an unknown or other-Space target is 404). `Sprint#start!`/`#close!` do the work.
- `/api/v1/sprints` (index, create, update, destroy), ordered by start date (undated last). `GET /api/v1/tasks?sprint_id=` filters. `sprint_id` is permitted on task create and update.
- Frontend: `view/sprints/SprintsScreen.tsx`, `api/sprints.ts`, `view/tasks/TasksScreen.tsx`.

## Who can view and change
Scoped to the current Space. I did not check role limits.

## Tests
`backend/test/models/sprint_test.rb`, `backend/test/controllers/sprints_controller_test.rb`, `frontend/src/data/sprint.test.ts`, `frontend/src/view/sprints/SprintsScreen.test.tsx` (start and close/carry-over only; nothing covers the older sprint CRUD).

## Known limits
- No active-sprint board; the Tasks kanban is by status across all tasks. See `docs/backlog/active-sprint-board.md`.
- Nothing enforces one active sprint at a time, and the API's `PATCH` can still set `status` directly (only the UI dropdown is gone).
- A task's sprint can be set only when it is created; the original claim of "assignment on TasksScreen" is true only for the new-task row. See `docs/backlog/task-detail-edit-milestone.md`.
- The Sprints page has no owner field, though the API accepts `owner_id`. Goal and dates save on every keystroke or change.

## History
- Implemented 2026-10-15 (model, API, page, `tasks.sprint_id`, filter). Deployment not checked.
- Not implemented: active-sprint board, start/close/carry-over.
- Not verified: nothing was run; read from code only.
- Start/close/carry-over added 2026-10-19 on branch `backlog/sprint-start-close-carry-over`, not merged. Not verified: Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); only `ruby -c` passed.
