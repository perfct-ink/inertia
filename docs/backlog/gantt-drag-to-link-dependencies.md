---
branch: backlog/gantt-drag-to-link-dependencies
priority: p0
depends_on: []
components: [frontend]
---
# Gantt: draw a dependency by dragging between bars

## Objective
Let a user create a task dependency on the Gantt by dragging from one task bar to another, instead of only using the Dependencies editor's pickers.

## Context
Folder Gantt (`view/folder_detail/GanttPane.tsx`, `components/Timeline.tsx`) draws arrows and has a form-based editor that calls `POST /api/v1/task_dependencies`. The API already rejects self links, duplicates, loops and cross-Space tasks. Bars already support drag to move and resize.

## Requirements
- A drag handle on each task bar's start and end side that begins a link; dropping on another task bar creates the link, with the kind decided by the two sides (end to start = finish to start, and so on).
- Show a provisional line while dragging.
- Show the server's error (loop, duplicate) if creation fails.
- Keep the existing editor, and a keyboard-accessible way to create links.
- Do not break bar move and resize drags.

## Acceptance criteria
- Dragging from the end of task A onto task B's start side creates a finish-to-start link and an arrow appears.
- Each of the four side combinations maps to the matching kind.
- Dropping on empty space, the same task, or an existing pair creates nothing; a loop attempt shows the server error.
- Moving or resizing a bar still works as before.

## Blocked
Implemented on the branch with tests. To verify: `cd frontend && npm install && npm run lint && npm test`, then in a browser on a folder's Gantt tab drag between bar-side dots, check that bar move and resize still work, and check a loop shows the server error. None of that could run here (no node_modules, no network). Then remove this file and merge.
