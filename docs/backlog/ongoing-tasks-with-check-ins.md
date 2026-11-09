---
branch: backlog/ongoing-tasks-with-check-ins
status: incomplete
priority: p2
depends_on: []
---
# Ongoing tasks with check-ins

## Objective

**Ongoing tasks with check-ins**: a task that stays open and asks its owner for an update on a schedule

## Current state

Not present

## Requirements / notes

The check-in arrives as a notification (needs `notifications-inbox.md`, the notifications inbox; email/push later). The answer is saved as an update on the task, so its history reads like a log. Overdue check-ins show on the task as stale.

### Decisions (Alex, 2026-11-09 groom)

- **A check-in asks for a status and a note.** The owner picks a status (on track, at risk, blocked) and can add an optional note. Both are saved on the task's check-in log, and the latest status shows on the task.
- The notifications inbox and recurring tasks are built (`docs/features/notifications_inbox.md`, `docs/features/recurring_tasks.md`); reuse the recurring schedule picker for the check-in schedule.

## Context

Section "Requirement docs, project types, releases and recurring work" of the retired shared backlog.

Requested by Alex on 2026-10-18: write product requirement documents that turn into tasks and stay in sync both ways; support every kind of project, not only software (Alex often writes a document per song and tracks the work for a release: a song, an album, a music video); tasks can be recurring or ongoing, and those should notify the person and ask for an update.

### How other tools handle this (light research, 2026-10-18)

- **Doc to tasks, both ways**: Jira + Confluence (create issues from requirement text; issue status shows inline in the page), Notion (a page embeds a synced task database), Linear (project documents next to the project's issues), Quip (live checklists). The common pattern is that the document holds a live reference to the task, so status shown in the doc is always the task's real status.
- **Project types as templates**: Monday, Asana and ClickUp start projects from templates per kind of work (software launch, marketing campaign, event, content calendar). A template is a document skeleton plus default task lists, fields and views.
- **Music releases**: release plans are usually worked back from the release date: writing, recording, mixing and mastering, artwork, credits and metadata (ISRC per track, UPC per release), distributor upload, streaming-editorial pitch (Spotify for Artists asks for at least 7 days before release, and earlier is better), music video, promo and social posts, then post-release follow-up. One song can belong to several releases (single, then album).
- **Recurring and ongoing work**: Asana and Todoist repeat a task on a schedule (every week, the 1st of the month, N days after completion). Basecamp's automatic check-ins ask a person a question on a schedule ("What did you work on this week?"); Monday's update requests ask an owner for a status. An ongoing task never completes; it is checked in on.

## Acceptance criteria

- Ongoing tasks with check-ins works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built on the branch, to Alex's 2026-11-09 groom (feature doc: `docs/features/ongoing_tasks.md`): an ongoing task never completes and asks its assignees to check in; a check-in is a status (on track, at risk, blocked) plus an optional note, saved in the task's check-in log (`task_check_ins`), with the latest status on the task (`tasks.check_in_status`, shown as a pill on the card); the schedule is the recurring-task picker (`RecurrencePicker`, stored as `tasks.check_in_recurrence` in the same RRULE format and parsed by `Recurrence`), so it replaces the earlier "every N days"; the request arrives as an inbox notification; a check-in whose due day has passed shows on the task as "Check-in overdue" (stale).

**Missing, a decision for Alex:** nothing schedules the request. The app has no cron, job runner or clock process, and "no new infrastructure without asking" applies. The request is a job (`TaskCheckInRequestJob`, in-process queue like `AiWorkerRunJob`) that the inbox poll enqueues for the signed-in person, so a person is asked within a minute of opening the app; people who are away are not asked. To ask them, schedule `bin/rails check_ins:request` daily or hourly, for example as a Coolify Scheduled Task on the `api` service. Not set up. Acceptance is otherwise met; this file stays for that call and the checks below.

Ran: `ruby -c` on every changed Ruby file, the offline runner (`JEST_STUB_NET=1 /tmp/runner/all.sh`: babel parse, SCSS compile, pure data tests), and the Jest stand-in for the `TaskCheckInDialog`, `RecurrencePicker`, `TaskDetail`, `checkIn` and `recurrence` tests (all pass).
Not run (no network, `node_modules`, database or Docker): the migrations and the `schema.rb` diff (edited by hand to version 2026_11_08_180002), `rails test`, `npm run lint`, `tsc -b`, the real Jest run, `TasksScreen.test.tsx` (the stand-in lacks `@dnd-kit/core`, so it was only read through), and a browser look.

To verify:

```
cd backend && rails db:migrate && git diff db/schema.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser at 375px and desktop, light and dark: on `/tasks` add a task with a schedule under "Ongoing: check in on a schedule" and see "Ongoing · weekly"; open its speech-bubble button, pick "At risk", add a note, and see the pill on the card; set `last_check_in_at` ten days back with `rails runner` and reload to see "Check-in overdue"; run `bin/rails check_ins:request` (or open the inbox) to see "Check in on “…”" in the inbox; edit the task and choose "Not ongoing".
