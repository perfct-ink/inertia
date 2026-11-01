---
priority: p1
depends_on: []
components: [frontend]
branch: backlog/tags-dropdown-checkbox-rating-vote-fields
---
# Tags, label/dropdown, checkbox, rating, vote

## Objective

Tags, label/dropdown, checkbox, rating, vote

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Tags, label/dropdown, checkbox, rating, vote works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Done on the branch: the five kinds (tags, dropdown, checkbox, rating, vote) as per-Space task fields, with the API, models, migrations, Tasks page UI and tests; see `docs/features/task_fields.md`. This is its own small `task_fields` / `task_field_values` pair rather than a reuse of `table_fields`, which belongs to Collection documents. The separate `custom-fields-on-tasks.md` task (text, number, date and person fields) is not done and can add kinds to `TaskFieldType`.

Decisions for Alex: any member (not only admins) can define fields; "label/dropdown" is built as a single-choice dropdown without colors; a field's kind cannot change after creation.

Checks that did not run (no network, node_modules or database): `rails db:migrate` (migrations `20261101030001`, `20261101030002`; `schema.rb` was edited by hand), `rails test`, `npm run lint`, the TypeScript type-check, `npm test` (the new component tests have never run), and any browser check. Checks that did run: `ruby -c` on the changed Ruby files, the offline SCSS compile, the import/identifier check in `/tmp/runner/all.sh`, and `data/taskField.test.ts` with the Jest shim.

To verify and merge:
1. `cd backend && bundle install && rails db:migrate`, then diff `db/schema.rb` against the hand-edited version (the `version:` line should be `2026_11_01_030002` or later if other branches merged first), then `rails test`.
2. `cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test`.
3. In a browser, open `/tasks`: use Fields to add one field of each kind, set values from the Edit fields dialog on a backlog row and a workboard card, vote as two members, and check the dialogs and chips at 375px and desktop width, light and dark.
4. Merge hazards: `backend/db/schema.rb` (version line and table order) and `backend/config/routes.rb`, `backend/app/models/task.rb` and `workspace.rb`, `frontend/src/view/tasks/TasksScreen.tsx`/`.scss`, `frontend/src/types/index.ts` and `frontend/src/components/ui/Modal.tsx` are shared with other branches.
