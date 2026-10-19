---
branch: backlog/data-files-filtering-sorting-and-api-enums
priority: p1
depends_on: []
components: [frontend]
---
# Move screen filtering and sorting into data files

## Objective
Pure filtering, sorting and API enums live in `src/data/` with unit tests, not inside screens.

## Context
`src/data/` (folder, task, document, schedule and others) and `src/util/` (date, color) exist with tests. Filtering and sorting still sit inside `TasksScreen`, `EventsScreen` (the task picker filter, upcoming/past split) and `DocumentsIndexScreen` (sort by name/location/modified). Status and other enums are not mirrored from the API in one place.

## Requirements
- Extract those functions into the matching data files and test them.
- Define the API enums in the data file of their entity.

## Acceptance criteria
- No screen above contains its own filter or sort logic.
- Each extracted function has a unit test.
- Behaviour of the screens is unchanged.

## Blocked
Done for the filters, sorts and enums named in the task (see the feature doc for what remains in `TasksScreen`). To verify: `cd frontend && npm install && npm run lint && npm test`, then check the Events list/picker, All files sorting and the Workboard in a browser still behave as before. None of that could run here. Then remove this file and merge. It touches `TasksScreen.tsx` and `DocumentsIndexScreen.tsx`, which other `backlog/*` branches also edit, so expect small merge conflicts.
