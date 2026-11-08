---
priority: p1
depends_on: []
branch: backlog/cross-project-dependencies
status: incomplete
---
# Cross-project dependencies

## Objective

Cross-project dependencies

## Current state

Not present

## Requirements / notes

Builds on `docs/features/task_dependencies.md`.

## Context

Section "Portfolio, goals, resources" of the retired shared backlog.

## Acceptance criteria

- Cross-project dependencies works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified
Branch `backlog/cross-project-dependencies`, reworked on 2026-11-07 onto current `main` (no migration). Done: each link now carries both ends (`TaskLinkBlueprint`), `GET /api/v1/tasks?all_projects=true` lists the whole Space with a project open, and a folder's dependency editor lists links to other projects (with the project, the other task's due date and a note when the dates break the link), searches the Space for a task to link, and requires one end on the chart. See `docs/features/task_dependencies.md`. Not done, filed as `docs/backlog/draw-cross-project-links-on-the-gantt.md`: drawing these links on the chart, the critical path across projects, a Space-wide list.

Ran: `/tmp/runner/all.sh` (static checks, pure data tests, stand-in Jest for the editor tests), `ruby -c` on the Ruby files, and the `GanttPane` tests with the stand-in plus a pass-through `QueryClientProvider` (the runner's react-query stub has none): 42 of 43 pass, and the one that fails (`GanttPane.reschedule.test.tsx`, "shows the reason when the server refuses a move") fails only because the axios stub's `isAxiosError` is always false. Not run (no network, node_modules, database): `rails test`, ESLint, `tsc -b`, the real Jest, a browser look.

To verify and finish:

```sh
cd backend && rails test
cd ../frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then open a project's folder, Gantt tab, at 375px and at desktop width in light and dark: link a task to one in another project via "Find a task in another project", check the "Other projects" list and the red note after moving the dates, and remove the link. If all pass, remove this file and mark the branch `Backlog-Status: complete`.
