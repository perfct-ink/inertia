# Milestones and rollups

## What it does
- **Milestones page** (`/milestones`, UI label Milestones): create a milestone by title, then edit its target date and status (Planned, Active, Done). Each card shows a health badge (On track, At risk, Off track), a progress bar and counts of tasks, done tasks, epics and initiatives under it.
- A milestone is flat (no nesting). Initiatives, epics and tasks each carry an optional `milestone_id`.
- **Rollup**: a task counts toward its own milestone; without one it inherits its epic's, and an epic without one inherits its initiative's. A task's own milestone overrides an inherited one. Items with no milestone anywhere are not counted.
- **Health** (`PlanningHealth#health`): done, 100% or no target date is on track; a target date in the past is off track; a target within 14 days with under 75% done is at risk; otherwise on track.

## API and models
- `milestones` table: `workspace_id`, `folder_id`, `owner_id`, `title` (required), `description`, `target_date`, `status` (planned, active, done), timestamps. Model `Milestone` (`PlanningItem`, `PlanningHealth`); deleting one nullifies the initiatives, epics and tasks under it.
- `MilestoneRollup.for(workspace)` returns a summary per milestone using four queries. `MilestoneBlueprint` adds `tasks_count`, `done_tasks_count`, `epics_count`, `initiatives_count`, `percent` and `health`.
- `/api/v1/milestones` (index, create, update, destroy). Index is ordered by target date (undated last), then title. Writable params: title, description, target_date, status, owner_id, folder_id.
- Validations: owner must be a member of the Space; folder, and any milestone used by an initiative, epic or task, must belong to the same Space.
- Frontend: `view/milestones/MilestonesScreen.tsx`, `api/milestones.ts`, `data/milestone.ts` (statuses and health labels), `components/ui/HealthBadge.tsx`.

## Who can view and change
Scoped to the current Space (`WorkspaceScoped`). A controller test confirms viewers cannot change milestones; I did not check other roles.

## Tests
- `backend/test/models/milestone_test.rb` (title, owner, same-Space, health, delete keeps children)
- `backend/test/models/milestone_rollup_test.rb`
- `backend/test/controllers/milestones_controller_test.rb`
- `frontend/src/view/milestones/MilestonesScreen.test.tsx`, `frontend/src/data/milestone.test.ts`

## Known limits
- The Milestones page edits title, target date and status only. Description, owner and folder are accepted by the API but have no field on the page.
- Existing calendar events with `event_type = milestone` are not migrated into the `milestones` table. Both exist side by side; see `docs/backlog/migrate-milestone-events.md`.
- A task's milestone cannot be changed after creation; see `docs/backlog/task-detail-edit-milestone.md`.

## History
- Milestone model, API and page implemented 2026-10-15 (rollup and health on the same day). Deployment not checked.
- Not verified: no tests, lint or browser run for this doc; findings come from reading the code.
