---
priority: p2
depends_on: [workload-view, resource-capacity-management]
components: [frontend]
branch: backlog/workload-uses-resource-capacity
---
# Workload view uses each person's capacity and allocations

## Objective

Bring the task-based Workload view and Resource management together: the Workload view should compare assigned task effort with each person's own weekly capacity, and the Resources page should be able to show planned allocation next to the hours their tasks add up to.

## Current state

The Workload view (`docs/backlog/workload-view.md`, branch `backlog/workload-view`) takes one "hours per week" number for everyone. Resource management (`docs/features/resource_management.md`) stores `weekly_capacity_hours` per member and allocations per project, independent of tasks. Each was built so it works alone on `main`.

## Requirements / notes

- Workload reads `weekly_capacity_hours` from `GET /api/v1/workspaces/:id/members` instead of the single field, and drops that field.
- On the Resources People tab, show per person and week the task effort (from the Workload calculation in `frontend/src/data/workload.ts`) beside the allocated hours, and warn when either is over capacity. Decide whether the warning counts the larger of the two or both.
- Reuse `weekStart`/`weekRange` from `frontend/src/data/resource.ts` rather than the copies in `workload.ts`.

## Acceptance criteria

- Changing a person's capacity on the Resources page changes the over-allocation warnings on the Workload view.
- No duplicate week or capacity helpers remain.
- Tests cover the combined calculation; both feature docs are updated and this file is removed.

## Blocked

Built on `backlog/workload-uses-resource-capacity`, not merged because lint, the type-check and a browser could not run on the machine that finished it.

Done: the Workload view compares each person's open task hours with that person's own capacity from Resource management and drops its single "Hours per week" field (with a link to the Resources page); the Resources People tab shows each week's task hours beside the allocated hours and warns when either is over capacity (the larger of the two, not their sum, because the tasks are the work inside the allocations); the duplicate week and capacity helpers are gone from `data/workload.ts`, which now reads `weekStart`, `weekRange` and `personLoads` from `data/resource.ts`. Tests and both feature docs are updated.

Ran: the static checker; `workload.test.ts` and `resource.test.ts` (pure); `WorkloadScreen.test.tsx` and `ResourcesScreen.test.tsx` in a Jest stand-in (all passed). No backend change.

Not run, to do before merging:

```sh
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then open /workload and /resources at 375px and desktop, light and dark: change a person's capacity on Resources and watch the warning on Workload change.

Merge note: `backlog/resource-time-off-and-holidays` also changes `personLoads` in `data/resource.ts` (time off lowers a week's capacity). The Workload page reads each week's capacity through `capacityOfWeek` over `personLoads`, so it should follow once both merge, but `WorkloadScreen` must pass `personLoads` the same inputs as the Resources page (it currently passes no allocations or time off). Decision for Alex: a week is over capacity when allocations or tasks alone exceed it, not when they add up.
