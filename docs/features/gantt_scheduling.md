# Gantt scheduling

## What it does
The Gantt tab of a folder (`/folders/:id?view=gantt`) draws the folder's epics and dated tasks as bars on a month axis (the shared `components/Timeline.tsx`).

- **Grouping**: each epic is followed by its dated tasks, indented one level. Tasks with no epic, or whose epic has no dates, are listed after (`groupGanttRows`, `data/schedule.ts`).
- **Milestones**: milestones in this folder with a target date appear as diamonds on a row above the bars, if inside the chart's month range.
- **Today line**: a red line when today is inside the range.
- **Drag to reschedule**: drag a bar to move it, or its left or right edge to resize. Dates snap to whole days and are saved on release (`shiftedRange`). Task bars save `start_date` and `due_date`; epic bars save `start_date` and `target_date`.
- **Dependencies**: arrows between task bars, a critical-path highlight, and an editor for links (see [task_dependencies.md](task_dependencies.md)).
- **Dependency mode**: a picker per folder. *Ignore* moves only the dragged task. *Block invalid dates* refuses a move that breaks a link touching that task and shows an error. *Shift dependent tasks* pushes tasks that wait on it later, keeping their length, only as far as needed (`planReschedule`).

- **Export**: the Gantt toolbar has "Export PNG" and "Print or save as PDF". PNG draws the same rows as the chart (month header, labels indented by depth, bars with the done part filled, critical bars outlined, today's line) onto an off-screen canvas at twice the size, in the page's current light or dark colours, and downloads it as `<folder name> gantt.png` (a browser failure shows an error under the toolbar). The PDF button opens the browser print dialog with only the chart visible (choose "Save as PDF"). Layout is `ganttExportLayout` in `data/ganttExport.ts`; painting and download in `util/ganttCanvas.ts`; print in `util/printGantt.ts`. No new libraries.

## API and models
- `folders.dependency_mode` (`none`/`strict`/`flexible`, default `none`), `Folder` enum `dependency_mode` (prefix `dependencies`), permitted in `FoldersController` and returned by `FolderBlueprint`.
- Rescheduling reuses `PATCH /api/v1/tasks/:id` and `PATCH /api/v1/epics/:id`. The mode is applied in the browser; the server does not enforce it.

## Who can view and change
Everything is scoped to the current Space. I did not check for role-based limits on these endpoints.

## Web entry points
Folder page, Gantt tab. The global Epics and Initiatives timeline pages and the roadmap use the same `Timeline` but are read-only and show no tasks or milestones.

## Tests
`data/schedule.test.ts` (grouping, `shiftedRange`), `data/dependency.test.ts` (`planReschedule`), `backend/test/models/folder_test.rb` (mode default and values).

## Known limits
- Flexible mode only pushes tasks later, never earlier, and only reacts to Gantt drags, not edits made elsewhere.
- Mouse and touch only; there is no keyboard way to reschedule.
- Arrows and the today line do not follow a bar while it is being dragged.
- Milestone and initiative levels are not shown above epics.

## History
- Implemented 2026-10-18: milestone diamonds, epic grouping, today line, drag to reschedule, dependency modes. Committed locally; not pushed or deployed.
- Not verified: none of the tests were run, lint and type-check were not run, and the drag interaction and migration were not tried in a browser or database (no dependencies installed, no network).
- Gantt export added 2026-10-19 on branch `backlog/export-gantt-to-png-pdf`, not merged. The layout and painting tests pass in a stand-in runner; the real canvas, download and print dialog were never run (no browser). Limits: dependency arrows and milestones are not drawn on the image, rows are cut to 34 characters, and the PDF is whatever the browser prints (page breaks on a long chart are not controlled).
