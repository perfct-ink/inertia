---
priority: p2
branch: backlog/task-detail-edit-milestone
depends_on: []
components: [frontend]
---
# Task detail: edit milestone and dates after creation

## Objective
A task's milestone is only set at creation and dates are write-only; there is no task detail view.

## Requirements
- Add a task detail view or panel that edits title, description, status, dates, epic, sprint and milestone.

## Acceptance criteria
- A task's milestone can be changed after creation.
- Failed saves show an error.

## Blocked
Implemented on `backlog/task-detail-edit-milestone` (see `docs/features/task_detail.md`): an Edit dialog on Tasks board cards. Not run (no node_modules offline): `npm run lint`, type-check, Jest, a browser check. Run `npm install`, `npm run lint`, `npx tsc --noEmit`, `npx jest`, then edit a task's milestone on `/tasks`.
