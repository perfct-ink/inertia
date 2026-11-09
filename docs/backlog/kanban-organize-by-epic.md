---
branch: backlog/kanban-organize-by-epic
status: incomplete
priority: p1
depends_on: []
components: [frontend, backend]
---
# Organize by epic

## Objective

Kanban: group by any field, swimlanes, WIP limits, configurable columns. Alex re-requested 2026-10-13, and asked specifically for **organize by epic** (swimlane per epic, plus a "No epic" lane), as an option you can toggle on or off

## Current state

Kanban exists on the fixed status enum (`/tasks?view=kanban`); the rest is missing

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Organize by epic works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built (see `docs/features/workboard_swimlanes.md`): an "Organize by epic" checkbox on the Workboard (also `?lanes=epic`) with a lane per epic that has tasks plus an always-present No epic lane, drag and drop between columns and lanes (a cross-lane drop saves the epic and status), add task under a lane's epic, tests for the data helpers and the screen. Ported by hand from the 2026-10-19 branch, which had lanes without drag and drop. The wider objective (group by any field, WIP limits) moved to `kanban-group-by-field-and-wip-limits.md`; the acceptance criteria above are the epic part, so once the checks below pass this file can be removed (the branch is `incomplete` only because the checks could not run here).

Ran: the repo's static check (babel parse, sass compile), the pure data tests (`task.test.ts`, 21 passed) and `TasksScreen.test.tsx` in a Jest stand-in (16 passed, `@dnd-kit` stubbed because it is mocked in the test anyway). Not run (no network, `node_modules`): the real Jest run, ESLint/Stylelint, `tsc`, and any browser check.

To verify:

```bash
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser at 375px and desktop, light and dark: Tasks, Workboard, tick Organize by epic, drag a card to another column of a lane, to another lane (the epic changes) and to No epic, add a task under a lane, untick it. Check the lane title stays at the left while the board scrolls sideways on a phone.
