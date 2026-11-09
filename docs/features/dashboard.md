# Dashboard

## What it does
`/dashboard` (icon rail "Dashboard", first among a project's pages) summarizes the Space, the project open in it, or one folder and everything nested under it, on one page. Like every page it follows the open project (`X-Project-Id`, see `projects.md`): with none open it covers the whole Space; with one open it covers that project and its subfolders.

A folder picker in the header sets the scope further. With no project open it offers "All folders" and every active folder, shown as a path such as "Messages / Design"; with a project open it offers "All of <project>" and the folders inside it (a folder outside the project is ignored). The choice lives in the URL as `?folder=<id>`, so a scoped dashboard can be linked. A folder that no longer exists, is archived or sits outside the open project falls back to the whole Space or project. When something narrower than the Space is covered, its name follows the title and the browser tab ("Dashboard: Messages").

- **Summary tiles**: Files, Open tasks (with how many are due in the next week), Overdue (red when above zero) and Done (percent and "N of M tasks").
- **Folders**: one card per top-level folder (the Root's children) when the whole Space is shown, or per subfolder when scoped. Each shows its file count (subfolders included), the overdue count, and a progress bar with done/total tasks (hidden when it has no tasks). A project shows its icon and status (Planned, Active, On hold, Done). The name drills into that folder's dashboard; "Open" goes to the folder page. Archived folders are left out, and the section is hidden when there are no folders to list.
- **Boards**: a card only appears when it has something to show.
  - Task board: To Do, In Progress, In Review, Done and a Backlog row when something is in the backlog, named and colored by the scope folder's configured statuses (`configurable_statuses.md`). "Open board" opens the Workboard, narrowed to the folder when scoped.
  - Roadmap board: Now / Next / Later card counts of the initiatives and epics filed in the scope ("Open roadmap"). An epic whose initiative is outside the scope counts as its own card.
  - Sprint board: sprints filed in the scope by Planned / Active / Done, and the active sprint with its tasks done and percent. "Open sprint" opens that sprint on the Workboard; with none active the link is "Open sprints".
  - Milestones: on track / at risk / off track among unfinished ones, plus the next dated milestone with its health badge.
- **Coming up**: the five open tasks with the soonest due dates (overdue first, overdue dates in red) with the document each came from.
- Empty Space: the page says there is nothing to summarize yet.
- A failed load shows the error inline (and the API client's error notice) instead of zeros.

## API and models
No endpoint or model of its own and no migration. The screen reads the existing `GET /api/v1/workspace` (folder tree), `/api/v1/tasks`, `/milestones`, `/initiatives`, `/epics`, `/sprints` and `/task_status_settings` and computes everything in the browser:
- `data/dashboard.ts`: `buildDashboard` (scope, folder rows, rollups), `resolveScope`, `scopeChoices`, `findFolder`, `subtreeIds`, `taskBoardPath`, `dashboardPath`.
- Reused rollups: `taskSummary`, `upcomingTasks`, `taskFolderId` (`data/task.ts`; a task belongs to its own folder, else its document's), `healthCounts`, `nextMilestone` (`data/milestone.ts`), `horizonCounts` (`data/roadmap.ts`, built on `boardColumns`), `activeSprint`, `sprintBoardPath` (`data/sprint.ts`), `donePercent` (`data/schedule.ts`), `spaceFiles`, `documentsIn`, `folderChoices` (`data/folder.ts`), `projectStatusLabel` (`data/project.ts`), `useBoardStatuses`.
- `Initiative` and `Sprint` in `types/index.ts` gained the optional `folder_id` that the API already returned.

## Who can view and change
Anyone who can open the Space, including a read-only member. It is read-only: nothing on the page changes data, and it uses only `GET` calls. It adds no access of its own: every number is computed from the lists the API already returns to the signed-in person for their Space (and the open project), so it shows nothing they could not already open.

## Web entry points
`/dashboard` (`frontend/src/view/dashboard/DashboardScreen.tsx`), reachable from the icon rail (`file-manager/projectSections.ts`), with `?folder=<id>` to scope it. Links out to `/folders/:id`, `/tasks?view=kanban[&folder_id=|&sprint_id=]`, `/roadmap?view=board`, `/sprints`, `/milestones` and `/documents/:id`.

## Tests
`frontend/src/data/dashboard.test.ts` (scope resolution with and without an open project, choices, Space and folder rollups, roadmap and sprint scoping), plus the cases in `data/task.test.ts` (`taskSummary`, `upcomingTasks`), `data/milestone.test.ts` and `data/roadmap.test.ts`; `frontend/src/view/dashboard/DashboardScreen.test.tsx` (whole-Space numbers and links, project status, the folder picker, a scoped dashboard, an open project, cards that hide when empty, the load error, the empty state); `components/file-manager/SidebarRail.test.tsx` lists the rail links, Dashboard included.

## Known limits
- Tasks and milestones are filed by folder; initiatives, epics and sprints have an optional folder too, and ones with none appear only in the whole-Space totals (and not at all inside an open project, since the API narrows those lists).
- It counts what the list endpoints return, in the browser (every task of the Space is loaded); a very large Space would want a server-side summary.
- A task counts under one folder only (its own, else its document's); tasks with neither appear only in the whole-Space totals.
- "Today" and "this week" use the browser's date. Counts do not update live.
- The widget types in `docs/backlog/dashboard-widgets.md` (charts, battery, Gantt, workload, calendar, table, countdown) and user-arranged or saved dashboards are not built; there is one fixed layout. Scope is a single folder, not a hand-picked set of folders.
- Per-project health (as on the Portfolio) is not shown on the folder cards; the portfolio endpoint computes it on the server.

## History
- Implemented 2026-11-01 (on branch `backlog/dashboards-across-folders-boards`; not deployed).
- Reworked 2026-11-09 onto the current main: follows the open project, initiatives, epics and sprints are scoped by their folder (so the Roadmap board shows in a folder dashboard too), a Sprint board card, project icon and status on folder cards, the rail link moved from the old sidebar to `projectSections.ts`.
- Not implemented: arranging or saving dashboards, widget types, multi-folder selection.
- Not verified: lint, `tsc`, the full Jest suite and the browser (375px and desktop, light and dark) did not run (no node_modules). The data tests ran with the offline shim and the component tests with the offline Jest stand-in.
