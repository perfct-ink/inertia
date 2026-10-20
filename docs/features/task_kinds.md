# Task kinds and the bugs queue

## What it does
- Every task has a **type**: Task (the default), Bug or Story.
- **Tasks page** (`/tasks`): a Type picker in the new-task row, a type badge on kanban cards for bugs and stories, and a Type filter in the filter bar. Choosing **Bugs (queue)** shows only bugs, which is the bugs queue; it works in both the backlog and kanban views.

## API and models
- `tasks.kind` integer, default 0, indexed (migration `20261020000001`). `Task` enum `kind`: `task`, `bug`, `story`, with the `kind_` prefix (`task.kind_bug?`) and no scopes. An unknown value is a validation error (422), not a 500.
- `GET /api/v1/tasks?kind=bug` filters; an unknown kind is ignored. `kind` is returned by `TaskBlueprint` and permitted on task create and update.
- Frontend: `Task.kind` (optional, so older payloads read as `task`), `TASK_KINDS`, `KIND_LABEL`, `kindOf` and `filterByKind` in `data/task.ts`, `TaskFilters.kind` in `api/tasks.ts`, `view/tasks/TasksScreen.tsx`.

## Who can view and change
Same as tasks: scoped to the current Space. I did not check role limits.

## Tests
- `backend/test/models/task_test.rb` (default, values, invalid value), `backend/test/controllers/tasks_controller_test.rb` (create with kind, invalid kind, `?kind=` filter).
- `frontend/src/data/task.test.ts` (`kindOf`, `filterByKind`).

## Known limits
- The type is set when a task is created or through the API; there is no control to change it on an existing task (the same gap as sprints, see `docs/backlog/task-detail-edit-milestone.md`).
- Document checklist tasks are created as Task; there is no syntax to make one a bug.
- No separate sidebar entry for the bugs queue: it is a filter on the Tasks page.
- A bug's severity or reproduction steps are not modelled.

## History
- Implemented 2026-10-20 on branch `backlog/bugs-queue-item-types-task-bug-story`. Not merged, not deployed.
- Not verified: Rails tests and the migration (no database here), ESLint, tsc, Jest and the browser. Ruby syntax, the SCSS compile and a hand-run of the `data/task` tests were the only checks.
