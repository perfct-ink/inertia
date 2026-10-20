# Task detail (edit after creation)

## What it does
On the Tasks board, each card has an **Edit** (pencil) button. It opens a dialog to change the task's title, description, status, start date, due date, epic, sprint and milestone after it was created. Only changed fields are sent; clearing a date, epic, sprint or milestone sets it to none. Save is disabled until something changed. A blank title, or a due date before the start date, shows why it can't be saved. A failed save shows an error and keeps the dialog open.

## API and models
Uses `PATCH /api/v1/tasks/:id`, which already permits these fields. No backend change. Pure helpers `taskDraft`, `taskChanges` and `taskDraftError` are in `frontend/src/data/task.ts`.

## Who can view and change
Anyone who can write in the Space (the same rule as other task edits).

## Web entry point
`/tasks` board, `components/tasks/TaskDetail.tsx`.

## Tests
`frontend/src/data/task.test.ts` (draft helpers), `frontend/src/components/tasks/TaskDetail.test.tsx`.

## Known limits
Only on the Tasks board; folder boards, lists and the Gantt don't open it. Assignee, parent and folder are not editable here. The board's own status dropdowns and "move to next" arrow still work separately.

## History
- Implemented 2026-10-19 on branch `backlog/task-detail-edit-milestone`; not merged or deployed.
- Not verified: Jest, lint, type-check, the browser. The pure helper tests and a static import/syntax check ran.
