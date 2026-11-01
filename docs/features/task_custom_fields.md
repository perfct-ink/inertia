# Custom fields on tasks

## What it does
A Space can define its own fields for tasks (Monday's "columns") and every member can fill them in.
- **Define fields** (Space admins and owners): on the Tasks page (`/tasks`) a **Fields** button in the header opens a "Custom fields" dialog. It lists the Space's fields with their type, and has a name box, a type picker and **Add field**. A field can be renamed (pencil) or deleted (bin, after a confirmation, because its values are deleted from every task). The button is hidden from members and viewers. A Space can have at most 30 fields, and a name is unique in the Space ignoring case and surrounding spaces.
- **Types** are the scalar Collection field types: Text, Whole number, Number, Yes / no, Date, and Date and time. Dates and times are entered and shown in UTC. There is no relation type yet. A field's type cannot change while any task has a value for it (clear the values first); the dialog has no type editing, so delete and re-add instead.
- **Fill in values**: once the Space has fields, every task card (Workboard) and row (Backlog) on the Tasks page has an "Edit custom fields" button (sliders icon, hidden from viewers). It opens a dialog with one control per field (text box, number box, date picker, date-time picker, or a Not set / Yes / No choice). **Save** sends only what changed; emptying a control clears that value. A value that does not fit the type shows a message naming the field ("Estimate must be a whole number") and disables Save. A failed save keeps the dialog open and shows the error.
- **See values**: each task with values shows small "Name value" tags on its card or row. A boolean shows Yes or No, and `false` and `0` are real values.
- Tasks shown elsewhere (folder pages, events, the Gantt, the hierarchy tree) do not show custom fields yet.

## API and models
- `task_fields` (`workspace_id`, `name`, `data_type`; unique `[workspace_id, name]`) and `task_field_values` (`task_id`, `task_field_id`, `value` as JSON like `table_cells.value`; unique `[task_id, task_field_id]`). A task has a value row only for fields it has a value for. Migrations `20261101020001_create_task_fields` and `20261101020002_create_task_field_values`.
- `FieldValue` (`backend/app/models/field_value.rb`) holds the scalar type rules (text, integer, number, boolean, date, datetime). `TableCell` (Collections) now calls it instead of its own copies, and `TaskField::DATA_TYPES` is `FieldValue::TYPES`, so Collections and tasks agree on what a value is. `TaskField#value_error` gives the message ("must be a whole number").
- `TaskField` (belongs to the Space; the type may not change while values exist; at most `MAX_PER_WORKSPACE` = 30 per Space; names trimmed and unique ignoring case). `TaskFieldValue` (belongs to a task and a field of the same Space; value must fit the type). Deleting a field, a task or a Space deletes the values.
- `HasCustomFields` (`backend/app/models/concerns/has_custom_fields.rb`, included by `Task`): `task.custom_fields = { "<field id>" => value }` is checked when the task validates and written when it saves, in the same transaction, so one bad value rejects the whole save. `nil` or `""` clears a value; `false` and `0` are values. A field from another Space, or one that does not exist, is "Unknown custom field <id>".
- `/api/v1/task_fields` (index, create, update, destroy; params `{ task_field: { name, data_type } }`; `TaskFieldBlueprint` returns `id`, `name`, `data_type`, timestamps).
- `/api/v1/tasks` accepts `{ task: { custom_fields: { "<field id>": value | null } } }` on create and update (separately from the other task params), and index, create and update return `custom_fields` (`{ "<field id>": value }`) through the `with_custom_fields` and `with_document_and_custom_fields` views of `TaskBlueprint`. The index preloads `task_field_values`. Tasks embedded in folder contents and events use the old views and do not include `custom_fields`, so they cost no extra queries.
- Frontend: `data/taskField.ts` (types, drafts, changes, validation, display text; pure, tested), `api/taskFields.ts`, `api/tasks.ts` (`useUpdateTask` takes `custom_fields` changes), `components/tasks/` (`TaskFieldsManager`, `TaskFieldsCell`, `TaskFieldValuesModal`, `TaskFieldInputs`, with their SCSS), and `view/tasks/TasksScreen.tsx` (the Fields button and the cell on cards and rows).

## Who can view and change
- Anyone in the Space, including viewers, reads the fields and values.
- Members, admins and owners (not viewers) set values: this is the normal task update, which `WorkspaceScoped` limits to the member role and above.
- Only **admins and owners** add, rename and delete fields (`require_manage_in!` in `TaskFieldsController`). This is the cautious choice, since a field changes every task in the Space and deleting one deletes data across all of them. If Alex wants every member to define fields, drop the `before_action :require_manage_fields!` line in `TaskFieldsController` and the `canManageWorkspace` check around the Fields button in `TasksScreen.tsx`. The personal Space's owner is always the owner, so a single user is unaffected.
- Another Space's fields are not found (404).

## Tests
- Backend (not run): `backend/test/models/task_field_test.rb` (names, types, the 30-field limit, type change blocked by values, every scalar type keeping `false` and `0`, clearing, create with values, other-Space fields, cascade deletes) and `backend/test/controllers/task_fields_controller_test.rb` (owner and admin CRUD, member and viewer limits, 422 reasons, other Space not found, task create, update, clear and list with values, a bad value changing nothing, viewers cannot set values, folder and event tasks omit the values). The existing `relational_table_test.rb` still covers `TableCell` through the shared `FieldValue`.
- Frontend: `frontend/src/data/taskField.test.ts` (ran, passes, with a small Jest-compatible shim), `frontend/src/components/tasks/TaskFieldsCell.test.tsx` and `TaskFieldsManager.test.tsx` (not run: no `node_modules`).

## Known limits
- Task fields have no relation type, and no dropdown, tags, rating or other richer types; those are separate tasks (`tags-dropdown-checkbox-rating-vote-fields.md`, `connect-and-mirror-fields.md`, `contact-location-and-link-fields.md`, `formula-field.md`, `number-fields-with-units-and-summaries.md`) that can build on `FieldValue` and `TaskField`.
- No filtering, sorting or grouping by a custom field, and no table/column view: `docs/backlog/filter-and-sort-tasks-by-custom-field.md`.
- Values cannot be set in the quick "add task" row on the Tasks page, only afterwards through the edit button (the API accepts them on create). The edit button is on the Tasks page only; tasks lines in documents, the folder page, the Gantt and the hierarchy tree do not show or edit them. `TaskFieldInputs` is a ready-made fragment for a future task detail view (`docs/backlog/task-detail-edit-milestone.md`).
- Fields have no order other than creation order, no required flag, no default value, no description and no per-field permissions.
- Changing only custom fields does not change the task's `updated_at`.
- `TableEditor` (Collections) still has its own inline copy of the input handling: `docs/backlog/share-field-inputs-between-collections-and-task-fields.md`.
- The Jira comparison (`docs/project-management-features.md`) warns that custom fields are Jira's most-complained-about complexity; this is therefore small on purpose (scalar types, 30 per Space, admin-defined).

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/custom-fields-on-tasks`).
- Not implemented: relation and richer types, filtering and sorting by a field, values in the add-task row, fields in other task views, field ordering.
- Not verified: no dependencies, database or network were available. Not run: `npm run lint`, the type-check, Jest (the two component tests), `rails db:migrate` (`backend/db/schema.rb` was edited by hand and should be diffed after migrating), `rails test`, and the screens in a browser (mobile width, dark mode, the nested rename and delete dialogs). Run: the `data/taskField.ts` unit tests with a shim, `ruby -c` on every Ruby file, sass compilation of the new SCSS, and a stubbed-object simulation of `HasCustomFields` and `FieldValue`.
