# Task table

## What it does
`/task-table` (sidebar rail "Task table") lists every task in the Space as an editable table. Columns: Title, Status, Start, Due, Assignee, Epic, Sprint. Everything edits in place and saves as you change it (a title saves when you leave the field and is ignored if blank). Click a column header to sort by it (click again to reverse; empty dates and names sort last); "Filter by title" narrows the list; "Group by" splits it under headings by status, epic, sprint or assignee; the Columns checkboxes hide any column except Title. Hiding and sorting are per visit.

## API and models
None new: it reads tasks, epics, sprints and Space members and saves with the normal task update call. Logic is in `frontend/src/data/taskTable.ts` (`taskTableGroups`, `visibleColumns`, reusing `pivotGroup` from `data/pivot.ts`); screen `view/task_table/TaskTableScreen.tsx`. It builds on `backlog/pivot-view` (it imports `data/pivot.ts`), so merge that first.

## Who can view and change
Anyone with write access to the Space can edit; viewers get the same controls but their saves fail with the usual error.

## Tests
`frontend/src/data/taskTable.test.ts`, `frontend/src/view/task_table/TaskTableScreen.test.tsx`.

## Known limits
- No adding or deleting tasks here, no bulk edit, no paging (every task renders), and no saved column or sort choices (see `docs/backlog/saved-views-per-user-and-shared-views-saved-filters.md`).
- Only the filter by title: no filter by status, epic or assignee (use the Workboard filters or group by).
- Fields that live on other branches (priority, estimates, recurrence) are not columns.

## History
- Implemented 2026-10-19 on branch `backlog/table-view-inline-editing`, stacked on `backlog/pivot-view`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser were not run (no node_modules).
