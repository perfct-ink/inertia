---
priority: p2
depends_on: [kanban-organize-by-epic]
components: [frontend]
---
# Kanban: group by any field and WIP limits

## Objective

The Workboard can already be organized by epic (swimlane per epic plus No epic; see `docs/features/workboard_swimlanes.md`). Extend that to what the original Kanban request asked for beyond epics:

- **Group by any field**: swimlanes by assignee, sprint, milestone, priority, type or a custom task field, chosen from a "Group by" select that replaces the "Organize by epic" checkbox (Epic stays one of its options, None is the plain board).
- **WIP limits**: a limit per status column (set per board, like the status names in `docs/features/configurable_statuses.md`); a column over its limit shows it (count over limit, a warning color) but never blocks a drop.

## Current state

Only "Organize by epic" exists, as a checkbox. Lane building lives in `epicLanes` in `frontend/src/data/task.ts`; dropping a card in another lane saves the field the lane stands for (the epic today). Status columns can be renamed and recolored but not added, removed or reordered (a separate piece of work).

## Acceptance criteria

- A Group by select offers None, Epic, Assignee, Sprint, Milestone, Priority and Type; each lane is one value plus a lane for tasks with none; dragging between lanes saves that field.
- A WIP limit can be set per column by a member of the Space and shows on the column header; going over it is shown, not blocked.
- Failed API calls show an error. Tests and the feature doc cover it; this file is removed.
