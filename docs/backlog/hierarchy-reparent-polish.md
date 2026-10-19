---
priority: p2
depends_on: []
components: [frontend]
---
# Hierarchy: keyboard moves, ordering and clearer errors

## Objective
Drag-and-drop on `/hierarchy` is pointer only and unordered.

## Requirements
- A keyboard way to move an item (menu or key sensor).
- Order by drop position among siblings.
- Show a specific message when the server rejects a move.

## Acceptance criteria
- A keyboard user can reparent an item.
- A rejected move explains why.
