# Workboard: organize by epic

## What it does
On the Workboard tab of `/tasks`, an **Organize by epic** checkbox (in the toolbar beside the search box, off by default) switches the board into swimlanes:

- One lane per epic that has tasks (in the epics' order), then a **No epic** lane. The No epic lane is always there, even empty: it is where a card is dropped to take it out of its epic, and it lets a Space with no tasks yet add one. An epic with no tasks gets no lane.
- Each lane has the same four board columns (To Do, In Progress, In Review, Done, named and colored as the board's status settings say; see [configurable_statuses.md](configurable_statuses.md)) with only that epic's tasks, and the lane title carries the task count. The Backlog list stays on the Backlog tab, as on the plain board.
- The filters (folder, status, type, assignee, epic, sprint) and search still apply, and the sprint header still shows above the board.
- **Drag and drop works in lanes.** Dropping a card in another column changes its status, like the plain board. Dropping it in another lane changes its epic too (one save for both), and dropping it in No epic clears the epic. Reordering inside a column is local, as on the plain board.
- The "Move to ..." arrow, edit, history and fields buttons work as on the plain board. A card in a lane leaves out the epic line, since the lane is the epic.
- **Add task** under a column of a lane starts the new task in that status and under the lane's epic (the epic select in the form is preset and can still be changed).
- The board scrolls sideways as one, so the columns of every lane line up; on a phone the lane title stays at the left edge while it scrolls.
- Turn the checkbox off to return to the single board. The choice is kept for the visit only; `/tasks?view=kanban&lanes=epic` opens the Workboard organized by epic, so the layout can be linked or bookmarked.

## API and models
No endpoint or model change. The lanes are built in the browser from the tasks and epics already loaded. A drop saves through the normal task update (`PATCH /api/v1/tasks/:id` with `status`, `epic_id`, or both; `epic_id: null` clears it, which the controller already permits). A failed save shows the usual API error notice.

Frontend: `epicLanes`, `epicLaneKey`, `laneEpicId`, `boardCellId` and `parseBoardCell` in `frontend/src/data/task.ts` (a column's drop target id is the status on the plain board and `<lane>|<status>`, such as `epic-3|todo`, in a lane); the toggle, `renderColumn` and the drag handlers in `frontend/src/view/tasks/TasksScreen.tsx`; styles in `TasksScreen.scss` (`tasks-board--lanes`, `tasks-lane`, `tasks-lane_title`, `tasks-lanes_toggle`).

## Who can view and change
Same as the Workboard: any member of the Space sees it; changing a card needs the member role or above, so a viewer's drop fails with the usual error.

## Tests
- `frontend/src/data/task.test.ts` (`workboard swimlanes`: lanes, No epic, lane keys, column ids).
- `frontend/src/view/tasks/TasksScreen.test.tsx` (`organize by epic`: off by default, the toggle on the Workboard only, lanes and their cards, back to one board, `?lanes=epic`, add under a lane's epic, the move arrow, an empty Space, and dropped cards saving status and epic with the drag handlers played by hand).

## Known limits
- Only grouping by epic. The wider objective of `docs/backlog/kanban-group-by-field-and-wip-limits.md` (group by any field, WIP limits) is not built; status columns are renamed and recolored through Statuses but not added, removed or reordered.
- An epic with no tasks has no lane, so a card cannot be dragged into it; set the epic from the card's edit dialog instead.
- A task whose epic is missing from the Space's epic list sits in No epic.
- The layout is not remembered between visits.

## History
- Implemented 2026-11-08 on branch `backlog/kanban-organize-by-epic`, ported by hand onto current main from an older branch of 2026-10-19 (which had a no-drag-and-drop lane mode and a `workboard_swimlanes.md`; this doc replaces it). Not merged or deployed.
- Decision for Alex: lanes are on a per-visit checkbox rather than a saved per-user or per-Space setting, since the app has no user preference store for board layouts; the URL parameter makes it linkable.
- Not verified: lint, type-check, the real Jest run and a browser look at 375px and desktop in light and dark. The static checks and the board's Jest suite (with stand-ins for the packages that are not installed) ran.
