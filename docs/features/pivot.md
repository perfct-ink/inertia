# Pivot

## What it does
`/pivot` (sidebar rail "Pivot") counts the Space's tasks in a table: one field down the side (Rows) and another across the top (Columns), chosen from Status, Epic, Sprint and Assignee, with row, column and grand totals. The default is epic by status. Tasks with no epic/sprint/assignee fall under "No epic", "No sprint" or "Unassigned", listed last; statuses keep board order (backlog to done). Empty cells are blank. The table is read-only.

## API and models
None: it reads tasks, epics, sprints and Space members and counts in the browser (`pivotTasks` in `frontend/src/data/pivot.ts`, screen `view/pivot/PivotScreen.tsx`).

## Who can view and change
Anyone in the Space can view; nothing here changes data.

## Tests
`frontend/src/data/pivot.test.ts`, `frontend/src/view/pivot/PivotScreen.test.tsx`.

## Known limits
- Counts only: no sums of estimates or story points (those fields are on `backlog/task-priority-effort-and-story-points`), no other dimensions (milestone, priority, folder), and no clicking a cell to see its tasks.
- Rows and columns may be the same field (the table is then diagonal).
- Whole Space; no filters.

## History
- Implemented 2026-10-19 on branch `backlog/pivot-view`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser were not run (no node_modules).
