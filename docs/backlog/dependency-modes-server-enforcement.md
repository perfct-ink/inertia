---
priority: p2
depends_on: []
components: [backend, frontend]
---
# Dependency modes: enforce on the server and shift earlier

## Objective
`folders.dependency_mode` is applied only in the browser on Gantt drags, and flexible mode only pushes tasks later.

## Requirements
- Enforce strict and flexible on `PATCH /api/v1/tasks/:id` so other clients and edits obey the mode.
- Decide and implement pulling dependants earlier when a predecessor moves earlier.

## Acceptance criteria
- Editing dates anywhere respects the folder's mode.
- A test covers a rejected strict update and a flexible cascade.
