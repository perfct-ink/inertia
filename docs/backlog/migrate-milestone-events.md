---
priority: p3
depends_on: []
components: [backend, frontend]
branch: backlog/migrate-milestone-events
---
# Decide and migrate milestone-type calendar events

## Objective
Remove the duplicate concept: calendar events with `event_type = milestone` and the `milestones` table both describe milestones.

## Context
`Event` has `event_type` deadline or milestone, still created from the Events page (default type milestone). The `Milestone` model, rollups and Gantt diamonds use only the `milestones` table, so an event milestone has no progress or health.

## Requirements
- Decide whether to migrate existing milestone events into `milestones` or keep both.
- If migrating: a data migration that creates a Milestone (title, description, target date from the event date, folder) per such event, and a plan for the Events page.

## Acceptance criteria
- The decision is written in `docs/features/milestones_and_rollups.md`.
- If migrated, every existing milestone-type event has a matching milestone and no data is lost; the migration can run twice without duplicates.

## Blocked
Built on the branch `backlog/migrate-milestone-events` (not merged, not deployed). The decision is in `docs/features/milestones_and_rollups.md`, Milestone-type calendar events: copy (not move), run on purpose, never on deploy. Nothing needs Alex's approval to merge; two product calls are recorded there so he can overrule them (copy rather than convert, and past-dated events become Done milestones).

**Done**
- Migration `20261102090001_add_source_event_to_milestones.rb` and the matching `schema.rb` edit (hand-edited, version `2026_11_02_090001`): nullable, unique `milestones.source_event_id`, FK to `events` with `on_delete: :nullify`. `Milestone` gets `belongs_to :source_event` and a same-Space check.
- `MilestoneEventMigration` (`backend/app/services/milestone_event_migration.rb`): plain-Ruby `plan` plus a thin `run`; and `rails milestones:from_events` (`backend/lib/tasks/milestones.rake`), dry run unless `APPLY=1`.
- Tests: `backend/test/services/milestone_event_migration_plan_test.rb` and `milestone_event_migration_test.rb`.
- Events page change planned as its own task: `docs/backlog/events-stop-offering-milestone-type.md` (depends on this one).
- Left in this file on purpose: this task file is deleted when the branch merges.

**Checks that ran:** `ruby -c` on every changed Ruby file; `MilestoneEventMigrationPlanTest` (10 tests) with plain `ruby` and a stand-in `test_helper` that loads ActiveSupport and the service file; `/tmp/runner/all.sh`.
**Checks that did not run (no network, Rails or database):** `rails db:migrate` and the `schema.rb` diff, the whole `rails test` suite (including `milestone_event_migration_test.rb`), `npm run lint`, and the rake task against real data.

**To verify before merging**
1. `cd backend && rails db:migrate`, then `git diff db/schema.rb`: the only changes should be the `version:` line, `t.bigint "source_event_id"`, its unique index, and the `add_foreign_key "milestones", "events"` line. If Rails dumps it differently, keep Rails' version.
2. `rails test test/services/milestone_event_migration_test.rb test/services/milestone_event_migration_plan_test.rb test/models/milestone_test.rb`, then the whole `rails test`.
3. In development: make two milestone events and one deadline event, run `rails milestones:from_events` (nothing is written), then `APPLY=1 rails milestones:from_events` (two milestones), then the dry run again (it must say 0 to create). Open `/milestones` and the Events page; the events must be unchanged.

**How Alex runs it in production** (after the merge deploys; the deploy only adds the column, it copies nothing). In Coolify, open the `inertia` resource, its `api` service, Terminal:
```
bin/rails milestones:from_events
```
Read the list: it names each event and the milestone it would make, and how many events already have one. Then:
```
APPLY=1 bin/rails milestones:from_events
```
To check the result, run the first command again. It must report `milestones to create (dry run, nothing written): 0`. Optionally, in a PostgreSQL session on `inertia_production`, this must return 0 (every milestone-type event has a milestone with the same Space, title and date):
```
SELECT count(*) FROM events e WHERE e.event_type = 1 AND NOT EXISTS (SELECT 1 FROM milestones m WHERE m.workspace_id = e.workspace_id AND lower(btrim(m.title)) = lower(btrim(e.title)) AND m.target_date = e.date);
```
`SELECT count(*) FROM events WHERE event_type = 1` must be unchanged from before the run, since events are never touched. Running the task twice is safe; add `WORKSPACE_ID=<id>` to do one Space at a time. To undo a copy, delete the milestones whose `source_event_id` is not null; the events are still there.
