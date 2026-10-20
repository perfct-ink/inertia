---
priority: p2
branch: backlog/gantt-zoom-and-weekends
depends_on: []
components: [frontend]
---
# Gantt: zoom levels and weekend shading

## Objective
The Gantt only has a month axis.

## Requirements
- Zoom: days, weeks, months, quarters, years.
- Shade or skip weekends.

## Acceptance criteria
- Changing zoom redraws bars and the today line correctly.
- `shiftedRange` drag still snaps to a day at every zoom.

## Blocked
Implemented on `backlog/gantt-zoom-and-weekends` (see `docs/features/gantt_scheduling.md`). Weekends are shaded, not skipped. Not run (no node_modules offline): `npm run lint`, type-check, Jest, a browser check of the redraw at each zoom. Run `npm install`, `npm run lint`, `npx tsc --noEmit`, `npx jest`, then try each zoom and a drag on `/folders/:id?view=gantt`.
