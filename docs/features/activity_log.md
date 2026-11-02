# Activity log per item

## What it does
Every task, file (document, spreadsheet), epic, initiative and milestone keeps a log of who created it and who changed it, and when. A history button on the item opens the log in a dialog, newest first, each entry showing the person, the time and one line per change:

- "Created this task" (or file, epic, initiative, milestone).
- "Changed status from To Do to Done", "Set assignee to Ada", "Cleared epic (was Launch)", "Changed due date from Nov 5, 2026 to Nov 9, 2026". Linked records (assignee, owner, epic, initiative, sprint, milestone, folder, parent task, document) are shown by name, as they were when the change was made.
- "Edited the description" / "Edited the content": the change is noted but the (long) text is not kept.

Where the button is: each Workboard card and Backlog row on `/tasks`; the toolbar of a rich document and the header of a spreadsheet (`/documents/:id`); each epic card (`/epics`), initiative card (`/initiatives`) and milestone card (`/milestones`). On a phone the button is always visible and has a larger tap target. If the log cannot be loaded, the shared error notice appears and the dialog says so. A log with no entries says nothing has been recorded yet and that earlier changes are not listed.

What is logged, per model (the `audited` line of each):
- Task: title, status, priority, start date, due date, story points, estimate hours, assignee, epic, sprint, milestone, folder, document, parent task; description by name only.
- File: title, type, pinned, folder; content by name only.
- Epic: title, start and target date, horizon, initiative, milestone, folder.
- Initiative: title, status, start and target date, horizon, owner, milestone; description by name only.
- Milestone: title, status, target date, owner, folder; description by name only.

Not logged: `position` (drag reordering), counts and rollups, custom task field values, and anything else not listed. Text values are cut at 200 characters.

A document or spreadsheet autosaves while someone types. Edits that change only the content, by the same person within 10 minutes of that person's last content entry, are folded into one entry whose time moves forward, so the log does not fill with one row per save.

## API and models
`activities` (`workspace_id`, `subject_type`, `subject_id` polymorphic, `actor_id` nullable, `action` created/updated, `field_changes` json, `created_at`; index on subject and time). `Activity.log` writes entries and does the folding. The `Auditable` concern (`backend/app/models/concerns/auditable.rb`) gives a model `has_many :activities` (deleted with the item), `audited :field, ..., valueless: :field` and the `after_create` / `after_update` callbacks that write the entries in the same transaction as the save. `Current.user` (`backend/app/models/current.rb`, set in `ApplicationController`) is the actor. The collab server saves documents as the signed-in user, so those are attributed; background work such as imports and AI workers has no user and is shown as "Someone". `Activity::SUBJECT_TYPES` lists the audited models and a test keeps it in step.

`GET /api/v1/activities?subject_type=Task&subject_id=12` returns the latest 100 entries newest first (`id`, `action`, `actor_name`, `created_at`, `changes`, where `changes` maps a field to `[from, to]` or null for a name-only field). An unknown `subject_type` is 404. Frontend: `api/activities.ts` (`ActivityApi`, `useActivities`), `data/activity.ts` (wording, labels, dates), `components/activity/ActivityButton.tsx` and `ActivityDialog.tsx`.

## Who can view and change
Any member of the Space, viewers included, can read an item's log (the log is scoped to the Space named by `X-Workspace-Id`; another Space's items are never returned). Nothing writes, edits or deletes entries through the API; they are written only by saving the item and removed with it. The log shows the names of people who are already visible in the Space.

## Tests
`backend/test/models/activity_test.rb` (creation, actor, named associations, enum and number fields, unaudited fields, truncation, document folder move, folding of content edits and when they start a new entry, deletion with the item, deleting the actor, the subject type list), `backend/test/controllers/activities_controller_test.rb` (tasks and documents over HTTP, other Space, viewer, unknown type, signed out), `frontend/src/data/activity.test.ts`, `frontend/src/components/activity/ActivityDialog.test.tsx`, `ActivityButton.test.tsx` (including that clicks do not reach the card around the button), and `MilestonesScreen.test.tsx`.

## Known limits
- Items that existed before this shipped have no history until their next change; there is no backfill.
- Changes made without model callbacks (bulk `update_all`, `touch`, SQL, the macOS local task file) are not logged. Replacing an uploaded file's contents is not logged. Collection fields and records are edited through the tables API, so a Collection has no log button yet (`docs/backlog/activity-log-collection-fields-and-records.md`); uploaded files are recorded (renames, moves) but their viewer has no button yet; sprints, objectives, key results and events are not audited yet (`docs/backlog/activity-log-sprints-objectives-and-events.md`).
- Status names show the defaults ("To Do", "In Progress"), not a Space's renamed statuses.
- The dialog shows the latest 100 entries with no way to page further back; there is no retention or pruning and no Space-wide feed.
- It is separate from the task status history on branch `backlog/status-change-history` (a status-only table meant for burndown reports). If both merge, the log button and the history button on a task card are redundant and one can go.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/activity-log-per-item`); finished and merged with main on 2026-11-02.
- Ran: the offline checks (`/tmp/runner/all.sh`: TypeScript parse and import checks, SCSS compile, `ruby -c`, the pure data tests and the Jest stand-in for `ActivityDialog`, `ActivityButton` and `MilestonesScreen`).
- Not verified: `rails db:migrate` (the migration is `20261101200001_create_activities.rb` and `schema.rb` was edited by hand), `rails test` (no database, so the model and controller tests have not run), `npm run lint`, `tsc -b`, the full Jest suite with the real packages (`TasksScreen.test.tsx` needs `@dnd-kit`), RuboCop and Brakeman, and the browser at 375px, desktop, light and dark.
- Not implemented: logs for Collections, sprints, objectives, key results and events; paging; retention; backfill.
