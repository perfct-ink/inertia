# Task table

## What it does
`/task-table` (sidebar rail "Task table") lists every task in the Space as an editable table. Columns: Title, Status, Start, Due, Assignee, Epic, Sprint. Everything edits in place and saves as you change it (a title saves when you leave the field and is ignored if blank). Click a column header to sort by it (click again to reverse; empty dates and names sort last); "Filter by title" narrows the list; "Group by" splits it under headings by status, epic, sprint or assignee; the Columns checkboxes hide any column except Title. Sort, grouping, filter and hidden columns are per visit unless saved as a view (below).

**Saved views**: the bar above the columns saves the current sort, grouping, filter and hidden columns under a name ("Save this view as…", optionally "Share with the Space"). The Views menu lists your own views and the Space's shared ones (shared ones show their owner); choosing one applies it. You can delete your own views. A stored view that is out of date or malformed falls back to defaults field by field (`parseTaskTableConfig`).

## API and models
None new: it reads tasks, epics, sprints and Space members and saves with the normal task update call. Logic is in `frontend/src/data/taskTable.ts` (`taskTableGroups`, `visibleColumns`, reusing `pivotGroup` from `data/pivot.ts`); screen `view/task_table/TaskTableScreen.tsx`. It builds on `backlog/pivot-view` (it imports `data/pivot.ts`), so merge that first.

## Who can view and change
Anyone with write access to the Space can edit; viewers get the same controls but their saves fail with the usual error.

## Saved views API
`saved_views` (`workspace_id`, `user_id`, `page`, `name`, `config` JSON, `shared`). `GET /api/v1/saved_views?page=` returns your views plus shared ones; `POST`, `PATCH`, `DELETE /api/v1/saved_views/:id`. Only the owner changes a view; a Space admin can also change or delete a shared one (403 for others on a shared view, 404 for someone else's private view). Pages are listed in `SavedView::PAGES` (`task_table`).

## Tests
`frontend/src/data/taskTable.test.ts`, `frontend/src/view/task_table/TaskTableScreen.test.tsx`, `frontend/src/components/SavedViews.test.tsx`, `backend/test/models/saved_view_test.rb`, `backend/test/controllers/saved_views_controller_test.rb`.

## Known limits
- No adding or deleting tasks here, no bulk edit, no paging (every task renders). Saved views exist only for this table (the `saved_views` model takes a `page` and any page can adopt it); renaming a view is not in the UI.
- Only the filter by title: no filter by status, epic or assignee (use the Workboard filters or group by).
- Fields that live on other branches (priority, estimates, recurrence) are not columns.

## History
- Implemented 2026-10-19 on branch `backlog/table-view-inline-editing`, stacked on `backlog/pivot-view`. Not merged or deployed. Saved views added the same day on branch `backlog/saved-views-per-user-and-shared-views-saved-filters`, stacked on the table branch.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand.
