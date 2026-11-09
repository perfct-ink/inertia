# Task auto fields

## What it does
Read-only fields the server fills in on every task: item ID, creator, created time and last updated time. People can see them but never edit them.

- **Task dialog** (the pencil on a Tasks board card): a muted block under the form lists `Item ID #12`, `Created by Ada`, `Created 2 days ago` and `Last updated about 2 hours ago`. The exact date and time show on hover over a time. A line the server doesn't know is left out (tasks made before creators were recorded have no "Created by").
- **Task table** (`/task-table`): four extra columns, `ID`, `Created by`, `Created` and `Updated`. They sort like the others and the Columns checkboxes hide them. `ID` is on by default; the other three start unticked so the table stays narrow.

## API and models
- `tasks.created_by_id` (nullable, references users, `on_delete: :nullify`; migration `20261107080001`). `Task belongs_to :created_by, optional: true`. Set to the signed-in user in `TasksController#create` and never taken from request params (`created_by_id` is not in `task_params`), so an update can't change it either. Tasks made before this have no creator.
- `TaskBlueprint` returns `id`, `created_by_id`, `created_by_name`, `created_at` and `updated_at`. The task list preloads `created_by`; folder and event payloads that embed tasks load it one by one.
- Frontend: `autoFields` in `data/task.ts` (item ID as `#id`, creator, relative times), `components/tasks/TaskAutoFields.tsx`, `data/taskTable.ts` (columns, sorting, `DEFAULT_HIDDEN_COLUMNS`), `view/task_table/TaskTableScreen.tsx`.

## Who can view and change
Anyone who can see a task can see its auto fields; nobody can edit them.

## Tests
`backend/test/controllers/tasks_auto_fields_controller_test.rb`, `frontend/src/data/task.test.ts`, `frontend/src/data/taskTable.test.ts`, `frontend/src/components/tasks/TaskAutoFields.test.tsx`, `frontend/src/components/tasks/TaskDetail.test.tsx`, `frontend/src/view/task_table/TaskTableScreen.test.tsx`.

## Known limits
- The "creation log" is the created time and the creator only. Changes are not logged here; status changes have their own history (`docs/features/task_status_history.md`) and a full activity log is `docs/backlog/activity-log-per-item.md`.
- The last-updated time is the row's `updated_at`, so it also moves for changes the system makes (reordering, rescheduling dependants).
- Tasks copied to another Space by `SpaceTransfer` have no recorded creator. The next occurrence of a recurring task keeps the original's creator (it is a copy) but gets its own created time.
- Collection rows do not have auto fields; the item ID is the task's database id, shared across the whole install, not a per-Space count.
- The cards on the Tasks board and the folder boards don't show the fields; open the task dialog or use the table.
- Column choices in the task table are per visit, like the rest of the table's settings.

## History
- Implemented 2026-10-21 on branch `backlog/auto-fields` (card line); reworked 2026-11-07 onto current main: the fields now sit in the task dialog and as task table columns instead of on the cards. Not merged, not deployed.
- Not verified (no network, node_modules or database): `rails db:migrate` and `rails test`, ESLint, `tsc`, the real Jest run, and a look in the browser at 375px and desktop in light and dark. See the `Unverified` section of `docs/backlog/auto-fields.md`.
