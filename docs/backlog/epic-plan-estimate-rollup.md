---
priority: p2
depends_on: [task-priority-effort-and-story-points, epic-and-feature-planning-view]
branch: backlog/epic-plan-estimate-rollup
components: [frontend]
status: incomplete
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

## Blocked

Implemented on branch `backlog/epic-plan-estimate-rollup` (2026-11-03) but not merged, because the full checks cannot run where it was written (no network, `node_modules` or database). Frontend only: no backend change and no migration.

Done: story points and hours fields on each epic task row (saved on leave or Enter through the page's `save`), `points` and `hours` totals in `epicPlan` with `estimateRollup` wording, `parseEstimate` in `data/task.ts`, tests, and `docs/features/epic_planning.md` and `task_estimates.md` updated.

Ran: `data/epic.test.ts` and `data/task.test.ts` with the Jest shim (pass); the static and Sass checks of the offline runner; `EpicPlanScreen.test.tsx` (20 of 20 pass) under a stand-in Jest with inert stubs for `@dnd-kit/core`, `@tanstack/react-query`, axios, zustand and lucide-react.

Not run: ESLint, Stylelint, `tsc -b`, the real Jest suite, and the page in a browser.

To verify and merge:

```bash
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then open `/plan?epic_id=<id>` on an epic whose tasks have story points or hours, at 375px and on desktop, in light and dark. Check that the two number fields wrap under the title on a phone, that the totals update after Enter or leaving a field, that a failed save shows the API error and restores the value, and that the rollup shows no estimate line when no task has an estimate. Then delete this file in the merge.

Decisions: a done task counts its estimate (not its actual story points) toward the done total, and each unit (points, hours) is totalled on its own. Editing is limited to estimated points and hours, and the backlog pane rows show no estimate; change either if Alex wants otherwise.
