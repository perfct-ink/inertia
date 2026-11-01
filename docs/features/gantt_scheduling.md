# Gantt scheduling

## What it does
The Gantt tab of a folder (`/folders/:id?view=gantt`) draws the folder's epics and dated tasks as bars on a month axis (the shared `components/Timeline.tsx`).

- **Grouping**: milestone, then initiative, then epic, then task, each level indented one step (`groupGanttRows`, `data/schedule.ts`). An epic nests under its initiative, else under its own milestone; an initiative under its milestone; a task under its epic, else under its own `milestone_id`. Milestones come first by target date (`compareByTargetDate`, shared with the roadmap lanes), then whatever has no milestone: initiatives, epics with no initiative, tasks with no epic. A parent that is not in the lists passed in, or an epic with no dates (which is not drawn), is treated as absent, so its children stay at the level above instead of nesting under a missing row. Tasks with no due date are skipped.
- **Group rows**: a milestone or initiative row is bold, drawn in a neutral bar (yellow or red when its health is at risk or off track), shows the milestone's or initiative's server rollup as its `done/total` count, and cannot be dragged. An initiative with both a start and target date keeps them; otherwise its bar spans the rows under it. A milestone has only a target date, so its bar spans the rows under it and reaches its target date. A group with nothing under it, or nothing to draw, gets no row (the Initiatives page is the exception, below). On a folder's Gantt only milestones and initiatives that have an epic or task in that folder appear, and their `done/total` counts cover the whole Space, not just the folder.
- **Milestones**: milestones in this folder with a target date appear as diamonds on a row above the bars, if inside the chart's month range (`milestoneMarkers`).
- **Today line**: a red line when today is inside the range.
- **Drag to reschedule**: drag a bar to move it, or its left or right edge to resize. Dates snap to whole days and are saved on release (`shiftedRange`). Task bars save `start_date` and `due_date`; epic bars save `start_date` and `target_date`.
- **Dependencies**: arrows between task bars, a critical-path highlight, and an editor for links (see [task_dependencies.md](task_dependencies.md)).
- **Dependency mode**: a picker per folder. *Ignore* moves only the dragged task. *Block invalid dates* refuses a move that breaks a link touching that task and shows an error. *Shift dependent tasks* pushes tasks that wait on it later, keeping their length, only as far as needed (`planReschedule`).

## API and models
- `folders.dependency_mode` (`none`/`strict`/`flexible`, default `none`), `Folder` enum `dependency_mode` (prefix `dependencies`), permitted in `FoldersController` and returned by `FolderBlueprint`.
- Rescheduling reuses `PATCH /api/v1/tasks/:id` and `PATCH /api/v1/epics/:id`. The mode is applied in the browser; the server does not enforce it.

## Who can view and change
Everything is scoped to the current Space. I did not check for role-based limits on these endpoints.

## Web entry points
- Folder page, Gantt tab: milestone > initiative > epic > task, draggable epic and task bars.
- Epics page and Initiatives page, Timeline tab (`components/PlanningTimeline.tsx`): the same four levels for the whole Space, read-only, with a diamond for every dated milestone in range. It loads epics, initiatives, milestones and tasks itself, so the List tab doesn't fetch every task. Only tasks under a listed epic are drawn (tasks with no epic belong to the folder Gantt and would bury the epics). The Epics page passes its initiative-filtered epics, so the filter also narrows the initiatives, milestones and tasks shown. The Initiatives page also keeps initiatives that have no epic yet; one without dates is named under the chart as not shown.
- The roadmap uses the same `Timeline` but keeps its own lanes (`roadmapLanes`) and is read-only.

## Tests
`data/schedule.test.ts` (grouping, group date spans, empty and unlisted parents, `planningGanttRows`, `milestoneMarkers`, `shiftedRange`), `data/milestone.test.ts` (`compareByTargetDate`), `data/dependency.test.ts` (`planReschedule`), `backend/test/models/folder_test.rb` (mode default and values), `view/folder_detail/GanttPane.test.tsx` (grouped rows, group bars not draggable), `components/PlanningTimeline.test.tsx` (global timeline rows, diamonds, read-only).

## Known limits
- Flexible mode only pushes tasks later, never earlier, and only reacts to Gantt drags, not edits made elsewhere.
- Mouse and touch only; there is no keyboard way to reschedule.
- Arrows and the today line do not follow a bar while it is being dragged.
- Milestone and initiative bars cannot be dragged; their dates are edited on the Milestones and Initiatives pages. A milestone bar is a roll-up, so it can run past the milestone's own target date when work under it does.
- A task whose epic has no dates sits under its own milestone (or at the top), not under that epic's initiative.
- The Epics and Initiatives timelines load every task in the Space and draw no dependency arrows.

## History
- Implemented 2026-10-18: milestone diamonds, epic grouping, today line, drag to reschedule, dependency modes. Committed locally; not pushed or deployed.
- Not verified: none of the tests were run, lint and type-check were not run, and the drag interaction and migration were not tried in a browser or database (no dependencies installed, no network).
- Implemented 2026-11-01 (not deployed; on branch `backlog/gantt-initiative-and-milestone-grouping`): milestone and initiative group rows above epics, and tasks and milestone diamonds on the Epics and Initiatives timelines. Ran only the pure data tests (`data/schedule.test.ts`, `data/milestone.test.ts`, `data/roadmap.test.ts`) with an offline shim and a static parse of the changed files. Not run: `npm run lint`, the type-check, the React tests (`GanttPane.test.tsx`, `PlanningTimeline.test.tsx`), or a look at the folder Gantt and the Epics and Initiatives Timeline tabs in a browser at 375px and desktop, in light and dark mode.
- Not implemented: dragging milestone or initiative bars, dependency arrows on the Space-wide timelines, and showing loose (epic-less) tasks there.
