# Task priority, estimates and story points

## What it does
Tasks carry a priority (none, low, medium, high, urgent), an effort estimate in hours, and story points both estimated and actual.
- On `/tasks`, the new-task row has a Priority picker, an hours field and a points field. Cards show the priority (high and urgent are tinted), the points ("5 pts", "5 → 8 pts" estimated then actual, or "8 pts actual") and the hours.
- Values are validated on the server: an unknown priority, a negative estimate, or a negative or fractional point count is rejected (422) and the error shows.

## API and models
`tasks.priority` (integer enum, default none, `validate: true`), `estimate_hours` (decimal 7,2, null), `story_points` and `actual_story_points` (integer, null). All four are accepted on `POST/PATCH /api/v1/tasks` and returned in the task JSON. Frontend helpers: `TASK_PRIORITIES`, `priorityLabel`, `pointsLabel`, `estimateLabel` in `data/task.ts`.

## Who can view and change
Same as any task in the Space.

## Tests
`backend/test/models/task_estimates_test.rb`, `backend/test/controllers/tasks_estimates_controller_test.rb`, `frontend/src/data/task.test.ts`.

## Known limits
- The values can be set when a task is created but not edited afterwards in the UI (there is no task detail view yet: `docs/backlog/task-detail-edit-milestone.md`); the API accepts edits. They are not on document task lines either.
- Nothing uses them yet: no sorting or filtering by priority, no totals per sprint, and the workload and agile report views (`workload-view`, `agile-reports`) are unbuilt.

## History
- Implemented 2026-10-19 on branch `backlog/task-priority-effort-and-story-points`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
