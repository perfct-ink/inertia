---
priority: p2
depends_on: [task-priority-effort-and-story-points, epic-and-feature-planning-view]
components: [frontend]
---
# Estimates on the epic planning view

## Objective

The epic planning view (`/plan?epic_id=`, `docs/features/epic_planning.md`) lets a member set each task's start and due date but not an estimate, because tasks had no estimate field when it was built. Once tasks carry an effort estimate and story points, set them from the plan and roll them up for the epic.

## Requirements

- Each task row in the plan shows its estimate (hours and/or story points, whichever fields `task-priority-effort-and-story-points` adds) as an editable field, using the same save path as the dates (`save` in `view/epic_plan/EpicPlanScreen.tsx`).
- The epic rollup at the top of the plan shows total estimated and done estimate (for example "13 of 21 points done") next to the task counts; add the sum to `epicPlan` in `frontend/src/data/epic.ts` with a test.
- The rollup hides estimates when no task in the epic has one.
- Works at 375px and in dark mode like the rest of the plan view.

## Acceptance criteria

- A member can set a task's estimate from the epic plan and sees the epic's estimate totals update.
- Failed API calls show an error to the user.
- Tests cover the new behaviour (`data/epic.test.ts`, `EpicPlanScreen.test.tsx`); `docs/features/epic_planning.md` is updated and this file is removed.
