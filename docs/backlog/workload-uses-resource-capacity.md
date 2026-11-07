---
priority: p2
depends_on: []
components: [frontend]
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
