---
priority: p3
depends_on: [activity-log-per-item]
components: [backend]
---
# Activity log: all assignees and the watchers of a task

## Objective

Make a task's activity log (`docs/features/activity_log.md`) show every change to who is assigned and who watches, not only the first assignee.

## Current state

A task has any number of assignees and watchers (`task_participants`, `HasParticipants`; `docs/features/task_assignees_and_watchers.md`). The log audits `tasks.assignee_id`, which mirrors the first assignee, so a change of the first assignee reads "Set assignee to Ada", but adding a second assignee, removing one, or adding or removing a watcher writes nothing.

## Requirements

- Log "assignees" and "watchers" as names (for example `[ "Ada", "Ada, Grace" ]`) in the same save's entry as the other changes. `HasParticipants#save_pending_participants` already knows the before and after sets; have it keep the difference so `Auditable` can add it (it runs its `after_save` after `HasParticipants`, so include `Auditable` after it in `Task`).
- Stop logging `assignee` separately once assignees are logged, so one change does not read twice.
- Add the field labels to `frontend/src/data/activity.ts`.

## Acceptance criteria

- Adding and removing assignees and watchers each shows in the task's log with the person who did it, including when `assignee_id` alone is sent by an older client.
- Tests cover the entries (`backend/test/models/activity_test.rb`); `activity_log.md` is updated and this file is removed.
