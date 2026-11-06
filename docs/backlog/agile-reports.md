---
priority: p2
depends_on: [status-change-history]
branch: backlog/agile-reports
---
# Agile reports: burndown, velocity, cumulative flow, planned vs. unplanned

## Objective

Agile reports: burndown, velocity, cumulative flow, planned vs. unplanned

## Requirements / notes

Needs Sprints + status history.

## Context

Section "Dashboards and reporting" of the retired shared backlog.

## Acceptance criteria

- Agile reports: burndown, velocity, cumulative flow, planned vs. unplanned works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built on `backlog/agile-reports`, not merged because Rails, lint, the type-check and a browser could not run on the machine that finished it.

Done: `GET /api/v1/task_status_changes` (every task's status changes, narrowed by project or sprint), the report maths and chart geometry (pure, tested), the Reports page at `/reports` with burndown, velocity, cumulative flow and planned vs. unplanned in story points or tasks, an accessible numbers table behind each chart, an entry on the icon rail, and `docs/features/agile_reports.md`.

Ran: the static checker; `report.test.ts` and `chart.test.ts` (pure); `ReportsScreen.test.tsx`, `SidebarRail.test.tsx` and `ProjectNav.test.tsx` in a Jest stand-in (all passed). The new controller tests have only had `ruby -c`.

Not run, to do before merging:

```sh
cd backend && rails test test/controllers/task_status_changes_controller_test.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then open /reports at 375px and desktop, light and dark, with a running sprint that has dates and a finished one: read the axis labels, compare the burndown numbers table with the board, and check the flow chart's colours against the status dots.

Decisions for Alex: a sprint's tasks are the ones in it now (the sprint of a task isn't kept as history), and a task made after a sprint began counts as unplanned. Both follow from what is stored; recording sprint changes would make them exact.
