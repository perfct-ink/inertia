---
priority: p1
depends_on: []
components: [backend]
branch: backlog/custom-fields-on-tasks
---
# Custom fields on tasks

## Objective

**Custom fields on tasks**, reusing the `table_fields` type system

## Requirements / notes

Pushback in the Jira doc still applies; Monday parity requires it.

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Custom fields on tasks works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Done on branch `backlog/custom-fields-on-tasks` (not merged, not deployed). Feature doc: `docs/features/task_custom_fields.md`. The task file is kept until the branch is merged; delete it in the merge.

**Built:** `task_fields` and `task_field_values` tables (migrations `20261101020001` and `20261101020002`, `schema.rb` edited by hand); `FieldValue` shared by Collection cells and task values; `TaskField`, `TaskFieldValue`, `HasCustomFields` on `Task`; `/api/v1/task_fields`; `custom_fields` on the tasks API; the Fields dialog, edit dialog and value tags on the Tasks page; backend, data and component tests.

**Decisions for Alex** (the cautious choice was built, see the feature doc):
- Only Space admins and owners define, rename and delete fields; members set values. Open it to members by removing the `require_manage_fields!` before_action and the `canManageWorkspace` check on the Fields button.
- Scalar types only (no relation, dropdown or tags yet) and at most 30 fields per Space, following the Jira warning in `docs/project-management-features.md` and the "Monday parity" note. The richer types are the separate `tags-dropdown-checkbox-rating-vote-fields`, `connect-and-mirror-fields` and similar tasks.

**Checks that did not run** (no network, `node_modules`, database or Docker): `npm run lint`, the TypeScript type-check, Jest (`TaskFieldsCell.test.tsx`, `TaskFieldsManager.test.tsx`), `rails db:migrate`, `rails test`, and the screens in a browser. **Ran:** `ruby -c` on every Ruby file, sass on the new and changed SCSS, the `frontend/src/data/taskField.test.ts` unit tests through a Jest shim, and a stubbed-object simulation of `FieldValue` and `HasCustomFields`.

**To verify and merge:**
1. `cd backend && rails db:migrate`, then diff `db/schema.rb` against the hand-edited version (index order inside the two new tables may differ); `rails test` (new: `test/models/task_field_test.rb`, `test/controllers/task_fields_controller_test.rb`; `test/models/relational_table_test.rb` covers the `TableCell` refactor onto `FieldValue`).
2. `cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test`.
3. In a browser, as a Space owner on `/tasks`: Fields button, add a field of each type, rename, delete (check the confirmation dialog opens on top of the Fields dialog), fill in values with the edit button on a Backlog row and on a Workboard card, clear a value, and enter a bad whole number. Repeat at 375px width and in dark mode, and as a member (no Fields button, edit button works) and a viewer (tags only).
4. Merge hazards: the open Collection branches (`collection-field-types`, `number-fields-with-units-and-summaries`, `collection-image-and-file-fields`) also edit `table_cell.rb` (this branch changes its `case` and drops its date helpers), and any branch touching `Task` params, `TaskBlueprint`, `types/index.ts` `Task`, `api/tasks.ts` or `TasksScreen.tsx` can conflict in a few lines. Migration versions `20261101020001` and `20261101020002` and the `schema.rb` `version:` line may need renumbering against other branches.
