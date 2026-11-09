---
priority: p2
depends_on: []
branch: backlog/activity-log-per-item
status: incomplete
---
# Activity log per item

## Objective

Activity log per item

## Current state

None

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Activity log per item works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified
Built and re-applied as one commit on top of `origin/main` on 2026-11-09 (see `docs/features/activity_log.md`): `activities` table and `Activity` model, the `Auditable` concern on `Task`, `Document`, `Epic`, `Initiative` and `Milestone`, `Current.user` set in `ApplicationController`, `GET /api/v1/activities`, and an activity button and dialog on task cards and rows, documents, spreadsheets, and epic, initiative and milestone cards. Every acceptance criterion is implemented; none has been run against a database or a browser.

Conservative choices for Alex: every Space member including viewers can read a log; content autosaves fold into one entry per 10 minutes; descriptions and document content are logged by name only; the dialog shows the latest 100 entries; the log has no workspace column and is found through the item's current Space (so it follows an item moved between Spaces); the task status history button stays next to the new activity button (a status change is recorded in both; removing the older button is Alex's call). Overlap with `backlog/ai-worker-agent-access`: its tables are `agent_tokens` and `agent_activities`, mine is `activities`, so no clash; agent changes show here as "Someone" until `activity-log-name-agents.md`.

Follow-up tasks: `activity-log-collection-fields-and-records.md`, `activity-log-sprints-objectives-and-events.md`, `activity-log-task-assignees-and-watchers.md`, `activity-log-name-agents.md`.

Ran: `/tmp/runner/all.sh` (TypeScript parse and imports, SCSS compile, `ruby -c`, the pure data tests including `data/activity.test.ts`, and the Jest stand-in for `ActivityDialog`, `ActivityButton` and `MilestonesScreen`).

Did not run, and what to do:
1. `cd backend && rails db:migrate`, then diff `db/schema.rb` against the hand-edited `activities` table (migration `20261108230001_create_activities.rb`) and the `version:` line.
2. `cd backend && rails test` (new: `test/models/activity_test.rb`, `test/controllers/activities_controller_test.rb`; run the whole suite, because every task, file, epic, initiative and milestone save now writes an entry). Also `bundle exec rubocop` and Brakeman.
3. `cd frontend && npm install && npm run lint && npx tsc -b && npm test` (`TasksScreen.test.tsx`, which has a new test for the button, needs `@dnd-kit` and was not run).
4. In a browser at 375px and desktop, light and dark: open the activity button on a task card and row, a document, a spreadsheet, an epic, an initiative and a milestone; edit each and reopen to see the entry; confirm the button never navigates the card behind it.
