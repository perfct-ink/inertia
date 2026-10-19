# Hierarchy tree view

## What it does
The Hierarchy page (`/hierarchy`) shows Milestone, Initiative, Epic, Task and Subtask as one expandable tree. Each node can be expanded or collapsed (button labelled Expand/Collapse), and every level has a progress bar (done tasks over tasks). Anything with no parent chain and no milestone is listed in an **Unassigned** section instead of being dropped. Moving rows by drag is documented in `hierarchy_reparenting.md`.

## How the tree is built
`buildHierarchy` in `frontend/src/data/hierarchy.ts` normalizes the four lists into `HierarchyNode`s. Nesting follows the structural parent first (`epic_id`, `parent_id`, an epic's `initiative_id`); an item with no structural parent falls back to its own `milestone_id`, mirroring the server's `MilestoneRollup` inheritance. Milestone, initiative and epic counts come from the API; a task's progress is computed in the browser from itself plus its subtask tree (`buildTaskTree` in `data/task.ts`).

## API and models
No endpoint of its own. The screen reads milestones, initiatives, epics and tasks through their existing hooks (`useMilestones` etc.). See `milestones_and_rollups.md`.

## Who can view and change
Scoped to the current Space; I did not check role-based limits.

## Tests
`frontend/src/data/hierarchy.test.ts` covers the full nesting, the epic and task fallbacks to `milestone_id`, the unassigned bucket and the subtask rollup (the same file also tests moves). There is no test of `HierarchyScreen` itself.

## Known limits
- All four lists are fetched in full; no paging.
- Expand state is local to the page and is lost on reload.

## History
- Implemented 2026-10-16 (moves added later, see `hierarchy_reparenting.md`). Deployment not checked.
- Not verified: tests, lint and the page were not run; read from code only.
