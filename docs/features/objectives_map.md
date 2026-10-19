# Objectives map (Intermediate Objectives Map)

## What it does
`/objectives-map` (sidebar rail "Objectives map") draws Goldratt's goal tree: one **Goal** at the top, **Critical success factors** under it, and **Necessary conditions** under those, as nodes with arrows pointing up to what each node is necessary for.
- Start by adding the goal; each node then offers "Add critical success factor" / "Add necessary condition". The shape is enforced: a factor sits under the goal, a condition under a factor, and there is one goal per Space. (Three to five factors is guidance only; it is not enforced.)
- Each node has an editable title (blank is rejected with an error), a "Measured by" picker linking it to an OKR objective or an initiative, and a delete button (which deletes everything beneath it).
- **Progress**: a linked objective's or initiative's percent; otherwise the average of the children that have progress; nothing is shown when nothing measures the node. Linked progress follows the objective's key results or the initiative's tasks (see [okrs.md](okrs.md), [planning_fields.md](planning_fields.md)).

## API and models
`io_nodes` (`workspace_id`, `parent_id`, `kind` goal/csf/nc, `title`, `description`, `position`, `objective_id`, `initiative_id`; links are nullified when the objective or initiative is deleted). `IoNode` validates the parent/kind shape, one goal per Space, and that links are in the Space. `GET/POST /api/v1/io_nodes`, `PATCH/DELETE /api/v1/io_nodes/:id`; every call returns the whole map with `progress` (`IoMap.progress_by_id`). The kind is derived from the parent on create. Frontend: `api/ioNodes.ts`, `data/ioMap.ts`, `view/io_map/IoMapScreen.tsx`.

## Who can view and change
Scoped to the current Space through `WorkspaceScoped`; other Spaces' nodes are 404. I did not check role-based limits.

## Tests
`backend/test/models/io_node_test.rb`, `backend/test/controllers/io_nodes_controller_test.rb`, `frontend/src/data/ioMap.test.ts`, `frontend/src/view/io_map/IoMapScreen.test.tsx`.

## Known limits
- Strictly a tree: a node has one parent (Goldratt's maps can let a necessary condition serve several factors). Nodes cannot be moved to another parent or reordered in the UI (`position` exists).
- The arrows are CSS rules, not an SVG diagram; very wide maps scroll sideways. Descriptions are stored but not shown or editable.
- The roadmap does not show the map.

## History
- Implemented 2026-10-19 on branch `backlog/intermediate-objectives-map`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules), so the arrow styling was never seen; `schema.rb` edited by hand. Only `ruby -c` passed.
