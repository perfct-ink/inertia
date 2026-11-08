# Workload

## What it does
`/workload` ("Workload" under Delivery on a project's icon rail, shown once other people can open the Space) shows estimated hours per person per week for the next eight weeks. Each open (not done) task's estimate is spread evenly over the weekdays between its start date (or its due date, if it has no start) and its due date, then summed per assignee per week.
- **Each person's own capacity.** A week is compared with that person's weekly capacity from Resource management (`weekly_capacity_hours`, [resource_management.md](resource_management.md)); there is no capacity field on this page. Changing someone's capacity on the Resources page changes the warnings here. The row heading shows the person's capacity ("Sam 40 h/week") and a link under the title goes to the Resources page. A week over it is marked in the cell with "over by N h" and a warning icon (text, not colour alone).
- Tasks with nobody assigned form an "Unassigned" row at the bottom. It, and anyone no longer in the Space, has no capacity to compare with, so it is never flagged.
- Open tasks with no estimate or no due date are not counted; a line under the table says how many.
- The same task hours also appear on the Resources People tab, beside each person's allocated hours (see [resource_management.md](resource_management.md)).

## API and models
None: it reads tasks (`estimate_hours`) and Space members (`weekly_capacity_hours`). Logic in `frontend/src/data/workload.ts`: `hoursByWeek`, `workload` (rows with per-week `capacity` and `over`), `capacityOfWeek`, `planWithTasks` and `planNotes` (the combined allocation and task view used by the Resources page). Weeks come from `weekStart`/`weekRange` in `frontend/src/data/resource.ts` and capacities from `personLoads` there; this file has no week or capacity helpers of its own. Screen: `view/workload/WorkloadScreen.tsx`.

## Who can view and change
Anyone in the Space can view; nothing here changes data. Capacities are changed by admins and owners on the Resources page.

## Tests
`frontend/src/data/workload.test.ts` (spreading, per-person capacity, changing a capacity, the combined allocation and task calculation), `frontend/src/view/workload/WorkloadScreen.test.tsx`.

## Known limits
- Weeks are fixed at the next eight, and there is no way to click through to a person's tasks.
- Hours are spread over Monday to Friday only; a task dated only on a weekend counts on its first day. Hours already worked (time tracking) are not subtracted.
- Story points are not converted to hours.
- Capacity is the member's one weekly number; leave and holidays are not subtracted (see `docs/backlog/resource-time-off-and-holidays.md`). The capacity of each week is read from `personLoads` (`capacityOfWeek`), so once a week's capacity can differ, this page follows it as soon as `WorkloadScreen` passes `personLoads` the same inputs as the Resources page.
- Capacity is read from the members list, so the warnings appear once it has loaded.

## History
- Implemented 2026-10-19 on branch `backlog/workload-view`.
- Merged to main 2026-11-05 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
- Implemented 2026-11-05 (not deployed; on branch `backlog/workload-uses-resource-capacity`): per-person capacity from Resource management replaces the single "Hours per week" field; the week helpers moved to `data/resource.ts`. Not implemented: leave and holidays.
- Not verified for the 2026-11-05 change: lint, the type-check, the backend (nothing changed there) and a browser. The data tests ran in a stand-in runner and the component tests under a stand-in Jest (see the task's `Blocked` note).
