# Task status history

## What it does
Every change of a task's status is recorded: one row when the task is created ("Created as To Do") and one each time its status changes ("To Do → Done"), with the time and who made the change. A history button on each Workboard card and Backlog row opens a dialog listing the rows oldest first. Other edits (title, dates, assignee) are not recorded. Tasks that existed before this shipped have no rows until their status next changes (so the dialog says changes made before history was kept are not listed).

## API and models
`task_status_changes` (`task_id`, `changed_by_id` nullable, `from_status` nullable, `to_status`, `created_at`), kept in order and removed with the task. `Task` records them in `after_create` / `after_update`; the controller sets `status_changed_by` from the signed-in user on create and update. `GET /api/v1/tasks/:id/status_changes` returns them with `changed_by_name`. It is the groundwork for burndown, velocity and cumulative flow (`docs/backlog/agile-reports.md`). Frontend: `api/tasks.ts` (`useTaskStatusChanges`), `components/TaskHistoryDialog.tsx`, `statusChangeLabel` in `data/task.ts`.

## Who can view and change
Anyone in the Space who can see the task can read its history; rows are only written by status changes (no edit or delete API).

## Tests
`backend/test/models/task_status_change_test.rb`, `backend/test/controllers/task_status_changes_controller_test.rb`, `frontend/src/data/task.test.ts`, `frontend/src/components/TaskHistoryDialog.test.tsx`.

## Known limits
- Only status is audited, not the other fields; a full per-item activity log is `docs/backlog/activity-log-per-item.md`.
- Changes made without callbacks (bulk `update_all`, direct SQL, the macOS local file) are not recorded. No backfill for existing tasks.
- Document task lines, the AI worker and other server paths that change status through normal saves are recorded, but without a user when no signed-in user is set (shown without a name).

## History
- Implemented 2026-10-19 on branch `backlog/status-change-history`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
