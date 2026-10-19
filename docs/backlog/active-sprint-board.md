---
priority: p2
depends_on: []
components: [frontend]
---
# Active sprint board

## Objective
Show a kanban board scoped to one sprint, so a team can work the current sprint without the rest of the backlog.

## Context
Sprints exist (`docs/features/sprints.md`), tasks have `sprint_id`, and `/tasks` can filter by sprint. The board on `/tasks` is status columns across all tasks, with the sprint only a filter in a collapsible bar. There is no view that treats one sprint as the working surface.

## Requirements
- A board view for a chosen sprint (default: the Space's sprint with status Active), with the same status columns and drag between columns as `/tasks`.
- Header with the sprint title, goal, dates and progress.
- A way to reach it from the Sprints page.

## Acceptance criteria
- Only tasks whose `sprint_id` is that sprint appear.
- Dragging a card changes its status and persists it.
- A Space with no active sprint shows a prompt to pick or start one, not an empty board.
- A failed update shows an error.
