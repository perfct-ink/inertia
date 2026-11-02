---
priority: p2
depends_on: []
branch: backlog/activity-log-per-item
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

## Blocked
Done and merged with main as of 2026-11-02 (main at `360ebd2`), but not verified end to end: this machine has no network, `node_modules` or database, so the migration, the Rails tests, lint and the real Jest suite never ran.

Built (see `docs/features/activity_log.md`): `activities` table and `Activity` model, the `Auditable` concern on `Task`, `Document`, `Epic`, `Initiative` and `Milestone`, `Current.user` set in `ApplicationController`, `GET /api/v1/activities`, and an activity button and dialog on task cards and rows, documents, spreadsheets, and epic, initiative and milestone cards. Conservative choices: every Space member including viewers can read a log; content autosaves fold into one entry per 10 minutes; descriptions and document content are logged by name only; the dialog shows the latest 100 entries. Follow-up tasks: `activity-log-collection-fields-and-records.md`, `activity-log-sprints-objectives-and-events.md`.

Ran: `/tmp/runner/all.sh` (TypeScript parse and imports, SCSS compile, `ruby -c`, pure data tests including `data/activity.test.ts`, and the Jest stand-in for `ActivityDialog`, `ActivityButton` and `MilestonesScreen`).

Did not run, and what to do:
1. `cd backend && rails db:migrate`, then diff `db/schema.rb` against the hand-edited `activities` table (migration `20261101200001_create_activities.rb`) and the `version:` line.
2. `cd backend && rails test` (new: `test/models/activity_test.rb`, `test/controllers/activities_controller_test.rb`; the whole suite matters because every task, file, epic, initiative and milestone save now writes an entry). Also `bundle exec rubocop` and Brakeman.
3. `cd frontend && npm install && npm run lint && npx tsc -b && npm test` (`TasksScreen.test.tsx` needs `@dnd-kit` and was not run).
4. In a browser at 375px and desktop, light and dark: open the history button on a task card and row, a document, a spreadsheet, an epic, an initiative and a milestone; edit each and reopen to see the entry; confirm the button never navigates the card behind it.
5. If `backlog/status-change-history` also merges, it edits the same card and row in `TasksScreen.tsx` with its own history button; keep one.

