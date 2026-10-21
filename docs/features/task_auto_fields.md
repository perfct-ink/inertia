# Task auto fields

## What it does
Read-only fields the server fills in on every task: item ID, creator, created time and last updated time. The Tasks page shows them on each card as one muted line, for example `#12 · Ada · updated 2 hours ago`.

## API and models
- `tasks.created_by_id` (nullable, references users, set to null when the user is deleted; migration `20261021000002`). `Task belongs_to :created_by`. Set from the signed-in user on create and never accepted from request params. Tasks created earlier have no creator and show no name.
- `TaskBlueprint` returns `id`, `created_by_id`, `created_by_name`, `created_at` and `updated_at`.
- Frontend: `autoFields` in `data/task.ts`, `view/tasks/TasksScreen.tsx`.

## Who can view and change
Anyone who can see the task can see these fields; nobody can edit them.

## Tests
`backend/test/controllers/tasks_controller_test.rb`, `frontend/src/data/task.test.ts`.

## Known limits
- The "creation log" is the created time and creator only; changes are not logged (see `docs/backlog/activity-log-per-item.md` and `status-change-history.md`).
- The last-updated time is the row's `updated_at`, so it also moves for changes made by the system (for example reordering).
- Only the Tasks page cards show the fields; there is no task detail view yet.
- Collection rows do not have auto fields.

## History
- Implemented 2026-10-21 on branch `backlog/auto-fields`. Not merged, not deployed.
- Not verified: Rails tests and migration (no database), ESLint, tsc, Jest and the browser. Run: `ruby -c`, SCSS compile.
