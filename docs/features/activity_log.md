# Activity log per item

## What it does
Every task, file (document, spreadsheet), epic, initiative and milestone keeps a log of who created it and who changed it, and when. An activity button on the item opens the log in a dialog, newest first, each entry showing the person, the time and one line per change:

- "Created this task" (or file, epic, initiative, milestone).
- "Changed status from To Do to Done", "Set assignee to Ada", "Cleared epic (was Launch)", "Changed due date from Nov 5, 2026 to Nov 9, 2026". Linked records (assignee, owner, epic, initiative, sprint, milestone, folder, parent task, document) are shown by name, as they were when the change was made.
- "Edited the description" / "Edited the content": the change is noted but the (long) text is not kept.

Where the button is (a pulse icon, titled "Activity"; a task's clock icon beside it is the older status history): each Workboard card and Backlog row on `/tasks`; the toolbar of a rich document and the header of a spreadsheet (`/documents/:id`); each epic card (`/epics`), initiative card (`/initiatives`) and milestone card (`/milestones`). On a phone the button is always visible and has a larger tap target. If the log cannot be loaded, the shared error notice appears and the dialog says so. A log with no entries says nothing has been recorded yet and that earlier changes are not listed.

What is logged, per model (the `audited` line of each):
- Task: title, type (task, bug, story), status, priority, start date, due date, repeat rule, story points, actual story points, estimate hours, assignee (the first assignee), epic, sprint, milestone, folder, document, parent task; description by name only.
- File: title, type, pinned, folder, and the feature fields (initiative, epic, milestone, feature status, parent feature, feature owner); content by name only.
- Epic: title, start and target date, horizon, initiative, milestone, folder.
- Initiative: title, status, start and target date, horizon, owner, milestone, folder (project); description by name only.
- Milestone: title, status, target date, owner, folder; description by name only.

Not logged: `position` (drag reordering), counts and rollups, custom task field values, and anything else not listed. Text values are cut at 200 characters.

A document or spreadsheet autosaves while someone types. Edits that change only the content, by the same person within 10 minutes of that person's last content entry, are folded into one entry whose time moves forward, so the log does not fill with one row per save.

## API and models
`activities` (`subject_type`, `subject_id` polymorphic, `actor_id` nullable, `action` created/updated, `field_changes` json, `created_at`; index on subject and time). There is no workspace column on purpose: an item can move to another Space (`space_transfer.md`) and its log goes with it. `Activity.log` writes entries and does the folding. The `Auditable` concern (`backend/app/models/concerns/auditable.rb`) gives a model `has_many :activities` (deleted with the item), `audited :field, ..., valueless: :field` and the `after_create` / `after_update` callbacks that write the entries in the same transaction as the save. `Current.user` (`backend/app/models/current.rb`, set in `ApplicationController`) is the actor. The collab server saves documents as the signed-in user, so those are attributed; background work such as imports and AI workers has no user and is shown as "Someone". `Activity::SUBJECT_TYPES` lists the audited models and a test keeps it in step.

`GET /api/v1/activities?subject_type=Task&subject_id=12` returns the latest 100 entries newest first (`id`, `action`, `actor_name`, `created_at`, `changes`, where `changes` maps a field to `[from, to]` or null for a name-only field). An unknown `subject_type`, a missing item, or an item in a Space the person is not in is 404. The item is looked up by id across the Spaces the person belongs to, as documents are, so the `X-Workspace-Id` header does not matter. Frontend: `api/activities.ts` (`ActivityApi`, `useActivities`), `data/activity.ts` (wording, labels, dates), `components/activity/ActivityButton.tsx` and `ActivityDialog.tsx`.

## Who can view and change
Any member of the item's Space, viewers included, can read its log (another Space's items are 404, never revealed). Nothing writes, edits or deletes entries through the API; they are written only by saving the item and removed with it. The log shows the names of people who are already visible in the Space.

