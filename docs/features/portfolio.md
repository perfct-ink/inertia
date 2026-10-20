# Portfolio

## What it does
`/portfolio` (sidebar rail "Portfolio") lists every active project in the Space in one table: project (a link to its folder overview), owner, status, dates, progress (done/total tasks with a bar) and health. Click a column header to sort (again to reverse; projects with no owner or date sort last). "Edit project details" goes to the Projects page, where owner, status, dates and description are set. Archived projects and plain folders are left out.

## API and models
`GET /api/v1/portfolio` (`PortfolioController`) returns one row per project with `owner_name`, `project_status`, dates, `tasks_count`, `done_tasks_count`, `percent` and `health`. Progress counts the tasks in the project's folder, its subfolders and their documents (`Folder#scheduled_tasks`). Health uses the shared `PlanningHealth` rule (a finished project or one with no target date is on track; a passed target date is off track; a target within 14 days with under 75% done is at risk). Frontend: `api/portfolio.ts`, `sortPortfolio` in `data/project.ts`, `view/portfolio/PortfolioScreen.tsx`. Stacked on `backlog/project-details-owner-status-dates-and-a-description` (it needs those fields).

## Who can view and change
Anyone in the Space can view; nothing here changes data.

## Tests
`backend/test/controllers/portfolio_controller_test.rb`, `frontend/src/data/project.test.ts` (run with a stand-in runner: pass), `frontend/src/view/portfolio/PortfolioScreen.test.tsx`.

## Known limits
- Counts only tasks (not documents or milestones), and one level of "project": a project nested inside another project is listed and counted separately, and its tasks also count toward the parent.
- No filters, grouping or saved views, and no inline editing here.
- One query pair per project (fine for tens of projects).

## History
- Implemented 2026-10-19 on branch `backlog/portfolio-view`. Not merged or deployed.
- Not verified: migration (none needed beyond the project-details one), Rails tests, lint, type-check, the component test and the browser did not run (no database, no node_modules).
