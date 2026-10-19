# Task lines in documents

## What it does
A checklist item in a document (a `workspaceTaskItem` node in the editor) becomes a Space task.
- After each save (1.5 s debounce), every task line that has text and no `taskId` creates a task (`status: backlog`, title from the line, `document_id` of the document) and stores the new id on the line. Only one connected collaborator (lowest awareness client id) runs the sync, to avoid duplicates.
- The line shows a status dot (backlog, todo, in progress, in review, done) read live from the task list, and a calendar button. Once the line has a task, the button sets or clears the task's `due_date` (shown as "MMM d").
- Tasks are listed for a document by `GET /api/v1/tasks?document_id=`; tasks are also created via `POST /api/v1/documents/:id/tasks`.

- **Tasks only**: a toolbar button (filter icon) folds every top-level block except headings and task lists, in place, so tasks can still be checked, renamed and dated; click again to show the whole document. It is a CSS class on the page (`document-page--tasks_only`, `ProseMirror.scss`), not saved with the document.

## API and models
`tasks.document_id` (nullable, indexed); `Document has_many :tasks, dependent: :destroy`. Frontend: `syncTaskNodes` in `frontend/src/view/document/DocumentScreen.tsx`, `frontend/src/extensions/WorkspaceTaskItem.tsx`, `frontend/src/components/editors/WorkspaceTaskItemView.tsx`.

## Who can view and change
Anyone who can edit the document creates tasks; the due date uses the normal task update call. I did not check role-based limits.

## Tests
None for the sync, the node view or the `document_id` filter.

## Known limits
- The line has no checkbox: the dot shows status but clicking it does nothing, so checking a line and task status are not tied.
- Only the due date can be set from the line; start date, assignee and status cannot (see `docs/backlog/task-line-set-assignee-status-start-date.md`).
- The line does not follow the task: renaming the task elsewhere does not change the line, and editing the line text after sync does not rename the task. Deleting the task leaves a line with a dead id, and deleting the line leaves the task (see `docs/backlog/task-line-two-way-sync.md`).
- If the document is not found in the loaded Space, `syncTaskNodes` falls back to the first document in the tree (`allDocs[0]`), which could attach tasks to the wrong document.

## History
- Implemented 2026-10-15 to 2026-10-18 (creation, status dot, due date). Committed locally; not pushed or deployed.
- Not implemented: two-way sync, assignee/status/start date from the line.
- Not verified: lint, type-check, tests and the editor were not run (no dependencies installed, no network).
- Implemented 2026-10-19 (tasks-only toggle). Not verified: not run or tried in a browser; no automated test covers it. Paragraphs inside a list item or table are hidden with their block, and a non-task list that contains a task line is hidden too, because the rule works on top-level blocks.