## Tests
`backend/test/models/activity_test.rb` (creation, actor, named associations, enum and number fields, unaudited fields, truncation, document folder move, folding of content edits and when they start a new entry, deletion with the item, deleting the actor, the subject type list), `backend/test/controllers/activities_controller_test.rb` (tasks and documents over HTTP, an item in another Space, a document that moved Spaces, viewer, unknown type, signed out), `frontend/src/data/activity.test.ts`, `frontend/src/components/activity/ActivityDialog.test.tsx`, `ActivityButton.test.tsx` (including that clicks do not reach the card around the button), and `MilestonesScreen.test.tsx`.

## Known limits
- Items that existed before this shipped have no history until their next change; there is no backfill.
- Changes made without model callbacks (bulk `update_all`, `touch`, SQL, nullifying links when a milestone or initiative is deleted, moving a whole folder between Spaces, the macOS local task file) are not logged. Replacing an uploaded file's contents is not logged. Collection fields and records are edited through the tables API, so a Collection has no log button yet (`docs/backlog/activity-log-collection-fields-and-records.md`); uploaded files are recorded (renames, moves) but their viewer has no button yet; sprints, objectives, key results and events are not audited yet (`docs/backlog/activity-log-sprints-objectives-and-events.md`).
- A task has any number of assignees and watchers, but only the first assignee (`tasks.assignee_id`) is logged; adding a second assignee or a watcher writes nothing (`docs/backlog/activity-log-task-assignees-and-watchers.md`). Custom task field values are not logged.
- Status names show the defaults ("To Do", "In Progress"), not a Space's renamed statuses (`configurable_statuses.md`).
- The dialog shows the latest 100 entries with no way to page further back; there is no retention or pruning and no Space-wide feed.
- The task cards (Workboard and Backlog) have the button; the task table, the Cards view, the calendar and the task edit dialog do not.
- **Overlap with the task status history** (`task_status_history.md`, merged): a task keeps its own status-only table (`task_status_changes`) for burndown and velocity reports, and its own clock button, so a task card shows both buttons and a status change is recorded twice. Both are kept: the status history is groundwork for reports (`docs/backlog/agile-reports.md`) and removing its button is Alex's call.
- **Overlap with agent access** (branch `backlog/ai-worker-agent-access`, not merged): it keeps its own list of what outside agents changed in tables `agent_tokens` and `agent_activities` (model `AgentActivity`, route `GET /api/v1/agent_activities`). This feature uses `activities` / `Activity` and `GET /api/v1/activities`, so the names do not clash and the two branches can merge in either order. They share no code. Until `docs/backlog/activity-log-name-agents.md` is done, a change an agent makes through its token is logged here without an actor and shows as "Someone".
- Not the admin audit log (`docs/backlog/audit-log-sso-mfa-data-export.md`), which is a Space-wide feed for owners; this log is per item and visible to every member.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/activity-log-per-item`), merged with main on 2026-11-02, then re-applied as one commit on top of main on 2026-11-09. The 2026-11-09 pass changed the design in three ways: the log is found through the item's current Space instead of a `workspace_id` on each entry (so it follows an item that moves between Spaces); more fields are logged (task type, repeat rule, actual story points, a file's feature fields, an initiative's project); the button uses a pulse icon so it differs from the status history's clock.
- Migration `20261108230001_create_activities.rb`; `schema.rb` was edited by hand.
- Ran: the offline checks (`/tmp/runner/all.sh`: TypeScript parse and import checks, SCSS compile, `ruby -c`, the pure data tests and the Jest stand-in for `ActivityDialog`, `ActivityButton` and `MilestonesScreen`).
- Not verified: `rails db:migrate`, `rails test` (no database, so the model and controller tests have not run), `npm run lint`, `tsc -b`, the full Jest suite with the real packages (`TasksScreen.test.tsx` needs `@dnd-kit`), RuboCop and Brakeman, and the browser at 375px, desktop, light and dark.
- Not implemented: logs for Collections, sprints, objectives, key results and events; all assignees and watchers; naming agents; paging; retention; backfill.
