# Agile reports

## What it does
`/reports` (Reports, under Planning on the icon rail) draws four reports from the Space's sprints, tasks and task status history, or from the open project's when one is open. The choices are in the address (`?report=velocity&measure=tasks&sprint=3&range=90`), so a report can be linked to; anything unrecognised falls back to the default.
- **Burndown** (the default): for one sprint, the work left at the end of each day from its start to its end, against an ideal line, with the scope line that shows work added along the way. The sprint is the running one, else the latest that has begun; a selector picks another. Days still to come are left off the lines. A sprint without a start and end date can't be drawn and says so.
- **Velocity**: what each of the last eight started sprints got done (what is left in a finished sprint is what was delivered, because unfinished tasks leave it when it closes), with the average of the last three finished sprints as a dashed line. The running sprint's bar is lighter and left out of the average.
- **Cumulative flow**: how much work sat in each status at the end of each day, stacked with finished work at the bottom, for the last 14, 30 or 90 days of all work, or over one sprint's dates. The bands and the legend use the board's status names and colours.
- **Planned vs. unplanned**: for each of the last eight started sprints, work that was there when the sprint began against work added after, with the added share as a percentage.
- **Count** switches every report between story points and tasks. A report counting points says how many tasks have no points (they count as 0). Finished work counts its actual story points when they are known.
- Each chart has a caption saying what it shows and a "Show the numbers" table of the same data, so it can be read without the drawing. The drawing is plain SVG that scales to the width of the screen, takes its colours from the theme and has a tooltip (`<title>`) on each point and bar.

## API and models
- `GET /api/v1/task_status_changes`: every status change of the Space's tasks (`task_id`, `from_status`, `to_status`, `created_at`, oldest first; no `changed_by_name`), narrowed to the open project by `X-Project-Id` or to one sprint by `?sprint_id=`. Any member of the Space. Another Space's sprint gives an empty list, another Space's project is a 404. A task's own history with who made each change is still `GET /api/v1/tasks/:id/status_changes`. `Task.in_folders` is the scope behind the project filter, shared with `GET /api/v1/tasks`.
- All the maths is in `frontend/src/data/report.ts` (`burndown`, `velocity`, `plannedVsUnplanned`, `cumulativeFlow`, `statusAt`, `readReportParams`) and the chart geometry in `frontend/src/util/chart.ts`, both pure and tested. A day's status is the status at the end of that day, in the viewer's time zone; a task older than the history is taken to have been in the status its first recorded change left.
- Frontend: `view/reports/ReportsScreen.tsx` (the page), `view/reports/ReportCharts.tsx` (the four charts and the numbers table), `api/taskStatusEvents.ts`. The page is listed in `components/file-manager/projectSections.ts`, so the icon rail shows it.

## Who can view and change
Any member of the Space can open the reports. They are read-only.

## Web entry points
`/reports`; the icon rail (Planning group, "Reports").

## Tests
`backend/test/controllers/task_status_changes_controller_test.rb`, `frontend/src/data/report.test.ts`, `frontend/src/util/chart.test.ts`, `frontend/src/view/reports/ReportsScreen.test.tsx`.

## Known limits
- A sprint's tasks are the ones in it now. A task's sprint isn't kept as history, so a task moved into a sprint late shows from its creation, and a task moved out disappears from the sprint's past. Planned vs. unplanned counts a task made after the sprint began as added, and a task made earlier and moved in later as planned, for the same reason.
- Tasks created before status history existed have no recorded changes until their status next changes; before that they are shown in their current status for their whole life.
- All tasks and all changes are fetched and worked out in the browser, with no paging.
- No chart is interactive beyond tooltips (no zoom or click-through to tasks), and the flow chart ignores a project's own board status names (it uses the Space's).
- The charts were not looked at in a browser, so axis labels and colours at 375px and in dark mode are untested.

## History
- Implemented 2026-11-05 (not deployed; on branch `backlog/agile-reports`).
- Not implemented: report export, saving a report to a dashboard, forecast lines.
- Not verified: `rails test` (the new endpoint tests have only had `ruby -c`), `npm run lint`, `tsc -b`, the real Jest suite and a browser (desktop, 375px, light and dark). What ran: the static checker, the pure `report` and `chart` tests, and the Reports page, rail and project navigation tests in a Jest stand-in.
