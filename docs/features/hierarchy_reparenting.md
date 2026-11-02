# Hierarchy reparenting

## What it does
On the Hierarchy page (`/hierarchy`) a row can be moved to another parent, and put in a place among its siblings, in two ways: dragging it with a pointer, or the **Move** button on the row (works with a keyboard, a screen reader and a touch screen).

Allowed moves:

- initiative onto a milestone
- epic onto an initiative or a milestone
- task onto an epic, another task (becomes a subtask), or a milestone
- any item onto the **Unassigned** zone to detach it from every parent

Milestones cannot be moved and have no Move button. A task cannot be moved into itself or its own subtree. Moving a task under another task only sets `parent_id`; it keeps its own `epic_id` so epic counts do not change underneath it. After a move, milestones, initiatives, epics and tasks are refetched, since progress rolls up at each level.

### Drag
Rows are split by where the pointer is. Over a row of the same level as the dragged item (epic over epic, task over task, initiative over initiative) the top and bottom 30% of the row put the item before or after it, shown as a line above or below the row; the middle nests it inside (tasks only, since an epic cannot go inside an epic). Over a row of another level the whole row is the drop target. Dropping on the Unassigned zone puts the item last there. The row under the pointer is the target (`pointerWithin`), so a drop outside every row does nothing.

### Move button (keyboard and touch)
The button (labelled `Move <title>`) opens a dialog with two selects: **Move to** (every parent the item may go under, written as a path such as `Epic: Beta > Growth > Checkout`, with `Unassigned (no parent)` last) and **Place** (`First`, or `After "<sibling>"` for each sibling of the same level). It starts on the item's current parent and place; the **Move** button stays disabled until something would change. The rows are no longer keyboard stops themselves, so Tab goes to the expand toggle and the Move button. Below the `sm` breakpoint the progress bar is hidden so the title and Move button fit a 375px screen, and on touch screens (`pointer: coarse`) the Move button is 40px square and rows grow to fit it.

### Order
Siblings are ordered by `position`, then id. A parent can hold several levels (a milestone holds initiatives, then loose epics, then loose tasks), always shown in that level order, and `position` orders items of the same level. Milestones keep the order the API returns them in and cannot be reordered. `position` is stored on initiatives, epics and tasks. A move sends the item's new parent (only when it changed) and position in one PATCH. The position is taken from between its neighbours (or one past the last, or one before the first); only when the neighbours have no number between them are the siblings numbered again, and those extra PATCHes are sent after the item's own is accepted.

### When the server rejects a move
The error notice names the move and gives the server's reason, for example `Couldn't move "Write docs" under "Launch": Parent can't be one of this task's own subtasks`. Network and other failures get the same prefix. If the item moved but renumbering a sibling failed, the notice says `"<title>" moved, but the new order wasn't saved`. The page refetches either way, so it shows what the server has. The server's word "workspace" is shown as "Space" in every error notice.

## Rules in code
- Allowed moves: `reparentChanges` in `frontend/src/data/hierarchy.ts`. Ordering and the plan for a move (`planMove`, `planDrop`, `placeAt`, `dropPlacement`, `moveDestinations`, `moveSlots`) are in the same file; `buildHierarchy` sorts every list.
- Sending a plan: `useMoveHierarchyItem` in `frontend/src/api/hierarchy.ts`. The failure wording is passed as `failureContext` to `frontend/src/lib/api.ts`; `frontend/src/util/errorMessage.ts` turns "workspace" into "Space".
- Server checks: `Task#parent_is_not_self_or_a_descendant`, and the `SameWorkspace` concern (`validates_same_workspace`) so an epic's initiative, a task's epic and parent, and any milestone must belong to the same Space. Epic, initiative and milestone cannot form cycles (separate tables, one-way keys). `Positioned` (initiatives and epics) requires `position` to be a whole number in the 32-bit range.

## API and models
Moves use the existing `PATCH /api/v1/initiatives/:id`, `/epics/:id` and `/tasks/:id` with `milestone_id`, `initiative_id`, `epic_id`, `parent_id` and `position`. `initiatives.position` and `epics.position` (integer, default 0, not null) were added by migration `20261101140001_add_position_to_initiatives_and_epics.rb`; both are returned in the list and update responses. `tasks.position` already existed (it is also the default order of the task lists, so moving a task in the Hierarchy changes where it sorts there too). A rejected update is a 422 with `{ "errors": [...] }`.

## Who can view and change
Scoped to the current Space (`X-Workspace-Id`). Reading needs any membership; every PATCH needs the member role or above (`WorkspaceScoped`), so a viewer gets 403. The Move button and drag are shown to viewers too; the server refuses and the notice shows the error.

## Web entry points
`/hierarchy` (`frontend/src/view/hierarchy/HierarchyScreen.tsx`, `MoveDialog.tsx`, `HierarchyScreen.scss`).

## Tests
- `frontend/src/data/hierarchy.test.ts`: `reparentChanges`, the ordering of siblings, `placeAt`, `planMove`, `planDrop`, `dropOptions`, `dropPlacement`, the Move dialog's destinations and places. Run offline with the shim.
- `frontend/src/view/hierarchy/HierarchyScreen.test.tsx`: the Move button, the dialog and the move it sends (React Testing Library).
- `frontend/src/lib/api.test.ts`: `failureContext` and the Space wording.
- `backend/test/controllers/hierarchy_moves_test.rb`: positions, a combined parent and position update, a rejected move with its message, cross-Space rejection, viewers refused.
- `backend/test/models/epic_test.rb` and `task_test.rb`: cross-Space rejection.

## Known limits
- Milestones cannot be reordered.
- Order is only among items of the same level; an epic cannot be placed between two tasks.
- Positions are shared across the whole task table (also the default task order elsewhere), so a reordered task's number only means something among its siblings.
- Existing initiatives and epics all start at position 0, so they stay in id order until one is moved.
- Two people moving items in the same parent at once can leave ties; they fall back to id order.
- The drag cannot be done by touch (the browser scrolls instead); the Move button is the touch way. The pointer drop line was not tried in a browser.
- Renumbering sends one PATCH per shifted sibling, not a single bulk request.

## History
- Implemented 2026-10-18. Committed locally; not pushed or deployed.
- Implemented 2026-11-01 (not deployed; on branch `backlog/hierarchy-reparent-polish`): Move button and dialog, order by drop position, specific error on a rejected move, `position` on initiatives and epics.
- Not implemented: reordering milestones, a bulk reorder endpoint, a drag that works by touch, drag with the keyboard sensor.
- Not verified: tests, lint, type-check, the migration (`schema.rb` was edited by hand), the drag interaction and the page in a browser (mobile and desktop width, light and dark) were not run (no dependencies, database or network here). Ran: `ruby -c` on the Ruby files, the static checker and the pure data tests (`frontend/src/data/hierarchy.test.ts`) with the offline shim. Existing tests that build records across Spaces, which the same-Space validation would reject, were not checked.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
