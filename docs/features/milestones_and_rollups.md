# Milestones and rollups

## What it does
- **Milestones page** (`/milestones`, UI label Milestones): create a milestone by title, then edit its target date and status (Planned, Active, Done). Each card shows a health badge (On track, At risk, Off track), a progress bar and counts of tasks, done tasks, epics and initiatives under it.
- A milestone is flat (no nesting). Initiatives, epics and tasks each carry an optional `milestone_id`.
- **Rollup**: a task counts toward its own milestone; without one it inherits its epic's, and an epic without one inherits its initiative's. A task's own milestone overrides an inherited one. Items with no milestone anywhere are not counted.
- **Health** (`PlanningHealth#health`): done, 100% or no target date is on track; a target date in the past is off track; a target within 14 days with under 75% done is at risk; otherwise on track.

## API and models
- `milestones` table: `workspace_id`, `folder_id`, `owner_id`, `title` (required), `description`, `target_date`, `status` (planned, active, done), `source_event_id` (see Milestone-type calendar events), timestamps. Model `Milestone` (`PlanningItem`, `PlanningHealth`); deleting one nullifies the initiatives, epics and tasks under it.
- `MilestoneRollup.for(workspace)` returns a summary per milestone using four queries. `MilestoneBlueprint` adds `tasks_count`, `done_tasks_count`, `epics_count`, `initiatives_count`, `percent` and `health`.
- `/api/v1/milestones` (index, create, update, destroy). Index is ordered by target date (undated last), then title. Writable params: title, description, target_date, status, owner_id, folder_id.
- Validations: owner must be a member of the Space; folder, and any milestone used by an initiative, epic or task, must belong to the same Space.
- Frontend: `view/milestones/MilestonesScreen.tsx`, `api/milestones.ts`, `data/milestone.ts` (statuses and health labels), `components/ui/HealthBadge.tsx`.

## Milestone-type calendar events

Two things used to mean "milestone": a calendar `Event` with `event_type = milestone` (made on the Events page, where milestone is still the default type) and a `Milestone` row. Only the `milestones` table has progress, health, the Roadmap and the Gantt diamonds, so an event milestone never had any of them.

### Decision (build the conservative version; Alex can overrule)

The milestone-type events are **copied** into `milestones` by a task someone runs on purpose. They are not converted or deleted, and the data step does not run on deploy. The call is Alex's, so the cautious option was built and these are the reasons:

