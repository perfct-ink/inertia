---
priority: p3
depends_on: []
components: [backend, frontend]
branch: backlog/migrate-milestone-events
status: incomplete
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

## Unverified
Built on branch `backlog/migrate-milestone-events` (rebased onto `origin/main` 2026-11-09; not merged, not deployed). Nothing here has run against any database, and an agent never runs it against production. The decision (copy, run on purpose, never on deploy) is in `docs/features/milestones_and_rollups.md`, Milestone-type calendar events; two product calls are recorded there for Alex to overrule: copy rather than convert, and past-dated events become Done milestones.

**Done**
- Schema migration `20261108300001_add_source_event_to_milestones.rb` plus the `schema.rb` edit (hand-edited, version `2026_11_08_300001`): nullable, unique `milestones.source_event_id`, FK to `events` with `on_delete: :nullify`. It is additive and only adds a column, so it deploys safely with the code (`db:prepare` runs it on boot) and a rollback to the previous release ignores it. It copies no data. `Milestone` gets `belongs_to :source_event` and a same-Space check.
- The data step is a rake task, not a migration: `rails milestones:from_events` (`backend/lib/tasks/milestones.rake`) over `MilestoneEventMigration` (`backend/app/services/milestone_event_migration.rb`). It is a dry run unless `APPLY=1`, prints the database it is connected to, lists each event and the milestone it would make, copies and never edits or deletes an Event, an `event_tasks` link, a task or an existing milestone, reports counts, and is safe to run twice (an event is skipped when a milestone already points at it, when a milestone in the same Space has the same title and date, or when an earlier event in the run has the same Space, title and date).
- Tests: `backend/test/services/milestone_event_migration_plan_test.rb`, `backend/test/services/milestone_event_migration_test.rb`, `backend/test/tasks/milestones_rake_test.rb`.
- Docs: `docs/features/milestones_and_rollups.md` (decision, how to run, limits), its row in `docs/features/README.md`, one line in `docs/features/task_calendar.md`.
- New backlog tasks: `docs/backlog/events-stop-offering-milestone-type.md` (the Events page plan; depends on this one) and `docs/backlog/nullify-milestones-when-folder-is-deleted.md` (a gap found while checking the copy).

**Checks that ran:** `ruby -c` on every changed Ruby file (including `schema.rb`, the migration and the rake file); `MilestoneEventMigrationPlanTest` (10 tests, 33 assertions) with plain `ruby` and a stand-in `test_helper` that loads ActiveSupport and the service file; `/tmp/runner/all.sh`.
**Checks that did not run (no network, Rails, database or RuboCop here):** `rails db:migrate` and the `schema.rb` diff, the whole `rails test` suite (including `milestone_event_migration_test.rb` and `milestones_rake_test.rb`), `make lint-backend`, and the rake task against any data.

### To verify before merging
1. `cd backend && bin/rails db:migrate`, then `git diff db/schema.rb`: only the `version:` line, `t.bigint "source_event_id"`, its unique index and the `add_foreign_key "milestones", "events"` line may differ. If Rails dumps it differently, keep Rails' version.
2. `cd backend && bin/rails test test/services/milestone_event_migration_test.rb test/services/milestone_event_migration_plan_test.rb test/tasks/milestones_rake_test.rb test/models/milestone_test.rb`, then `make test` and `make lint-backend`.
3. In development: make two milestone events and one deadline event on the Events page, then run `bin/rails milestones:from_events` (nothing is written), `APPLY=1 bin/rails milestones:from_events` (two milestones), and the dry run again (it must report 0 to create). Open `/milestones` and the Events page; the events must be unchanged.

### Dry run on a restored backup first (Alex)
The task writes production data, so rehearse it on a copy before it ever runs in production. Nothing below changes production: the dump only reads it.

