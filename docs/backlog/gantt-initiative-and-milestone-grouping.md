---
priority: p2
depends_on: []
components: [frontend]
branch: backlog/gantt-initiative-and-milestone-grouping
---
# Gantt: group above epics and show on global timelines

## Objective
Nest the Gantt under initiative and milestone, and show tasks and milestone diamonds on the global Epics and Initiatives timeline pages.

## Requirements
- Add initiative and milestone group rows above epics in `groupGanttRows`.
- Pass tasks and milestones to the global timeline pages, which use the same `Timeline`.

## Acceptance criteria
- The folder Gantt shows milestone > initiative > epic > task.
- The global timelines show milestone diamonds.

## Blocked
Done on the branch `backlog/gantt-initiative-and-milestone-grouping`, but not verified in a browser, type-checked or linted: this machine has no network, `node_modules` or database.

What is done: `groupGanttRows` (`frontend/src/data/schedule.ts`) builds milestone > initiative > epic > task rows; `planningGanttRows` and `milestoneMarkers` feed the new `components/PlanningTimeline.tsx`, which the Epics and Initiatives pages use for their Timeline tab (tasks under the listed epics, a diamond per dated milestone, read-only); `GanttPane` takes a `groups` prop from `FolderDetailScreen`; `Timeline` styles group rows and keeps them undraggable. `compareByTargetDate` (`data/milestone.ts`) is now shared with `roadmapLanes`. Feature doc updated: `docs/features/gantt_scheduling.md`.

Ran: the pure data tests (`schedule`, `milestone`, `roadmap`, and the rest of `frontend/src/data`) with the offline shim, and a static parse of the changed `.ts/.tsx/.scss` files.

Did not run: `npm run lint`, the type-check, the Jest/RTL tests (`GanttPane.test.tsx`, `PlanningTimeline.test.tsx`), and any browser check.

To verify and merge:
1. `cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test`
2. Open a folder with epics, tasks, an initiative and a milestone, then its Gantt tab: rows should read milestone > initiative > epic > task, group bars grey and not draggable, epic and task bars still draggable.
3. Open `/epics?view=timeline` and `/initiatives?view=timeline`: milestone diamonds above the bars, tasks under their epics, nothing draggable. Check at 375px and desktop, light and dark.
4. Merge hazards: `Timeline.tsx`, `Timeline.scss`, `schedule.ts`, `GanttPane.tsx`, `FolderDetailScreen.tsx`, `EpicsScreen.tsx` and `InitiativesScreen.tsx` are also edited on other open `backlog/*` branches (small hunks here).

Decisions worth a look: the Space-wide timelines draw only tasks under a listed epic (epic-less tasks stay on the folder Gantt), and a milestone's bar spans the work under it widened to its target date because a milestone has no start date.
