---
priority: p1
depends_on: []
components: [frontend]
branch: backlog/epic-and-feature-planning-view
---
# Epic and feature planning view

## Objective

**Epic and feature planning view** (Alex, 2026-10-13): plan tasks by epic or by feature. Pick an epic or a feature (`feature-folder-type.md`, `feature-hierarchy.md`), see its tasks grouped by status, drag tasks from the backlog into it, set dates/estimates, and see its rollup

## Current state

Today tasks can be assigned an epic (`tasks.epic_id`) and `EpicsPage.tsx` lists epics with progress, but there's no planning screen. Feature planning needs `feature-hierarchy.md` and `create-tasks-from-a-feature-doc.md`.

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Epic and feature planning view works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built on branch `backlog/epic-and-feature-planning-view`; not merged because the frontend could not be installed or tested here (no network, `node_modules` or database).

What is done: the plan page `/plan?epic_id=` (`view/epic_plan/`), the pure logic in `data/epic.ts`, a Plan button on epic cards, and `docs/features/epic_planning.md`. No backend change and no migration. Choices for Alex: it plans epics only (features are epics per `features-with-requirements-docs.md`, so they come along once built), and estimates are left out because tasks have no estimate field on `main`; that follow-up is `docs/backlog/epic-plan-estimate-rollup.md`.

Checks that ran: the 18 pure tests in `frontend/src/data/epic.test.ts` (Jest shim), plus the offline parse, import and Sass checks on the changed files.

Checks that did not run: `npm run lint` (ESLint, Stylelint), the TypeScript type-check, the Jest suite including `view/epic_plan/EpicPlanScreen.test.tsx`, and a browser check.

To verify and merge:

```sh
cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test
```

Then open `/epics`, press Plan on an epic and check `/plan?epic_id=<id>` at desktop and 375px width, light and dark: drag a backlog task onto a status section (and by touch on a phone), drag an epic task back to the backlog, change status and dates in a row, and confirm a failed save (for example a due date before the start date) shows an error and the row reverts. Then delete this file in the merge commit.