- **Copy, not move.** Each Event row, its linked tasks (`event_tasks`) and its place on the calendar stay as they are, so nothing is lost and the step can be rolled back by deleting the copies. Both concepts keep working side by side until Alex decides to retire the event type.
- **A rake task, not a migration that runs on deploy.** Rails runs `db:prepare` on every production boot, so a data migration would change production data the moment `main` deploys, with no look at it first. The schema migration (`source_event_id`) is only a column and is safe to deploy. The data step is `rails milestones:from_events`, a dry run unless `APPLY=1`, so Alex sees what would be created before anything is written.
- **Safe to repeat.** `milestones.source_event_id` records which event a milestone came from (unique, cleared if the event is deleted). An event that already has a milestone is skipped even after someone renames or re-dates it. An event is also skipped when a milestone in the same Space already has the same title and target date (case and outer spaces ignored), so a milestone made by hand is not duplicated, and two identical events share one milestone. Existing milestones are never edited, not even to add the link.
- **Fields.** Title, description, target date (the event date) and folder carry over. There is no owner (events have none). Status is Done when the event date is before the day the task runs and Planned otherwise, so the Milestones page does not show years of history as Off track. This is a guess about old events, easy to change from the page.
- **Linked tasks are not attached.** Setting `tasks.milestone_id` would change the rollup of whatever milestone those tasks already count toward (a task's own milestone overrides an inherited one), and one task can sit on several events. A copied milestone starts with no tasks; attach tasks to it once a task's milestone can be edited (`docs/backlog/task-detail-edit-milestone.md`).
- **Start and end times** exist only on events, so they are not copied (milestones are whole days). The Event keeps them.

If a copied milestone is deleted while its Event remains, running the task again copies the event again. Delete the Event too (or do not run it again) if that is not wanted.

### Plan for the Events page

Not built; see `docs/backlog/events-stop-offering-milestone-type.md`. Once the copy has been checked in production, the New event form stops offering Milestone (Deadline becomes the only type, so the type picker is hidden because a single choice is not worth showing), and existing milestone-type events show a "Milestone" label with a link to the matching milestone. The API keeps accepting `event_type = milestone`, so older clients keep working.

### Running and checking it

Dry run, then apply, then confirm by running the dry run again; it reports `milestones to create ... 0`. `WORKSPACE_ID=<id>` limits a run to one Space. Only `APPLY=1` writes; any other value, or none, is a dry run. The first line of the output names the database and Rails environment it is connected to, so a run against the wrong database is visible before anything is written. The task only adds milestones: it never edits or deletes an Event, an `event_tasks` link, a task or an existing milestone.

```bash
bin/rails milestones:from_events
APPLY=1 bin/rails milestones:from_events
bin/rails milestones:from_events
```

This writes production data, so it is dry-run first on a restored backup, then in production (the exact commands are in the `Unverified` section of `docs/backlog/migrate-milestone-events.md` until that task merges). An agent never runs it against production.

The logic is `MilestoneEventMigration` (`backend/app/services/milestone_event_migration.rb`); the task is in `backend/lib/tasks/milestones.rake`.

## Who can view and change
Scoped to the current Space (`WorkspaceScoped`). A controller test confirms viewers cannot change milestones; I did not check other roles.

## Tests
- `backend/test/models/milestone_test.rb` (title, owner, same-Space, health, delete keeps children)
- `backend/test/models/milestone_rollup_test.rb`
- `backend/test/controllers/milestones_controller_test.rb`
- `backend/test/services/milestone_event_migration_plan_test.rb` (matching and repeat-safety over plain objects) and `backend/test/services/milestone_event_migration_test.rb` (the same against the database, events and tasks untouched, one Space, failures, unique link)
- `backend/test/tasks/milestones_rake_test.rb` (the rake task: names the database, dry run by default, `APPLY=1` writes, a second run finds nothing)
- `frontend/src/view/milestones/MilestonesScreen.test.tsx`, `frontend/src/data/milestone.test.ts`

## Known limits
- The Milestones page edits title, target date and status only. Description, owner and folder are accepted by the API but have no field on the page.
- Milestone-type calendar events are copied into `milestones` only when someone runs `rails milestones:from_events`; until then, and afterwards for any event made later, both exist side by side. The Events page still offers Milestone as a type; see Milestone-type calendar events above.
- Copied milestones start with no tasks, no owner and no link back from the Event page. The Event stays on the calendar, the Events page and the project page's Upcoming Events, while the copy shows on the Milestones page, the Roadmap and the Gantt, so until the Events page change ships a project shows the same milestone in both places.
- A milestone filed in a project (`folder_id`, which the copy keeps from the event) is not handled when that folder is deleted: `milestones.folder_id` has no `on_delete` and `Folder` has no `has_many :milestones`, so deleting the folder looks like it fails with a foreign-key error (read from the code, not reproduced). This predates the copy, but the copy files more milestones in folders; see `docs/backlog/nullify-milestones-when-folder-is-deleted.md`.
- A task's milestone cannot be changed after creation; see `docs/backlog/task-detail-edit-milestone.md`.

## History
- Milestone model, API and page implemented 2026-10-15 (rollup and health on the same day). Deployment not checked.
- Not verified: no tests, lint or browser run for this doc; findings come from reading the code.
- Milestone-type events copy implemented 2026-11-02, rebased onto main 2026-11-09 (not merged, not deployed; on branch `backlog/migrate-milestone-events`): `milestones.source_event_id` migration `20261108300001`, `MilestoneEventMigration`, the `milestones:from_events` task (prints the database it is connected to), tests. Never run against any database, production included. Not implemented: the Events page change, attaching the event's tasks to the copy, and showing the link on the Events page.
- Not verified for the copy: `rails db:migrate`, `rails test` (neither Rails nor a database was available), and the rake task itself. Only `MilestoneEventMigrationPlanTest` was run, with plain `ruby` and a stand-in `test_helper`, and it passed (10 tests).
