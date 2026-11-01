---
priority: p2
depends_on: []
components: [frontend]
branch: backlog/hierarchy-reparent-polish
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

## Blocked
Built and committed on `backlog/hierarchy-reparent-polish`, not merged, because most checks cannot run here (no network, `node_modules`, database or Docker).

Done: a **Move** button on every non-milestone row opens a dialog (Move to / Place) that makes the same move as a drag; drags can drop before, inside or after a same-level row and order siblings by a new `position`; a rejected move shows `Couldn't move "X" under "Y": <server reason>`; `position` on initiatives and epics (migration `20261101140001`, `schema.rb` edited by hand, controllers, blueprints, `Positioned` concern). Details in `docs/features/hierarchy_reparenting.md`.

Ran: the offline static checker (`/tmp/runner/all.sh`), `ruby -c` on the Ruby files, and the pure data tests with the offline shim (`frontend/src/data/hierarchy.test.ts`, 24 passing).

Did not run: `npm run lint`, the TypeScript type-check, Jest (`HierarchyScreen.test.tsx`, `lib/api.test.ts` and the rest), `rails db:migrate`, `rails test` (including the new `backend/test/controllers/hierarchy_moves_test.rb`), and nothing was tried in a browser.

To verify and merge:
1. `cd frontend && npm install && npm run lint && npx tsc -b && npm test`.
2. `cd backend && bundle install && rails db:migrate`, then check `git diff db/schema.rb` shows only the version line and the two `position` columns (already hand-edited), then `rails test`.
3. Open `/hierarchy` at 375px and at desktop width, light and dark. With the keyboard only: Tab to a row's Move button, press Enter, change Move to / Place, Move. Drag an epic onto the top, middle and bottom of another epic and check the line or highlight, the saved order after a reload, and that a task cannot be moved into its own subtask (the notice should name the move).
4. Merge hazard: other branches that add a migration or edit `backend/db/schema.rb` need their `version:` line reconciled with `2026_11_01_140001`. `frontend/src/lib/api.ts`, `frontend/src/util/errorMessage.ts` and `frontend/src/types/index.ts` are shared files with small additions.

Decision for Alex: tasks sort by `position` everywhere (it is the model's default scope), so ordering tasks on the Hierarchy page also changes where they sort in other task lists. Kept as is rather than adding a separate column; say if you would rather have a hierarchy-only column.
