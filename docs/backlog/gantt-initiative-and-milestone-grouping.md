---
priority: p2
depends_on: []
components: [frontend]
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
