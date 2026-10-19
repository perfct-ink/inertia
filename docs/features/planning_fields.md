# Initiative and task planning fields

## What it does
- **Initiatives page** (`/initiatives`): each initiative card edits start and target date, status (Planned, Active, Done), owner (a member of the Space), milestone, and description. Description saves when the field loses focus, only if it changed.
- **Task quick-add** (`/tasks`, the board and backlog add rows): a milestone picker next to the epic and sprint pickers, shown when the Space has milestones. The new task is created with that `milestone_id`.

## API and models
`initiatives.owner_id` references `users`. Initiative fields go through `PATCH /api/v1/initiatives/:id`; the picker sends `milestone_id` on `POST /api/v1/tasks`.

## Who can view and change
Scoped to the current Space; I did not check role-based limits. The owner list is the Space's members.

## Tests
No new tests for these screens.

## Known limits
A task's milestone cannot be changed after creation (there is no task detail view).

## History
- Implemented 2026-10-18. Committed locally; not pushed or deployed.
- Not verified: lint, type-check and the screens were not run (no dependencies installed, no network).
