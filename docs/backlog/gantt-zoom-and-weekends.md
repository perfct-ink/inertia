---
priority: p2
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
