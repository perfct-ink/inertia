# Hierarchy reparenting

## What it does
On the Hierarchy page (`/hierarchy`) rows can be dragged onto another row to move them:

- initiative onto a milestone
- epic onto an initiative or a milestone
- task onto an epic, another task (becomes a subtask), or a milestone
- any item onto the **Unassigned** zone to detach it from every parent

Milestones cannot be moved. A task cannot be dropped into itself or its own subtree. Dropping a task on another task only sets `parent_id`; it keeps its own `epic_id` so epic counts do not change underneath it. After a move, milestones, initiatives, epics and tasks are refetched, since progress rolls up at each level.

## Rules in code
- Allowed moves: `reparentChanges` in `frontend/src/data/hierarchy.ts`.
- Server checks: `Task#parent_is_not_self_or_a_descendant`, and the `SameWorkspace` concern (`validates_same_workspace`) so an epic's initiative, a task's epic and parent, and any milestone must belong to the same Space. Epic, initiative and milestone cannot form cycles (separate tables, one-way keys).

## API
Moves use the existing `PATCH /api/v1/initiatives/:id`, `/epics/:id` and `/tasks/:id` with `milestone_id`, `initiative_id`, `epic_id` or `parent_id`.

## Who can view and change
Scoped to the current Space; I did not check role-based limits.

## Tests
`data/hierarchy.test.ts` (`reparentChanges`), `backend/test/models/epic_test.rb` and `task_test.rb` (cross-Space rejection).

## Known limits
No keyboard-accessible move, no ordering by drop position, and a server rejection only shows the global API error.

## History
- Implemented 2026-10-18. Committed locally; not pushed or deployed.
- Not verified: tests, lint, type-check and the drag interaction were not run (no dependencies installed, no network). Existing tests that build records across Spaces, which the new validation would now reject, were not checked.
