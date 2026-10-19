# My work

## What it does
`/my-work` (sidebar rail "My work") lists the tasks assigned to you in the current Space that are not done, grouped by due date: Overdue, Today, This week (the next six days), Later and No date. Within a group tasks are ordered by due date, then title. Each row shows the title, due date, the document it came from (a link) and a status picker that updates the task. Empty groups are hidden; with nothing assigned the page says so.

## API and models
No endpoint of its own: it reads `GET /api/v1/tasks` and filters by `assignee_id` in the browser (`myWork`, `dueBucket` in `frontend/src/data/task.ts`). Status changes use the normal task update call.

## Who can view and change
You see your own tasks in the Space; changing status needs the same access as editing a task.

## Tests
`frontend/src/data/task.test.ts` (`dueBucket`, `myWork`), `frontend/src/view/my_work/MyWorkScreen.test.tsx`.

## Known limits
- One Space at a time; it does not gather work across all your Spaces.
- Tasks with several assignees are not a thing yet (`docs/backlog/multiple-assignees-and-watchers.md`).
- "Today" uses the browser's date. Done tasks are always hidden (no toggle), and the list has no filters or grouping options.

## History
- Implemented 2026-10-19 on branch `backlog/my-work-view`. Not merged or deployed.
- Not verified: lint, type-check, tests and the browser were not run (no node_modules).