1. Dump production. Use your normal backup if you have one; otherwise from a host that can reach shared-postgres (its Coolify terminal, then copy the file out), with the real URL in place of the placeholder:
```bash
pg_dump --format=custom --no-owner --no-privileges --file inertia_production.dump "<production DATABASE_URL>"
```
2. Restore it into a scratch database on your machine, never over production:
```bash
createdb inertia_milestone_rehearsal
pg_restore --no-owner --no-privileges --dbname inertia_milestone_rehearsal inertia_production.dump
```
3. Point Rails at the scratch copy in the development environment (so production credentials are not used), add the column, and note how many milestone events and milestones there are, plus a fingerprint of the events and their task links to compare afterwards:
```bash
cd backend
export DATABASE_URL=postgres://localhost/inertia_milestone_rehearsal
RAILS_ENV=development bin/rails db:migrate
psql "$DATABASE_URL" -c "SELECT count(*) AS milestone_events FROM events WHERE event_type = 1"
psql "$DATABASE_URL" -c "SELECT count(*) AS milestones_before FROM milestones"
psql "$DATABASE_URL" -c "SELECT md5(string_agg(e::text, '|' ORDER BY id)) AS events_before FROM events e"
psql "$DATABASE_URL" -c "SELECT md5(string_agg(t::text, '|' ORDER BY id)) AS event_tasks_before FROM event_tasks t"
```
4. Dry run. The first line must say `Database: inertia_milestone_rehearsal on localhost (Rails development)`. Read the list: each event, the milestone it would make, and how many events already have one:
```bash
RAILS_ENV=development bin/rails milestones:from_events
```
5. Apply it to the copy, then run it again (it must report `milestones to create (dry run, nothing written): 0`):
```bash
APPLY=1 RAILS_ENV=development bin/rails milestones:from_events
RAILS_ENV=development bin/rails milestones:from_events
```
6. Check the copy. Events and event links must fingerprint exactly as before, milestones must have grown by the `milestones created` count, and this must return 0 (every milestone-type event has a milestone in its Space with the same title and date; a whitespace-only title is the one exception, and the task reports those as skipped):
```bash
psql "$DATABASE_URL" -c "SELECT md5(string_agg(e::text, '|' ORDER BY id)) AS events_after FROM events e"
psql "$DATABASE_URL" -c "SELECT md5(string_agg(t::text, '|' ORDER BY id)) AS event_tasks_after FROM event_tasks t"
psql "$DATABASE_URL" -c "SELECT count(*) AS milestones_after FROM milestones"
psql "$DATABASE_URL" -c "SELECT count(*) AS unmatched FROM events e WHERE e.event_type = 1 AND NOT EXISTS (SELECT 1 FROM milestones m WHERE m.workspace_id = e.workspace_id AND lower(btrim(m.title)) = lower(btrim(e.title)) AND m.target_date = e.date)"
```
Any `FAILED event ...` line in the output means that event's milestone did not validate (for example its folder is in another Space); the others were still copied. Then clean up with `unset DATABASE_URL` and `dropdb inertia_milestone_rehearsal`.

### Then in production (Alex)
Only after the rehearsal looks right and this branch is merged and deployed (the deploy adds the column and copies nothing). Take a fresh backup (step 1) first. In Coolify, open the `inertia` resource, its `api` service, Terminal. The first line of output must say `Database: inertia_production`. Read the dry run:
```bash
bin/rails milestones:from_events
```
Then apply, and run the dry run again; it must report `milestones to create (dry run, nothing written): 0`:
```bash
APPLY=1 bin/rails milestones:from_events
bin/rails milestones:from_events
```
Add `WORKSPACE_ID=<id>` to do one Space at a time. Events are never touched, so `SELECT count(*) FROM events WHERE event_type = 1` is the same before and after. To undo a copy: `bin/rails runner 'Milestone.where.not(source_event_id: nil).destroy_all'` removes the copies (anything attached to a copy loses that milestone); the events are still there, and running the task again would copy them again.
