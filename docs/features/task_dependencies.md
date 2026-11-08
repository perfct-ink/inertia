# Task dependencies and critical path

## What it does
On a folder's Gantt tab (`/folders/:id?view=gantt`) tasks can be linked so one waits on another.

- **Link types**: finish to start (default), start to start, finish to finish, start to finish. A link runs from a side of the predecessor's bar to a side of the successor's bar (`linkSides` in `data/dependency.ts`).
- **Arrows**: the shared `components/Timeline.tsx` draws one arrow per link as SVG (`links` prop). Only links with both tasks in the folder are drawn.
- **Drag to link**: hovering a task bar shows a dot beyond each side (`timeline-bar-link`). Dragging from one dot onto a dot of another task bar draws a dashed provisional line and, on release, creates the link with the kind given by the two sides (`kindFromSides`: end to start is finish to start, and so on; the drag's origin is the predecessor). Dropping on empty space, the same task or an existing pair does nothing; a loop or other server rejection shows the API error notice. Esc cancels. Epic rows have no handles. The editor below stays as the keyboard way to make links.
- **Dependencies editor**: under the chart (`DependencyEditor` in `view/folder_detail/DependencyEditor.tsx`). Lists each link ("A waits on B, Finish to start") with a remove button, and a form with two task pickers, a link-type picker and Add. The editor is hidden when the folder has no tasks and no links to other projects. Server errors (loop, duplicate) show under the form.
- **Critical path**: a "Highlight critical path" checkbox (on by default). `drivingPath` starts at the dated task with the latest due date and steps back to whichever predecessor's linked date (its due date, or start date for `start_to_*` links) is latest, until a task has no dated predecessor. Those bars get the `timeline-bar--critical` class (red outline). It uses dates as entered and re-schedules nothing; fewer than two tasks on the path shows nothing. There is no slack or float.
- **Links to other projects**: a task can wait on, or be waited on by, a task in another project (or folder). Under the chart's own links, an "Other projects" heading lists every link with exactly one end on this chart (`splitDependencies`, `data/dependency.ts`): "Build waits on Vendor contract (Billing) · Finish to start · Vendor contract due Nov 12", with a remove button. When the two tasks' dates no longer satisfy the link the line adds "Dates break this link by N days" in red (`externalEnd`; the task on the chart is read from the chart, so a drag shows at once, the other end is as the server sent it, and a task without a due date is never flagged). To add one, type in "Find a task in another project" (two or more letters, searched across the whole Space even with a project open); the matches join both task pickers, named with their project, and stay picked if the search is cleared. One end of a new link must be a task on this chart, otherwise Add stays off and a note says so. Links are not drawn on the chart and the other end's dates do not enter the critical path (it has no row to draw), but the server does honour them (below).
- **Dependency mode** (ignore / block / shift) is documented in [gantt_scheduling.md](gantt_scheduling.md); it reads these links, in the browser on Gantt drags and on the server when a task's dates are saved.

## API and models
- `task_dependencies` table: `workspace_id`, `predecessor_id`, `successor_id`, `kind` (integer enum), unique index on the pair.
- `TaskDependency` validates: kind is one of the four, both tasks exist in the same workspace, no self link, no duplicate pair, no loop (breadth-first walk forward from the successor). `workspace_id` defaults from the predecessor.
- `Task` destroys its links in both directions (`successor_links`, `predecessor_links`).
- `Scheduling::TaskUpdate` (used by `PATCH /api/v1/tasks/:id`) reads a task's links when its dates change and, per its folder's mode, refuses the change or moves the tasks that wait on it; see [gantt_scheduling.md](gantt_scheduling.md).
- `GET /api/v1/task_dependencies` (all of the Space's links, not filtered by folder or by the open project) returns each link with both ends as `predecessor` and `successor` (`TaskLinkBlueprint`: `id`, `title`, `status`, `start_date`, `due_date` and `folder_id`, which is the task's own folder or else its document's), so a link to another project can be named, dated and placed without loading that project's tasks. `POST` (`task_dependency[predecessor_id, successor_id, kind]`; unknown task ids in the Space give 404, validation errors give 422 with `errors`), `DELETE /:id`. There is no update; changing a link type means removing and re-adding.
- `GET /api/v1/tasks?all_projects=true` lists the whole Space even when `X-Project-Id` names a project (`TasksController#all_projects?`), which is how the editor's search reaches other projects; `useTaskSearch` in `api/tasks.ts` sends it with `q`. Changing a task refreshes the cached links, because they carry the tasks' dates.
- Frontend hooks: `api/taskDependencies.ts`, `useTaskSearch` in `api/tasks.ts`; the search is debounced by `hooks/useDebouncedValue.ts`.

## Who can view and change
Scoped to the current Space through `WorkspaceScoped`. I did not check for role-based limits.

## Web entry points
Folder page, Gantt tab.

## Tests
- `backend/test/models/task_dependency_test.rb` (default kind, self/duplicate/unknown kind/other-space rejection, loops, links removed with a task)
- `backend/test/controllers/task_dependencies_controller_test.rb` (create/list/delete, other-space task not found)
- `frontend/src/data/dependency.test.ts` (`linkSides`, `drivingPath`)
- `frontend/src/view/folder_detail/GanttPane.test.tsx` (arrows, driving path, editing links, the "Other projects" list)
- `frontend/src/view/folder_detail/DependencyEditor.test.tsx` (links to other projects with their project and the broken-dates note, searching and linking a task from another project, one end must be on the chart)
- `frontend/src/data/dependency.test.ts` (`splitDependencies`, `externalEnd`, `linkCandidates`), `frontend/src/hooks/useDebouncedValue.test.ts`
- `backend/test/controllers/task_dependencies_controller_test.rb` (both ends in the response, a link between two projects is listed whichever project is open), `backend/test/controllers/project_scoping_test.rb` (`all_projects`)
- `backend/test/services/scheduling/dependency_planner_test.rb`, `backend/test/controllers/tasks_controller_test.rb` (how the links move dates under each mode)
- `frontend/src/data/dependency.test.ts` (`linkSides`, `kindFromSides`, `drivingPath`)
- `frontend/src/view/folder_detail/GanttPane.test.tsx` (arrows, driving path, editing links, drag to link)

## Known limits
- Drag-to-link is pointer only; keyboard users use the editor's pickers. The handles are invisible until a bar is hovered, so touch screens cannot use them.
- The critical path is "what drives the latest finish today", not a scheduled critical path: no slack, no float, and it only follows the task with the latest due date.
- Links to other projects are listed and made in the editor but not drawn on the chart, and the critical path ignores them (the other end is not a row on the chart). Links where neither end is on the chart do not show there; open the chart of either end. The "Other projects" wording also covers a task in another folder of the same project (its project name is shown).
- The Dependency mode of the task that is moved decides what its links across projects do, on the server: *Block* refuses a move that would break a link to another project, and *Shift* moves the tasks that wait on it in other projects too (the response lists them as `rescheduled`; the chart does not say so). The browser's own check (`planReschedule`) only knows this chart's tasks.
- The broken-dates note on a link to another project uses the other task's dates as of the last time the links loaded; it refreshes when any task is changed from this app, not when someone else changes it.
- No view of cross-project links across the Space (the Portfolio does not show them): `docs/backlog/draw-cross-project-links-on-the-gantt.md`.
- Creating, changing or removing a link never moves any dates, whatever the mode.

## History
- Implemented 2026-10-17 (links, arrows, editor, critical path). Committed locally; not pushed or deployed.
- Not implemented: drawing a link by dragging.
- 2026-11-01 (branch `backlog/dependency-modes-server-enforcement`, not deployed): links are now also read on the server when a task's dates are saved; see the History in [gantt_scheduling.md](gantt_scheduling.md).
- Drag to link added 2026-10-19 on branch `backlog/gantt-drag-to-link-dependencies`, not merged; lint, type-check, frontend tests and the browser did not run (no node_modules), so the drag was never tried in a real browser.
- Not verified: no tests, lint, type-check, migration or browser run (no dependencies installed, no network). Behaviour above is from reading the code.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.

- Cross-project links (listing, searching other projects, the broken-dates note) added 2026-11-07 on branch `backlog/cross-project-dependencies`, reworked onto current main: not merged, not deployed. No migration. Ran the offline static checks, the pure data tests and the stand-in Jest runs for the Gantt and editor tests, and `ruby -c`. Not run: `rails test`, ESLint, `tsc -b`, the real Jest, or the editor in a browser (375px and desktop, light and dark).
