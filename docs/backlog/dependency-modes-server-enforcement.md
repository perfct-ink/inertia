---
priority: p2
depends_on: []
components: [backend, frontend]
branch: backlog/dependency-modes-server-enforcement
---
# Dependency modes: enforce on the server and shift earlier

## Objective
`folders.dependency_mode` is applied only in the browser on Gantt drags, and flexible mode only pushes tasks later.

## Requirements
- Enforce strict and flexible on `PATCH /api/v1/tasks/:id` so other clients and edits obey the mode.
- Decide and implement pulling dependants earlier when a predecessor moves earlier.

## Acceptance criteria
- Editing dates anywhere respects the folder's mode.
- A test covers a rejected strict update and a flexible cascade.

## Blocked
Done on branch `backlog/dependency-modes-server-enforcement`; not merged because the Rails and Jest suites could not run here (no network, `node_modules`, database or usable bundler).

What is built:
- `PATCH /api/v1/tasks/:id` now saves through `Scheduling::TaskUpdate` (`backend/app/services/scheduling/task_update.rb`). A date change obeys the mode of the folder the task sits in (its own folder, else its document's folder): strict answers 422 and saves nothing; flexible saves the dependants that move in the same transaction and returns them as `rescheduled`.
- The rules are in the database-free `Scheduling::DependencyPlanner` and mirrored in `planReschedule` (`frontend/src/data/dependency.ts`).
- Decision for Alex (the "decide" part of the spec): flexible now also pulls dependants earlier, but only those sitting exactly on their link before the move and never past what their other links allow; a deliberate gap is never closed. Say if you would rather keep the gap, close it, or make pulling its own mode.
- The Gantt shows the server's message when a save is refused.
- No migration or `schema.rb` change.

Ran: `/tmp/runner/data-tests.sh` on `frontend/src/data/dependency.test.ts` (13 passing); `backend/test/services/scheduling/dependency_planner_test.rb` with plain `ruby` and Minitest through a stub `test_helper` (12 passing); `ruby -c` on every changed `.rb`.

Not run: `npm run lint`, the type-check, `npm test` (including the new `GanttPane.reschedule.test.tsx`), `rails test` (including the new `tasks_controller_test.rb`, which exercises `Scheduling::TaskUpdate` against a real database), a browser check.

To verify and merge:

```bash
cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test
cd ../backend && bundle install && rails test
```

Then open a folder's Gantt tab, set "Block invalid dates" and drag a task past a dependant (the message shows). Set "Shift dependent tasks" and drag a task earlier and later (dependants follow). Send the same `PATCH /api/v1/tasks/:id` with curl to check the rules apply without the browser.
