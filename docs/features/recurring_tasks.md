# Recurring tasks

## What it does
A task can repeat. When a repeating task is marked done, the server creates the next one (status todo, same title, description, assignee, links and position) and the completed one stops repeating, so reopening and completing it again cannot duplicate it.
- **Rule**: an RRULE subset in `tasks.recurrence`: `FREQ` (DAILY, WEEKLY, MONTHLY, YEARLY) and optional `INTERVAL`, e.g. `FREQ=WEEKLY;INTERVAL=2`. Anything else is rejected (422). Months clamp to the last day.
- **Counted from** (`tasks.recurrence_from`): `schedule` (default) steps the task's own start and due dates; `completion` sets the next due date from the day it was completed and keeps the start-to-due span.
- **UI**: a "Repeat" picker when adding a task on `/tasks`, and a repeat label on the board card.

## API and models
`tasks.recurrence` (string, null) and `tasks.recurrence_from` (integer enum). Both are accepted on `POST/PATCH /api/v1/tasks` and returned in the task JSON. `Recurrence` (`backend/app/models/recurrence.rb`) parses and steps rules; `Task#create_next_occurrence` runs after update. Frontend: `data/recurrence.ts`, `view/tasks/TasksScreen.tsx`.

## Who can view and change
Same as any task in the Space.

## Tests
`backend/test/models/recurrence_test.rb`, `backend/test/models/task_recurrence_test.rb`, `frontend/src/data/recurrence.test.ts`.

## Known limits
- No way to set or change the rule on an existing task (there is no task detail view yet; see `docs/backlog/task-detail-edit-milestone.md`), and the UI does not choose `recurrence_from`.
- Subtasks, dependencies and AI runs are not copied to the next occurrence.
- Tasks completed by other routes that skip callbacks do not spawn.
- Ongoing tasks with check-ins are separate (`docs/backlog/ongoing-tasks-with-check-ins.md`).

## History
- Implemented 2026-10-19 on branch `backlog/recurring-tasks`. Not merged or deployed.
- Not verified: the migration, Rails tests, lint, type-check, frontend tests and the browser were not run (no database, no node_modules); `schema.rb` was edited by hand. Only `ruby -c` passed.
