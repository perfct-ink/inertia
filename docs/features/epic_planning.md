# Epic planning

## What it does
The plan page (`/plan?epic_id=<id>`) plans one epic at a time. Pick an epic in the header picker (or press **Plan** on an epic card on the Epics page) and see:

- **Rollup**: the epic's title, its initiative and milestone (when set), a progress bar with `done/total (percent)`, how many tasks have a date and the span they cover, how many unfinished tasks are overdue, and two warnings when the tasks start before the epic's start date or end after its target date. The epic's own start and target dates are editable here. With no tasks the progress and counts are hidden.
- **Tasks by status**: one section per status (Backlog, To Do, In Progress, In Review, Done) listing the epic's tasks. Every row has a status picker, start and due date inputs, and a Remove button that takes the task out of the epic.
- **Backlog pane**: tasks that are in no epic (top-level, not done; a subtask travels with its parent), unstarted backlog items first, with a search box (shown only when there is something to plan). Press **Add** on a row to put the task in the epic, keeping its status.
- **Drag and drop**: drag a row by its grip handle. Dropping a backlog task on a status section puts it in the epic with that status; dropping a task of the epic on another section changes its status; dropping an epic task on the backlog pane removes it from the epic. The picker, Add and Remove buttons do the same without dragging, so nothing depends on a pointer drag (the handle also takes a keyboard drag).
- Edits show at once and are confirmed by the server. If a save fails, the global API error appears and the row goes back to what the server holds. The epic, initiative and milestone rollups are refetched after each save.

## How it works
- Pure logic in `frontend/src/data/epic.ts`: `epicTasks`, `unplannedTasks`, `groupByStatus`, `planMove` (what a drop changes), `epicPlan` (the rollup), and `patchTasks`/`addPatch`/`settlePatch` for the pending-edit overlay.
- The page reads all tasks (`useTasks()`, the same query the Hierarchy page uses) and filters in the browser. There is no backend change.
- A task is placed with `PATCH /api/v1/tasks/:id` (`epic_id`, `status`, `start_date`, `due_date`); the epic's dates use `PATCH /api/v1/epics/:id`. Adding a task keeps its own `milestone_id`, unlike the Hierarchy drag, which clears it.
- Server rules still apply: due date not before start date, epic and task in the same Space (a rejection shows as the global API error).
- Frontend: `view/epic_plan/EpicPlanScreen.tsx` and `.scss` (root class `view-epic_plan`, shares the header and empty-state styles of `view/planning/PlanningScreen.scss`), route `/plan` in `App.tsx`, and the Plan button in `view/epics/EpicsScreen.tsx`.

## Features
A feature is an epic with a required requirements document ([feature_requirements_docs.md](feature_requirements_docs.md)), and every epic is a feature (a migration gave the existing ones their documents). This page plans features as it planned epics: it lists every feature, including one with no tasks yet, which is how you start putting tasks into it (the picker and the backlog pane). A feature that is only its document shows no progress or counts here until it has tasks, written in the document or added from the backlog pane. Tasks written in a feature's document are the feature's tasks and appear here.

## Mobile and dark mode
At 375px the page is one column: rollup, status sections, then the backlog. Rows wrap their controls under the title. On touch screens the handle and icon buttons are 40px square and date and status fields are at least 40px tall. Colors come from the theme tokens, so dark mode follows the app.

## Who can view and change
Scoped to the current Space (`WorkspaceScoped`): reads need membership, writes need the member role or above. The page does not hide its controls from viewers, so a viewer's change is rejected by the server and shows the API error.

## Tests
- `frontend/src/data/epic.test.ts` (grouping, backlog list and search, drop rules, pending edits, rollup, date warnings)
- `frontend/src/view/epic_plan/EpicPlanScreen.test.tsx` (empty states, rollup, sections, Add, Remove, status picker, dates, epic dates, search, optimistic move and revert on failure). The drag itself is not exercised in a test.

## Known limits
- No estimates: tasks have no effort or story-point field on `main`. See `docs/backlog/epic-plan-estimate-rollup.md` (waits on `task-priority-effort-and-story-points`).
- No sidebar entry; open the page from an epic's Plan button or by URL. The sidebar rail is shared with other branches.
- All tasks are fetched and filtered in the browser, with no paging.
- Rows are not ordered by drop position, and a task of another epic cannot be pulled in (move it from the Hierarchy page).
- The UI still says "epic" here. An epic is also a feature with a requirements document ([feature_requirements_docs.md](feature_requirements_docs.md)); only the Features page and the sidebar say "feature" so far.
- The page shows write controls to viewers.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/epic-and-feature-planning-view`).
- Not implemented: estimates, feature-specific planning, a sidebar entry.
- Not verified: no dependencies are installed here, so the frontend tests, type-check, lint (ESLint and Stylelint), the browser and dnd-kit drag behaviour were not run. What ran: the pure `data/epic.test.ts` tests with a small Jest shim, a TypeScript/SCSS parse check, and a Sass compile of the stylesheets.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
