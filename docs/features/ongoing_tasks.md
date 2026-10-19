# Ongoing tasks with check-ins

## What it does
A task can be **ongoing**: it never completes, and instead asks its assignee for an update on a schedule.
- Make one by filling "Ongoing: every N days" in the new-task row on `/tasks`. Its card shows "Ongoing · every N days"; when an update is overdue it shows "Update overdue" in red.
- The card's **Update** button opens a dialog with the log of earlier updates (newest first) and a box for the next. Saving an update starts a fresh interval.
- When an update is due, the assignee gets an inbox notification, "Update on “…”?", linking to the task (see [notifications_inbox.md](notifications_inbox.md)). They are asked once and not nagged again until they answer. Tasks with no assignee are never asked (but still show as overdue).
- An ongoing task cannot be set to Done (422): turn off ongoing first.

## API and models
`tasks.ongoing`, `check_in_every_days` (required and positive when ongoing), `check_in_requested_at`; `task_check_ins` (`task_id`, `author_id`, `body`, `created_at`). `Task#check_in_due_at` is the last check-in (or creation) plus the interval; `check_in_stale?` compares it with now; both are in the task JSON. `GET/POST /api/v1/tasks/:id/check_ins` read and add updates. `TaskCheckIn.request_due!` sends the requests; run it on a schedule with `rails check_ins:request` (`lib/tasks/check_ins.rake`). Frontend: `TaskCheckInDialog`, `useTaskCheckIns`, the task card in `view/tasks/TasksScreen.tsx`.

## Who can view and change
Anyone in the Space can read updates and add one (the author is recorded); making a task ongoing uses the normal task update call.

## Tests
`backend/test/models/task_check_in_test.rb`, `backend/test/controllers/task_check_ins_controller_test.rb`, `frontend/src/components/TaskCheckInDialog.test.tsx`.

## Known limits
- **Nothing schedules `rails check_ins:request` yet.** Until a daily cron, Sidekiq or similar runs it (infrastructure to add; see `docs/services.md`), no notification is sent, though cards still show "Update overdue".
- Ongoing can be set only when creating a task (no task detail view to switch it on or off afterwards; the API accepts it).
- Email and push are not sent, only the inbox. The interval is in whole days; there is no "weekly on Mondays" schedule.
- Stacked on `backlog/notifications-inbox` (it uses `Notification.notify`); merge that first.

## History
- Implemented 2026-10-19 on branch `backlog/ongoing-tasks-with-check-ins`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
