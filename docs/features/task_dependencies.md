# Task dependencies and critical path

## What it does
On a folder's Gantt tab (`/folders/:id?view=gantt`) tasks can be linked so one waits on another.

- **Link types**: finish to start (default), start to start, finish to finish, start to finish. A link runs from a side of the predecessor's bar to a side of the successor's bar (`linkSides` in `data/dependency.ts`).
- **Arrows**: the shared `components/Timeline.tsx` draws one arrow per link as SVG (`links` prop). Only links with both tasks in the folder are drawn.
- **Dependencies editor**: under the chart (`DependencyEditor` in `view/folder_detail/GanttPane.tsx`). Lists each link ("A waits on B, Finish to start") with a remove button, and a form with two task pickers, a link-type picker and Add. The form is hidden when the folder has fewer than two tasks. Server errors (loop, duplicate) show under the form.
- **Critical path**: a "Highlight critical path" checkbox (on by default). `drivingPath` starts at the dated task with the latest due date and steps back to whichever predecessor's linked date (its due date, or start date for `start_to_*` links) is latest, until a task has no dated predecessor. Those bars get the `timeline-bar--critical` class (red outline). It uses dates as entered and re-schedules nothing; fewer than two tasks on the path shows nothing. There is no slack or float.
- **Dependency mode** (ignore / block / shift) is documented in [gantt_scheduling.md](gantt_scheduling.md); it reads these links.

## API and models
- `task_dependencies` table: `workspace_id`, `predecessor_id`, `successor_id`, `kind` (integer enum), unique index on the pair.
- `TaskDependency` validates: kind is one of the four, both tasks exist in the same workspace, no self link, no duplicate pair, no loop (breadth-first walk forward from the successor). `workspace_id` defaults from the predecessor.
- `Task` destroys its links in both directions (`successor_links`, `predecessor_links`).
- `GET /api/v1/task_dependencies` (all of the Space's links, not filtered by folder), `POST` (`task_dependency[predecessor_id, successor_id, kind]`; unknown task ids in the Space give 404, validation errors give 422 with `errors`), `DELETE /:id`. There is no update; changing a link type means removing and re-adding.
- Frontend hooks: `api/taskDependencies.ts`.

## Who can view and change
Scoped to the current Space through `WorkspaceScoped`. I did not check for role-based limits.

## Web entry points
Folder page, Gantt tab.

## Tests
- `backend/test/models/task_dependency_test.rb` (default kind, self/duplicate/unknown kind/other-space rejection, loops, links removed with a task)
- `backend/test/controllers/task_dependencies_controller_test.rb` (create/list/delete, other-space task not found)
- `frontend/src/data/dependency.test.ts` (`linkSides`, `drivingPath`)
- `frontend/src/view/folder_detail/GanttPane.test.tsx` (arrows, driving path, editing links)

## Known limits
- Links can only be made with the editor's pickers. Dragging from one bar to another to draw a link is not built (see `docs/backlog/gantt-drag-to-link-dependencies.md`).
- The critical path is "what drives the latest finish today", not a scheduled critical path: no slack, no float, and it only follows the task with the latest due date.
- Links between tasks in different folders are stored but neither drawn nor listed in any folder's editor.
- Mode enforcement is browser-side only (see `docs/backlog/dependency-modes-server-enforcement.md`).

## History
- Implemented 2026-10-17 (links, arrows, editor, critical path). Committed locally; not pushed or deployed.
- Not implemented: drawing a link by dragging.
- Not verified: no tests, lint, type-check, migration or browser run (no dependencies installed, no network). Behaviour above is from reading the code.
