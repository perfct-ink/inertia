---
priority: p2
depends_on: []
components: [frontend]
branch: backlog/gantt-keyboard-and-global-reschedule
status: incomplete
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

## Unverified
Built on branch `backlog/gantt-keyboard-and-global-reschedule` (squashed onto `origin/main` on 2026-11-09). Every requirement and acceptance criterion is implemented; it is not marked complete only because the real checks could not run here (no network, `node_modules` or database).

- **Built**: arrow-key move and resize of focused bars (`hooks/useBarKeyboard.ts`, `barKeyAction` in `data/schedule.ts`); live dependency arrows while a bar is dragged or moved by keys, with the today line drawn over it (`Timeline` keeps a `LiveEdit`, see `drawnRange`); drag and keys for epic bars and initiative bars with their own dates on the Epics and Initiatives Timeline tabs (`PlanningTimeline`) and the signed-in Roadmap timeline (`EditableRoadmapTimeline`, `usePlanningReschedule`); the public share link stays read-only. The folder Gantt gets the keys for free through `Timeline`. Docs: `docs/features/gantt_scheduling.md`, `docs/features/roadmap.md`, `docs/features/README.md` (row text), `docs/keyboard-shortcuts.md` (a new "Gantt and timeline bars" section only; the rest is main's). No migration, no backend change.
- **Checked against current main (2026-11-09)**: the Gantt files changed a lot since the branch was written. Re-read `GanttPane.tsx` (still passes `onReschedule` and `onLink`; group rows stay read-only through the default `canReschedule`), the baseline planned bar (kept in `Timeline.tsx`, it does not move with a live edit because it is the plan), `api/epics.ts` and `api/initiatives.ts` (`useUpdateEpic`, `useUpdateInitiative` exist on the new `ApiResource` base and refetch their lists and milestones), `TimelineScreen` (task timeline, deliberately read-only, untouched), and `focus-ring` in `styles/_tokens.scss`.
- **Ran** (stand-in runners from `/tmp/runner`): `data/schedule.test.ts` (23 passing), `components/Timeline.test.tsx` (12), `RoadmapTimeline.test.tsx` (2), `PlanningTimeline.test.tsx` (3) and `view/timeline/TimelineScreen.test.tsx` (3) in the stand-in Jest; the static checks (parse, sass compile of `Timeline.scss` and `RoadmapScreen.scss`) over the 17 changed files; the pure data tests.
- **Did not run**: `npm run lint`, `tsc -b`, the real Jest suite (`RoadmapScreen.test.tsx` needs `@dnd-kit/core`; `GanttPane.test.tsx` and `GanttPane.reschedule.test.tsx` fail in the stand-in on its missing `QueryClientProvider`, before reaching any of this change's code), any browser check.
- **To verify and merge**: `cd frontend && npm install && npm run lint && npx tsc -b && npm test`. Then in a browser at 375px and desktop, light and dark: Tab to a bar on a folder's Gantt, `/epics?view=timeline`, `/initiatives?view=timeline` and `/roadmap`; press arrows, Shift+arrows, Alt+arrows, Page Up/Down, Enter and Escape; confirm the focus ring, that arrows follow the bar, that a failed save shows the error notice, that the hint line is hidden on a phone and shows once under the last roadmap lane (a rule in `RoadmapScreen.scss` hides the others), and that dragging an epic bar on `/epics?view=timeline` saves its dates.
- **Merge hazards**: shared files are `components/Timeline.tsx` and `Timeline.scss` (imports, `TimelineBar` props and handlers, a `live` state, the `canReschedule` prop, hint and status paragraphs), `data/schedule.ts` (functions appended after `shiftedRange`), `view/roadmap/RoadmapScreen.tsx` (two lines) and `docs/keyboard-shortcuts.md` (one section added between "Collection map" and "macOS app"; `backlog/rebind-editor-shortcuts-to-apple-notes-map` and `backlog/paragraph-style-shortcuts` edit other parts of that file, so a clean merge is expected). If one conflicts, keep both sides. No migration.
- **Decisions for Alex**: Shift+arrow changes the end and Alt+arrow the start (Ctrl/Cmd are left to the browser, and Ctrl+arrow switches Spaces on macOS); task bars stay read-only on the Space-wide timelines (their folder's dependency mode applies on the folder Gantt); "the today line follows the bar" is read as the line staying visible over the bar being moved, since it marks a fixed date; the keyboard saves 600 ms after the last key and puts the bar back after 3 s if nothing changed; the public roadmap link stays read-only.
