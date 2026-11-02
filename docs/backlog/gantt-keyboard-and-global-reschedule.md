---
priority: p2
depends_on: []
components: [frontend]
branch: backlog/gantt-keyboard-and-global-reschedule
---
# Gantt: keyboard rescheduling and drag on other timelines

## Objective
Rescheduling is mouse and touch only, and only on the folder Gantt.

## Requirements
- Arrow keys move or resize a focused bar.
- Offer the same drag on the Epics, Initiatives and roadmap timelines.
- Make arrows and the today line follow a bar while dragging.

## Acceptance criteria
- A keyboard-only user can reschedule a bar.
- Epics and initiatives can be dragged on their pages.

## Blocked
Done on branch `backlog/gantt-keyboard-and-global-reschedule`; not merged because the real checks could not run here (no network, `node_modules` or database).

- **Built**: arrow-key move and resize of focused bars (`hooks/useBarKeyboard.ts`, `barKeyAction` in `data/schedule.ts`); live dependency arrows while a bar is dragged or moved by keys, with the today line drawn over it (`Timeline` keeps a `LiveEdit`, see `drawnRange`); drag and keys for epic bars and initiative bars with their own dates on the Epics and Initiatives Timeline tabs (`PlanningTimeline`) and the signed-in Roadmap timeline (`EditableRoadmapTimeline`, `usePlanningReschedule`); the public share link stays read-only. The folder Gantt gets the keys for free through `Timeline`. Docs: `docs/features/gantt_scheduling.md` (its merge-wave conflict markers resolved, both sides kept), `docs/features/roadmap.md`, `docs/keyboard-shortcuts.md`. No migration, no backend change, no new README row (existing features extended).
- **Ran** (stand-in runners from `/tmp/runner`): `data/schedule.test.ts` (offline shim); `components/Timeline.test.tsx`, `RoadmapTimeline.test.tsx`, `PlanningTimeline.test.tsx` and `view/timeline/TimelineScreen.test.tsx` (stand-in Jest, passing); static parse of the changed files and a sass compile of `Timeline.scss`.
- **Did not run**: `npm run lint`, `tsc -b`, the real Jest suite (`RoadmapScreen.test.tsx`, `GanttPane*.test.tsx`, `FolderDetailScreen.test.tsx` need packages missing here), any browser check.
- **To verify and merge**: `cd frontend && npm install && npm run lint && npx tsc -b && npm test`. Then in a browser at 375px and desktop, light and dark: Tab to a bar on a folder's Gantt, `/epics?view=timeline`, `/initiatives?view=timeline` and `/roadmap`; press arrows, Shift+arrows, Alt+arrows, Page Up/Down, Enter and Escape; confirm the focus ring, that arrows follow the bar, and that the hint line is hidden on a phone and shows once under the last roadmap lane (a rule in `RoadmapScreen.scss` hides the others).
- **Merge hazards**: `components/Timeline.tsx` and `Timeline.scss` (small hunks: imports, `TimelineBar` props and handlers, a `live` state, `canReschedule` prop, hint and status paragraphs) and `data/schedule.ts` (functions appended after `shiftedRange`) conflict with `origin/backlog/baselines`; `components/PlanningTimeline.tsx`/`RoadmapTimeline.tsx` and `view/roadmap/RoadmapScreen.tsx` (two lines: the import and `EditableRoadmapTimeline`) may conflict with `origin/backlog/project-and-item-templates`. Resolve by keeping both sides and re-applying these hunks. `GanttPane.tsx`, `EpicsScreen.tsx` and `InitiativesScreen.tsx` are untouched on purpose.
- **Decisions for Alex**: Shift+arrow changes the end and Alt+arrow the start (Ctrl/Cmd are left to the browser, and Ctrl+arrow switches Spaces on macOS); task bars stay read-only on the Space-wide timelines (their folder's dependency mode applies on the folder Gantt); "the today line follows the bar" is read as the line staying visible over the bar being moved, since it marks a fixed date; the keyboard saves 600 ms after the last key and puts the bar back after 3 s if nothing changed.
