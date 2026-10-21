# Task progress and time tracking

## What it does
- **Progress from subtasks**: a task card with subtasks shows a bar and "done/total subtasks". Every descendant counts once, to any depth; a task is done when its status is Done. Tasks with no subtasks show no bar.
- **Timer**: each card has a start/stop button. A running timer shows an `h:mm:ss` clock; otherwise the card shows the total time logged on the task (everyone's finished entries), or "No time logged".

## API and models
- `time_entries` table: `task_id`, `user_id`, `started_at`, `ended_at` (empty while running); migration `20261021000003`. `TimeEntry` validates that an entry doesn't end before it starts and that a person runs one timer at a time across all tasks (starting another gives 422 "Stop your running timer before starting another"; this is the conservative choice over auto-stopping the old one).
- `GET /api/v1/tasks/:task_id/time_entries`, `POST /api/v1/tasks/:task_id/time_entries` (empty body starts a timer; `time_entry[minutes]` logs finished time ending now; minutes must be above 0), `POST /api/v1/time_entries/:id/stop`, `DELETE /api/v1/time_entries/:id`. Only the person who made an entry can stop or delete it (others get 404). Viewers cannot write (403).
- `TaskBlueprint` adds `logged_minutes` (finished entries, all users), and for the signed-in user `timer_entry_id` and `timer_started_at` (only when the controller passes `current_user:`; the folder and event endpoints don't, so they show no timer).
- Progress is computed in the browser from the task list (`subtaskProgress`, `progressById` in `data/task.ts`), so a filtered list (for example by status) counts only the subtasks that pass the filter.
- Frontend: `api/timeEntries.ts`, `view/tasks/TaskTimer.tsx`, `view/tasks/TasksScreen.tsx`.

## Who can view and change
Same as tasks, scoped to the Space. Anyone who can see a task sees its total logged time but not who logged it (the list endpoint of entries does show names).

## Tests
`backend/test/models/time_entry_test.rb`, `backend/test/controllers/time_entries_controller_test.rb`, `frontend/src/data/task.test.ts`, `frontend/src/view/tasks/TaskTimer.test.tsx`.

## Known limits
- No UI to log time by hand, edit or delete entries, or list them; those are API only.
- Logged time doesn't roll up to parent tasks, epics or milestones, and there is no estimate to compare against.
- The clock in the browser starts from the server's start time but ticks on the browser's clock.
- The list is not refreshed while a timer runs on another device.

## History
- Implemented 2026-10-21 on branch `backlog/progress-and-time-tracking-fields`. Not merged, not deployed.
- Not verified: Rails tests and migration (no database), ESLint, tsc, Jest component tests and the browser. Run: `ruby -c`, SCSS compile, `data/task` tests through the shim.
