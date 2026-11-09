# Ongoing tasks with check-ins

## What it does
A task can be **ongoing**: it never completes, and instead asks its assignees to check in on a schedule. A check-in is a **status** (on track, at risk or blocked) and an optional **note**. Every check-in is kept in the task's log, and the latest status shows on the task.
- **Make one**: in the new-task row on `/tasks`, pick a schedule in **Ongoing: check in on a schedule**; or open a Workboard card's pencil and pick one under **Ongoing check-ins** (choose **Not ongoing** to turn it back into an ordinary task). The schedule picker is the same one as **Repeat** (Daily, Weekly, Every 2 weeks, Monthly, Yearly; `RecurrencePicker`), and the rule is stored in the same RRULE format and parsed by the same `Recurrence` class as a repeating task's `recurrence`.
- **On the board**: the card (and the Backlog row) shows "Ongoing · weekly" and, once someone has checked in, a pill with the latest status (On track green, At risk amber, Blocked red). When the check-in is late it shows **Check-in overdue** in red instead of the schedule. The speech-bubble button opens the check-in box: a Status picker (starting at the latest status), an optional note, and the log of earlier check-ins (newest first, with status, note, date and author).
- **The request**: when a check-in is due, every assignee gets an inbox notification, "Check in on “…”" that opens the Workboard (see [notifications_inbox.md](notifications_inbox.md)). Nobody is asked again until someone has checked in. Tasks with nobody assigned are never asked (they still show as overdue). People who have left the Space are not asked.
- **Due and overdue**: the check-in is due on the day one step of the schedule after the last check-in (or after the task became ongoing). The request goes out on that day; the task is **overdue** (stale) once that day has passed unanswered. Checking in restarts the count from that day.
- **Never done**: an ongoing task can't be set to Done (the API answers 422). The board has no arrow to Done for it and won't drop it in the Done column; the edit dialog says to choose Not ongoing first. Turning Ongoing on for a task that is already Done is refused the same way.

## How requests are sent (no scheduler)
Nothing in this project schedules work: there is no cron, job runner or clock process (`docs/deployment.md`, `docker-compose.coolify.yml`), and "no new infrastructure without asking" applies, so none was added. Recurring tasks work the same way (they act when a task is completed, not on a clock). The work is a job, `TaskCheckInRequestJob`, on the in-process queue like `AiWorkerRunJob`, and two paths trigger it:
1. **On visit (works today).** `GET /api/v1/notifications`, which the app polls every minute while it is open, enqueues `TaskCheckInRequestJob` for the signed-in person. A person is asked about their own due check-ins within a minute of opening the app, and the notification shows on the next poll. Nobody who never opens the app is asked.
2. **`rails check_ins:request` (not scheduled).** Asks every assignee of every task whose check-in is due, whether or not they are online. It is safe to run as often as you like (a request is sent once until it is answered). To use it, something must run it, for example `bin/rails check_ins:request` daily in the `api` container. Coolify's per-resource Scheduled Tasks could do that without new infrastructure in the repo (unverified, an account-side setting for Alex). This is recorded in `docs/services.md`.

**What is missing:** a scheduler. Until Alex sets one up, people who are away are not asked.

