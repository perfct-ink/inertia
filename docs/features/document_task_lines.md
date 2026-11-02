# Task lines in documents

## What it does
A checklist item in a document (a `workspaceTaskItem` node in the editor) becomes a Space task.
- After each save (1.5 s debounce), every task line that has text and no `taskId` creates a task (`status: backlog`, title from the line, `document_id` of the document) and stores the new id on the line. Only one connected collaborator (lowest awareness client id) runs the sync, to avoid duplicates.
- The line shows a status dot (backlog, todo, in progress, in review, done) read live from the task list, and a calendar button. Once the line has a task, the button sets or clears the task's `due_date` (shown as "MMM d").
- Tasks are listed for a document by `GET /api/v1/tasks?document_id=`; tasks are also created via `POST /api/v1/documents/:id/tasks`.

- A "Tasks only" toggle in the document toolbar (`aria-pressed`) folds every top-level block except headings, task lists and embedded live task lists (see [embedded_task_lists.md](embedded_task_lists.md)) in place, via the `document-page--tasks_only` class (`DocumentScreen.scss`). It is a CSS fold, so checking lines, dates and collaboration work as normal; toggling back restores the prose. The setting is per page view and is not saved.

- **Make selection a task**: select text in a document (for example an acceptance criterion in a requirements doc) and press "Make selection a task" in the toolbar. The selection is replaced by a task line with that text (whitespace collapsed to one line); the normal sync then creates the Space task linked to the document (`document_id`). The button is disabled with nothing selected. Code: `selectionTaskTitle` and `taskListContent` in `data/document.ts`.
- Once a line has a task, it also shows status, assignee (Space members) and start date controls (`TaskFieldControls` in `WorkspaceTaskItemView.tsx`), saved through the normal task update call. Failed saves show the global error notice.

- **Two-way sync** (the task is the source of truth; the line is a live reference): a synced line shows a checkbox, checked when the task is done; ticking it sets the task to done (unticking sets it to to-do), and a status change elsewhere changes the tick. Editing the line's text renames the task (saved with the document's usual 1.5 s save); renaming the task elsewhere changes the line's text. If both changed since they last agreed, the task wins. Deleting a line asks "Delete the task too?" (keep or delete). Deleting a task shows the line as "This task was deleted" with "Make a new task" (clears the link so the next save creates a task) or "Remove line". Only one connected collaborator runs the reconciliation (the same leader as task creation). Logic: `reconcileTitle`, `removedLineTaskIds`, `statusForCheckbox` in `data/taskLine.ts`; wiring in `reconcileTaskLines` in `DocumentScreen.tsx` and `WorkspaceTaskItemView.tsx`.

## API and models
`tasks.document_id` (nullable, indexed); `Document has_many :tasks, dependent: :destroy`. Frontend: `syncTaskNodes` in `frontend/src/view/document/DocumentScreen.tsx`, `frontend/src/extensions/WorkspaceTaskItem.tsx`, `frontend/src/components/editors/WorkspaceTaskItemView.tsx`.

## Who can view and change
Anyone who can edit the document creates tasks; the due date uses the normal task update call. I did not check role-based limits.

## Tests
`frontend/src/data/document.test.ts` covers the selection-to-task helpers. None for the sync, the node view, the toolbar button or the `document_id` filter.
`frontend/src/data/taskLine.test.ts` (the reconcile rules; run with a stand-in runner: pass). None for `reconcileTaskLines`, the node view or the `document_id` filter.

## Known limits
- Two-way sync is by title and status only; the due date, start date and assignee already read and write the task directly. If two collaborators edit a line's text at once, the Yjs text merges first and the merged text is what is saved. Task lines inside other node types, and deletions by a collaborator who is not the sync leader, were not tried. A line removed while the document is still loading may prompt wrongly.
- If the document is not found in the loaded Space, `syncTaskNodes` falls back to the first document in the tree (`allDocs[0]`), which could attach tasks to the wrong document.

## History
- Implemented 2026-10-15 to 2026-10-18 (creation, status dot, due date). Committed locally; not pushed or deployed.
- Tasks only toggle added 2026-10-19. Not verified: no dependencies installed, so lint, type-check and the browser were not run; no automated test (a CSS-only fold). Not pushed through CI.
- Not implemented: two-way sync, assignee/status/start date from the line.
- Not verified: lint, type-check, tests and the editor were not run (no dependencies installed, no network).
- Make-selection-a-task added 2026-10-19 on branch `backlog/create-tasks-from-a-feature-doc`, not merged. Limits: it needs a selection (no caret-only conversion of a whole bullet), and the replaced text is not kept as prose. Not verified: lint, type-check, tests and the editor were not run (no node_modules).

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Two-way sync added 2026-10-19 on branch `backlog/task-line-two-way-sync`, stacked on `backlog/task-line-set-assignee-status-start-date`. Not merged. Not verified: lint, type-check, component tests and the editor (typing in a line while the task refreshes, the delete prompt, collaboration) were not run (no node_modules).

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
