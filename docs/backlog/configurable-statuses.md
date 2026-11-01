---
priority: p1
depends_on: []
components: [frontend]
branch: backlog/configurable-statuses
---
# Configurable statuses (custom labels/colors per board)

## Objective

Configurable statuses (custom labels/colors per board)

## Requirements / notes

Today: fixed 5-value enum. Jira doc pushed back; still listed for parity.

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Configurable statuses (custom labels/colors per board) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built on branch `backlog/configurable-statuses`, not merged: no check that needs `node_modules`, a database or Docker could be run here.

**Done** (see `docs/features/configurable_statuses.md`): a board (a folder, or the whole Space) can rename and recolor each of the five task statuses. Settings live in a new `task_status_settings` table (migration `20261101010001`, `db/schema.rb` hand-edited). They resolve folder, then parent folders, then Space default, then built-in, and are edited from a Statuses button on the Tasks page and on the folder Board and List views. They show on the Tasks workboard and backlog, the folder board and list, document task lines and event tasks.

**Decision for Alex:** the conservative version. The status set stays the fixed five-value enum (rollups, the Gantt and AI workers depend on it); only labels and one of seven colors are configurable. Adding, removing or reordering statuses, or marking which count as done, is not built. If that is wanted, it needs its own task.

**Checks that ran:** `/tmp/runner/all.sh` (TypeScript parse and import check of the changed files, SCSS compile, `ruby -c`, YAML), and the pure data tests `data/task_status.test.ts` and `data/task.test.ts` through a Jest shim.

**Checks that did not run:** `npm run lint`, `tsc`, `npm test` (the React tests `StatusSettings.test.tsx`, `StatusDot.test.tsx`, `TasksScreen.test.tsx` and `FolderDetailScreen.test.tsx` are unrun), `rails db:migrate`, `rails test` (the model and controller tests are unrun), and any browser check.

**To verify and merge:**
1. `cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test`
2. `cd backend && rails db:migrate`, then check the diff of `db/schema.rb` against what is committed (the new table, its two partial unique indexes, the two foreign keys and `version: 2026_11_01_010001`), then `rails test`.
3. In a browser, light and dark, at 375px and desktop: open `/tasks?view=kanban`, click Statuses, rename In Progress, pick a color and Save, then check the column, the arrow label, the filter and the backlog heading. Filter to a folder and set different names there, then open `/folders/<id>?view=board` and `?view=list` to see the same. Check the swatches wrap inside the modal at 375px and that the header buttons wrap rather than scroll sideways. As a viewer the Statuses button is absent.
4. Merge hazard: other branches that edit `TasksScreen.tsx`, `FolderDetailScreen.tsx`, `types/index.ts` (`Task['status']` is now `TaskStatus`), `config/routes.rb`, `db/schema.rb` or `docs/features/README.md` will need a rebase.
