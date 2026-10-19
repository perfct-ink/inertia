# Task lines in documents

## What it does
A checklist item in a document (a `workspaceTaskItem` node in the editor) becomes a Space task.
- After each save (1.5 s debounce), every task line that has text and no `taskId` creates a task (`status: backlog`, title from the line, `document_id` of the document) and stores the new id on the line. Only one connected collaborator (lowest awareness client id) runs the sync, to avoid duplicates.
- The line shows a status dot (backlog, todo, in progress, in review, done) read live from the task list, and a calendar button. Once the line has a task, the button sets or clears the task's `due_date` (shown as "MMM d").
- Tasks are listed for a document by `GET /api/v1/tasks?document_id=`; tasks are also created via `POST /api/v1/documents/:id/tasks`.

- A "Tasks only" toggle in the document toolbar (`aria-pressed`) folds every top-level block except headings and task lists in place, via the `document-page--tasks_only` class (`DocumentScreen.scss`). It is a CSS fold, so checking lines, dates and collaboration work as normal; toggling back restores the prose. The setting is per page view and is not saved.

- **Make selection a task**: select text in a document (for example an acceptance criterion in a requirements doc) and press "Make selection a task" in the toolbar. The selection is replaced by a task line with that text (whitespace collapsed to one line); the normal sync then creates the Space task linked to the document (`document_id`). The button is disabled with nothing selected. Code: `selectionTaskTitle` and `taskListContent` in `data/document.ts`.

## API and models
`tasks.document_id` (nullable, indexed); `Document has_many :tasks, dependent: :destroy`. Frontend: `syncTaskNodes` in `frontend/src/view/document/DocumentScreen.tsx`, `frontend/src/extensions/WorkspaceTaskItem.tsx`, `frontend/src/components/editors/WorkspaceTaskItemView.tsx`.

## Who can view and change
Anyone who can edit the document creates tasks; the due date uses the normal task update call. I did not check role-based limits.

## Tests
`frontend/src/data/document.test.ts` covers the selection-to-task helpers. None for the sync, the node view, the toolbar button or the `document_id` filter.

## Known limits
- The line has no checkbox: the dot shows status but clicking it does nothing, so checking a line and task status are not tied.
- Only the due date can be set from the line; start date, assignee and status cannot (see `docs/backlog/task-line-set-assignee-status-start-date.md`).
- The line does not follow the task: renaming the task elsewhere does not change the line, and editing the line text after sync does not rename the task. Deleting the task leaves a line with a dead id, and deleting the line leaves the task (see `docs/backlog/task-line-two-way-sync.md`).
- If the document is not found in the loaded Space, `syncTaskNodes` falls back to the first document in the tree (`allDocs[0]`), which could attach tasks to the wrong document.

## History
- Implemented 2026-10-15 to 2026-10-18 (creation, status dot, due date). Committed locally; not pushed or deployed.
- Tasks only toggle added 2026-10-19. Not verified: no dependencies installed, so lint, type-check and the browser were not run; no automated test (a CSS-only fold). Not pushed through CI.
- Not implemented: two-way sync, assignee/status/start date from the line.
- Not verified: lint, type-check, tests and the editor were not run (no dependencies installed, no network).
- Make-selection-a-task added 2026-10-19 on branch `backlog/create-tasks-from-a-feature-doc`, not merged. Limits: it needs a selection (no caret-only conversion of a whole bullet), and the replaced text is not kept as prose. Not verified: lint, type-check, tests and the editor were not run (no node_modules).