## API and models
- `tasks.ongoing` (boolean), `check_in_recurrence` (RRULE subset, required and supported when ongoing), `check_in_status` (the latest check-in's status, so the list needs no extra query), `last_check_in_at` (the clock: last check-in, or when it became ongoing) and `check_in_requested_at` (set while a request waits for an answer). `ongoing` and `check_in_recurrence` are accepted on `POST/PATCH /api/v1/tasks`; the task JSON returns them with `check_in_status`, `check_in_due_on` (a date) and `check_in_stale`; computing them reads only the task row.
- `task_check_ins` (`task_id`, `author_id`, `status` enum on_track/at_risk/blocked, `note` optional text, `created_at`): one row per check-in, kept in order, removed with the task (author is nulled if the user is deleted). `GET /api/v1/tasks/:id/check_ins` (oldest first) and `POST /api/v1/tasks/:id/check_ins` (`{ check_in: { status, note } }`; 422 for a missing or unknown status or a task that is not ongoing; 404 for a task in another Space). A blank note is stored as no note.
- `Task#check_in_rule` / `check_in_due_on` / `check_in_due?` / `check_in_stale?`, `TaskCheckIn.request_due!(today, assignee:)` (the engine behind the job and the rake task), `TaskCheckInRequestJob`, `Notification.notify(kind: "check_in_requested")`.
- Frontend: `components/TaskCheckInDialog.tsx`, `components/tasks/RecurrencePicker.tsx` (shared with Repeat), `components/tasks/CheckInStatusBadge.tsx` (reuses the milestone health pill `HealthBadge`), `api/tasks.ts` (`useTaskCheckIns`, `useAddTaskCheckIn`), `data/checkIn.ts` (statuses, labels), `data/recurrence.ts` (`recurrenceOptions`), `data/task.ts` (`canMoveTo`, the draft rules), `components/tasks/TaskDetail.tsx`, `view/tasks/TasksScreen.tsx`.

## Who can view and change
Same as any task in the Space: members and above change tasks and check in (viewers cannot write); the author of a check-in is recorded. Anyone who can see the task can read its log. Notifications go only to the assignees.

## Tests
`backend/test/models/task_check_in_test.rb`, `backend/test/jobs/task_check_in_request_job_test.rb`, `backend/test/controllers/task_check_ins_controller_test.rb`, `backend/test/controllers/notifications_controller_test.rb` (request on visit), `frontend/src/data/checkIn.test.ts`, `frontend/src/data/recurrence.test.ts`, `frontend/src/data/task.test.ts`, `frontend/src/components/TaskCheckInDialog.test.tsx`, `frontend/src/components/tasks/RecurrencePicker.test.tsx`, `frontend/src/components/tasks/TaskDetail.test.tsx`, `frontend/src/view/tasks/TasksScreen.test.tsx`.

## Known limits
- **Not scheduled** (see above): without a scheduler only people who open the app are asked.
- Inbox only: no email or push. The schedule is one of the repeat picker's rules (no "every Monday", no custom interval in the UI; the API accepts any `FREQ`/`INTERVAL` of the subset). The question is fixed; there is no per-person question text.
- The log is append-only: check-ins can't be edited or deleted.
- A repeat rule (`recurrence`) on an ongoing task never fires, since the task never completes; the two aren't blocked from being set together.
- Several assignees are all asked, and one check-in closes the request for all of them. Watchers are not asked.
- The notification opens the Workboard, not the check-in box, and the Workboard has no column for Backlog tasks, so an ongoing Backlog task is found in the Backlog list (the notifications inbox has no task detail page to link to).
- Document task lines, the Mac app's local task files and the roadmap/Gantt views don't show or set ongoing. Copying a document to another Space copies its tasks as ordinary tasks (moving keeps them ongoing, with their log).
- Due and overdue count whole days in the server's time zone (`Date.current`).

## History
- Implemented 2026-10-19 on branch `backlog/ongoing-tasks-with-check-ins`; reworked 2026-11-07 (clock column, all assignees, request on visit, edit dialog, no Done for ongoing tasks) and again 2026-11-09 to Alex's groom: a check-in asks for a status and a note instead of free text, the latest status shows on the task, and the schedule reuses the repeat picker (`check_in_recurrence`) instead of "every N days". Not merged or deployed.
- Not implemented: a scheduler (see above), email or push, opening the check-in box straight from the notification.
- Not verified: migrations, Rails tests, lint, type-check, the full Jest run and the browser did not run (no database, no `node_modules`); `schema.rb` edited by hand. `ruby -c`, the offline data/component test runner and a SCSS compile were the checks run.
