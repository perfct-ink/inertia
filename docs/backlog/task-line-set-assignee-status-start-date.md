---
priority: p0
depends_on: []
components: [frontend]
branch: backlog/task-line-set-assignee-status-start-date
---
# Set assignee, status and start date from a task line

## Objective
A task line in a document can set the task's assignee, status and start date, not only its due date.

## Context
The line (`components/editors/WorkspaceTaskItemView.tsx`) shows a status dot and edits only `due_date` through `useUpdateTask`. The status dot is not interactive. There is no task detail view (see `task-detail-edit-milestone`).

## Requirements
- Add controls on a synced line for assignee (a Space member), status and start date, using the shared `@/components/ui` primitives.
- Save through the existing task update call.

## Acceptance criteria
- Choosing an assignee, status or start date on a line updates that task and the tasks page shows the change.
- Controls appear only once the line has a `taskId`.
- Failed saves show an error.

## Blocked
Implemented on this branch (controls, docs). Not merged to `main` because lint, type-check, tests and the browser could not run (no node_modules, no network). No automated test added. Run `npm run lint` and the frontend tests, check the line in a browser, then remove this file and merge.
