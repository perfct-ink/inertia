# Embedded task lists

## What it does
A document can hold a live **task list** or **Gantt** of the Space's tasks. The toolbar button "Embed live tasks" (clipboard icon, next to "Tasks only") inserts a block at the cursor. The block stores only what to show; the tasks are read from the Space each time it is drawn, so it is never a stale copy.
- **Heading and progress:** "Open tasks in this Space" (or "All tasks in Sprint 3", "Open tasks in Messages / Design", "In Progress tasks in Launch plan") and "3 of 8 done" with a progress bar. The progress counts every task in the scope, whatever the status filter hides.
- **List:** one row per task: a checkbox, the title, the status (name and colour follow the configurable statuses of the task's own folder) and the due date ("Nov 5"). Rows are in due-date order, tasks with no date last. Ticking the checkbox sets the task to `done`; unticking sets it back to `todo` (the same as the checkbox on a task line). Done tasks are struck through.
- **Gantt:** a bar per dated task (a task with a due date but no start date is a one-day bar on its due date), the links between the shown tasks, and the driving path outlined in red. It is read-only: bars cannot be dragged and links cannot be drawn here (use a folder's Gantt tab). A line under the chart counts tasks with no due date, which have nothing to draw.
- **Settings** (the sliders button, only while editing): Show as (List or Gantt), Tasks from (Whole Space, This document, One folder, One sprint), the folder or sprint to use, and Status (Open tasks, All statuses, or one status). Open tasks, meaning every status but done, is the default, with the whole Space as the default scope. Choosing a folder or sprint scope opens the settings and asks for the choice before anything is fetched. "This document" uses the document the embed sits in.
- **Remove** (the X button, only while editing) takes the block out of the document. The node can also be selected and deleted like any block.
- **Live:** the list refetches every 30 seconds while the page is visible, and straight away after any task change made in the app (task lines in the document, the Tasks page, ...), because those invalidate the same `tasks` queries.
- **States:** "Loading tasks…", "No tasks match this filter." / "No tasks yet.", and a failed load shows the error text with a "Try again" button (the API client also raises its usual error notice). A failed tick shows the API client's error notice.
- **Tasks only** (the toolbar toggle) keeps embeds visible, like task lists.
- Mobile and themes: the settings, rows and header wrap at 375px; the two icon buttons are 40px square; the Gantt scrolls sideways inside its own box; colours come from the theme tokens, so it follows dark mode.

## API and models
No new endpoints, models or migrations. The embed calls what the app already has:
- `GET /api/v1/tasks` with `document_id`, `folder_id` or `sprint_id` (the scope); the status filter is applied in the browser, so every embed with the same scope shares one cached list. `folder_id` means tasks in that folder itself, directly or through its documents, not those in its subfolders.
- `PATCH /api/v1/tasks/:id` (`status`) from the checkbox; `GET /api/v1/task_dependencies` for the Gantt (only while it is shown); `GET /api/v1/sprints` (only for a sprint scope); `GET /api/v1/workspace` (folder and document names).
- Document node `taskEmbed` (`frontend/src/extensions/TaskEmbed.ts`): a block atom with attributes `view` (`list` | `gantt`, default `list`), `scope` (`space` | `document` | `folder` | `sprint`, default `space`), `scopeId` (document, folder or sprint id; null for the Space) and `status` (`open` | `all` | a task status, default `open`). The static HTML is `<div data-type="taskEmbed" data-view data-scope data-scope-id data-status>Live task list</div>`; unknown values read back as the defaults.
- The node is mirrored in `collab-server/src/schema.ts` (without it a shared document containing an embed can't be saved). The collab server must be deployed together with this frontend change; an older collab server would reject documents that contain the node.
- `frontend/src/api/base.ts` `useResourceList` takes two new options, `enabled` and `refetchInterval`, and `useTasks(filters, options)` passes them through.
- Frontend: `data/taskEmbed.ts` (defaults, normalizing, scope filters, headings, status filter, sorting, progress, folder/document names), `components/editors/TaskEmbedPanel.tsx` (+ `.scss`, the list, Gantt and settings), `components/editors/TaskEmbedView.tsx` (the node view), `extensions/TaskEmbed.ts` (the node) and the toolbar button in `view/document/DocumentScreen.tsx`. Shared helpers added for it: `dependenciesAmong` (`data/dependency.ts`), `ganttLinks` and a `critical` option on `flatTaskRows` (`data/schedule.ts`); the folder Gantt (`GanttPane.tsx`) now uses the first two instead of its own copies.

## Who can view and change
Anyone who can open the document sees the embed and the tasks the tasks endpoint returns for the active Space. Anyone who can edit the document inserts, configures and removes embeds; those settings are part of the shared document, so collaborators see changes live. Ticking a task uses the normal task update call: members and above can; for a viewer the API refuses and the error notice shows (the screen does not check the role first, the same as task lines). A read-only editor (`isEditable` false) shows the list without the settings, Remove or enabled checkboxes.

## Web entry points
The document page (`frontend/src/view/document/DocumentScreen.tsx`): the toolbar button "Embed live tasks".

## Tests
- `frontend/src/data/taskEmbed.test.ts` (11 tests, run with the stand-in runner: pass): defaults, normalizing unknown values and ids, the HTML attribute round trip, scope filters, headings, status filter, due-date sorting, progress, undated count, folder and document names.
- `frontend/src/components/editors/TaskEmbedPanel.test.tsx` (13 tests, run with the stand-in Jest with the API hooks mocked: pass): list rows, filters sent to the API, headings, ticking and unticking, empty, error with retry, loading, Gantt links, driving path and undated note, the settings, nothing fetched until a folder or sprint is chosen, Remove, read-only.
- `frontend/src/extensions/TaskEmbed.test.ts` (schema, HTML round trip, unknown values), `frontend/src/api/base.test.tsx` (disabled list, refetch interval), `collab-server/test/schema.test.ts` (node list, attributes and defaults). Written but not run here (they need `@tiptap/*`, `@tanstack/react-query` or vitest, which are not installed).
- `frontend/src/data/dependency.test.ts` (`dependenciesAmong`) and `frontend/src/data/schedule.test.ts` (`ganttLinks`, `critical` on `flatTaskRows`): pass in the stand-in runner.

## Known limits
- Read-only Gantt: no dragging dates, no drawing links. Dates change on the task or in a folder's Gantt.
- The status filter options use the built-in status names; a folder that renames a status still shows its own name on the rows, but the filter menu says "To Do", "In Progress"...
- A folder scope means that folder only, not its subfolders. There is no scope for a project, epic, milestone, initiative or assignee, and no custom field filter or grouping.
- The scope is fixed to the Space's task list as the tasks endpoint returns it (one request for the whole Space with the default scope), the same cost as the task lines already pay.
- "This document" is stored as the document's id, so an embed copied into another document still lists the first document's tasks (its heading then names that document).
- Sorting is by due date only; there is no manual order, and a task ticked done leaves an "Open" list as soon as the list refetches.
- Embeds are not shown in the document outline, in exports or on a shared read-only page (`SharedScreen`); the static HTML is only a labelled placeholder.
- The unmerged branches `backlog/link-to-another-document` and `backlog/built-in-paragraph-styles` also add nodes to the same schema files; they touch the same lines of `schema.ts`, `schema.test.ts` and `DocumentScreen.tsx`, so expect a small textual merge.

## History
- Implemented 2026-11-02 (not deployed; on branch `backlog/embed-live-task-lists-in-documents`).
- Not implemented: dragging and linking on the embedded Gantt, a project/epic/milestone/assignee scope, grouping, custom field filters, saved embed presets.
- Not verified: ESLint, Stylelint, the TypeScript check, the Tiptap schema and extension tests, the `base.test.tsx` test, the collab-server vitest run, and the editor in a browser (insert, settings, live refresh, phone width, dark mode, collaboration with two browsers, a Safari check). Passed: the 11 data tests, the 13 panel component tests (stand-in Jest, API hooks mocked), the changed `schedule` and `dependency` tests, the static import/syntax check, and a sass compile of the stylesheet. The lucide icon names `ClipboardList`, `SlidersHorizontal` and `X` are ones other screens already import.
