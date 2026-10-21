# Task assignees and watchers

## What it does
- A task can have any number of **assignees** (who does the work) and **watchers** (who follow it). Both are Space members.
- **Tasks page** (`/tasks`): when the Space has more than one member, the new-task row has Assignees and Watchers pickers (a checkbox list of members). Cards show assignee initials. The filter bar has an Assignee filter ("Anyone" by default).

## API and models
- `task_participants` (`task_id`, `user_id`, `role` assignee/watcher, unique per task, user and role; migration `20261021000001`, which also copies each existing `tasks.assignee_id` in as the first assignee).
- `Task` includes `HasParticipants` (`app/models/concerns/`): `assignee_ids`, `watcher_ids` and setters. Changes are held until the task saves; anyone who is not a member of the task's Space makes the save fail (422).
- Conservative choice: `tasks.assignee_id` is kept as the first assignee, so older clients (the Mac app, `assignee_id` on the API) still work. Setting only `assignee_id` adds or removes that person as an assignee.
- `GET /api/v1/tasks?assignee_id=` returns tasks where that user is one of the assignees. `assignee_ids` and `watcher_ids` are returned by `TaskBlueprint` and permitted on create and update.
- Frontend: `components/people/PeoplePicker.tsx`, `data/person.ts` (`initials`, `toggleId`), `api/tasks.ts`, `view/tasks/TasksScreen.tsx`.

## Who can view and change
Same as tasks, scoped to the current Space. Viewers cannot write. I did not check anything further.

## Tests
`backend/test/models/task_test.rb`, `backend/test/controllers/tasks_controller_test.rb`, `frontend/src/data/person.test.ts`. No component test for `PeoplePicker`.

## Known limits
- Watchers are stored but nothing notifies them yet (depends on the notifications inbox, `docs/backlog/notifications-inbox.md`).
- Assignees and watchers can only be set when a task is created or through the API; there is no editor for an existing task (see `docs/backlog/task-detail-edit-milestone.md`).
- The Mac app's local task files still have one assignee.
- Removing a user from a Space leaves them on tasks they were already on.

## History
- Implemented 2026-10-21 on branch `backlog/multiple-assignees-and-watchers`. Not merged, not deployed.
- Not verified: Rails tests and migration (no database), ESLint, tsc, Jest and the browser. Run: `ruby -c`, SCSS compile.
