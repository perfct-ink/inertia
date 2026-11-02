# Dashboard

## What it does
`/dashboard` (sidebar rail "Dashboard") summarizes the current Space, or one folder and everything nested under it, on one page. A folder picker in the header ("All folders" or any active folder, shown as a path such as "Messages / Design") sets the scope; it lives in the URL as `?folder=<id>`, so a scoped dashboard can be linked. A folder that no longer exists falls back to all folders.

- **Summary tiles**: Files, Open tasks (with how many are due in the next week), Overdue (red when above zero) and Done (percent and "N of M tasks").
- **Folders**: one card per top-level folder (the Root's children) when the whole Space is shown, or per subfolder when scoped. Each shows its file count (subfolders included), the overdue count, and a progress bar with done/total tasks (hidden when it has no tasks). The name drills into that folder's dashboard; "Open" goes to the folder page. Archived folders are left out, and the section is hidden when there are no folders to list.
- **Boards**: the Task board (To Do, In Progress, In Review, Done and a Backlog row when something is in the backlog, named and colored by the scope folder's configured statuses; "Open board" opens the Workboard, narrowed to the folder when scoped), the Roadmap board (Now / Next / Later card counts, "Open roadmap"), and Milestones (on track / at risk / off track among unfinished ones, plus the next dated milestone with its health badge). A card only appears when it has something to show.
- **Coming up**: the five open tasks with the soonest due dates (overdue first, overdue dates in red) with the document each came from.
- Empty Space: the page says there is nothing to summarize yet.
- A failed load shows the error inline (and the API client's error notice) instead of zeros.

## API and models
No endpoint or model of its own and no migration. The screen reads the existing `GET /api/v1/workspace` (folder tree), `/api/v1/tasks`, `/milestones`, `/initiatives`, `/epics` and `/task_status_settings` and computes everything in the browser:
- `data/dashboard.ts`: `buildDashboard` (scope, folder rows, rollups), `scopeChoices`, `findFolder`, `subtreeIds`, `taskBoardPath`, `dashboardPath`.
- Reused rollups: `taskSummary`, `upcomingTasks`, `taskFolderId` (`data/task.ts`; a task belongs to its own folder, else its document's), `healthCounts`, `nextMilestone` (`data/milestone.ts`), `horizonCounts` (`data/roadmap.ts`, built on `boardColumns`), `spaceFiles`, `documentsIn`, `folderChoices` (`data/folder.ts`).

## Who can view and change
Any member of the Space who can see the data. It is read-only: nothing on the page changes data.

## Web entry points
`/dashboard` (`frontend/src/view/dashboard/DashboardScreen.tsx`), reachable from the sidebar rail, with `?folder=<id>` to scope it. Links out to `/folders/:id`, `/tasks?view=kanban[&folder_id=]`, `/roadmap?view=board`, `/milestones` and `/documents/:id`.

## Tests
`frontend/src/data/dashboard.test.ts`, plus the new cases in `data/task.test.ts` (`taskSummary`, `upcomingTasks`), `data/milestone.test.ts` and `data/roadmap.test.ts`; `frontend/src/view/dashboard/DashboardScreen.test.tsx` (whole-Space numbers and links, the folder picker, a scoped dashboard, the load error, the empty state).

## Known limits
- Milestones and tasks are filtered by folder; initiatives and sprints have no folder, so the Roadmap board shows only for "All folders" and there is no sprint card.
- It counts what the list endpoints return, in the browser (every task of the Space is loaded); a very large Space would want a server-side summary.
- A task counts under one folder only (its own, else its document's); tasks with neither appear only in the whole-Space totals.
- "Today" and "this week" use the browser's date. Counts do not update live.
- The widget types in `docs/backlog/dashboard-widgets.md` (charts, battery, Gantt, workload, calendar, table, countdown) and user-arranged dashboards are not built; there is one fixed layout. Folder and board scope is a single folder, not a hand-picked set of folders.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/dashboards-across-folders-boards`).
- Not implemented: arranging or saving dashboards, widget types, multi-folder selection, a sprint card.
- Not verified: lint, `tsc`, the full Jest suite and the browser (375px and desktop, light and dark) did not run (no node_modules). The data tests ran with the offline shim and the component test with the offline Jest stand-in.
