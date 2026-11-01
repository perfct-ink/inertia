# Task fields: tags, dropdown, checkbox, rating, vote

## What it does
A Space can define its own fields for tasks, five kinds (Monday's "column types"):

| Kind | A task's value | Edited with |
| --- | --- | --- |
| Tags | up to 20 short labels (1 to 40 characters), different on every task, repeats ignoring case dropped | text box, Enter adds, a remove button on each tag |
| Dropdown | one of the choices the field lists (up to 30 choices, 1 to 40 characters each) | a select with "None" |
| Checkbox | checked (unchecked is no value) | a checkbox |
| Rating | 1 to 5 stars | five star buttons; the current star again, or "Clear", removes it |
| Vote | the set of Space members who voted | a Vote / Voted button with the count; each member only casts or takes back their own vote |

On the **Tasks page** (`/tasks`, backlog list and workboard):
- A **Fields** button in the header opens "Task fields": add a field (name, kind, and the choices for a dropdown), rename it, edit a dropdown's choices, or delete it (after a confirmation; its values on every task go too). Removing a dropdown choice warns that tasks using it lose that value, and the server clears those values.
- Once the Space has at least one field, every backlog row and workboard card shows an **Edit fields** button that opens a dialog with one control per field, and read-only chips (`Name value`) for the fields the task has a value for. A task with no values shows no chips.
- Controls save as you change them. Failed calls show the shared error notice (`lib/api.ts`); local mistakes in the field form (empty or repeated name, no dropdown choices) show inline.

A field's kind is fixed once created (values of one kind mean nothing as another); delete and re-create to change it.

## API and models
- `task_fields` table: `workspace_id`, `name` (1 to 100 characters, unique per Space ignoring case), `field_type` (`tags dropdown checkbox rating vote`), `options` (json list; the dropdown's choices, empty for the other kinds).
- `task_field_values` table: `task_id`, `task_field_id`, `value` (json, never null), unique per task and field. An empty value (no tags, unchecked, no rating, no votes, no choice) is stored as no row.
- `TaskFieldType` (`backend/app/models/task_field_type.rb`) holds what each kind stores, what counts as empty, how input is tidied, and the limits. `TaskField` and `TaskFieldValue` use it; `frontend/src/data/taskField.ts` mirrors it for the form checks and display. `TaskFieldValue.write(task, field, raw)` is the one way a value is set or cleared.
- `Workspace has_many :task_fields`, `Task has_many :field_values`; both are destroyed with their owner.
- Endpoints (all under `/api/v1`, scoped to the Space named by `X-Workspace-Id`):
  - `GET /task_fields`, `POST /task_fields` `{task_field: {name, field_type, options}}`, `PATCH /task_fields/:id` `{task_field: {name, options}}` (the kind cannot change), `DELETE /task_fields/:id`.
  - `PUT /tasks/:task_id/field_values/:task_field_id` `{value}`: sets the value, or clears it for null, `[]`, `false` or `""`. Rejected with 422 for a vote field.
  - `PUT /tasks/:task_id/field_values/:task_field_id/vote` `{voted: true|false}`: casts or takes back the signed-in user's own vote. 422 for any other kind.
  - Both value endpoints answer with the task including `field_values`, a map from field id (string) to value. `GET /tasks` includes `field_values` on every task (preloaded); other task endpoints do not.
- `tasks.field_values` shape: tags `["api", "ui"]`, dropdown `"Final"`, checkbox `true`, rating `4`, vote `[user_id, ...]`.
- Frontend: `api/taskFields.ts` (hooks; value writes patch the cached task lists), `data/taskField.ts`, `components/task-fields/` (`TaskFieldInput`, `TaskFieldChips`, `TaskFieldsDialog`, `ManageTaskFieldsDialog`, `TaskFields.scss`), `view/tasks/TasksScreen.tsx`. The shared `Modal` gained an optional `className`.

## Who can view and change
Any member of the Space can read fields and values. Writes (defining fields, setting values, voting) need the member role or above; viewers get 403, as everywhere in the Space API. Anything from another Space is a 404. Defining fields is not limited to admins: the task asks for this to work "for a signed-in member of the Space".

## Tests
- Backend: `backend/test/models/task_field_test.rb`, `backend/test/controllers/task_fields_controller_test.rb` (kinds, uniqueness, validation, clearing, Space scoping, viewer limits, votes).
- Frontend: `data/taskField.test.ts` (ran with the offline shim), and React Testing Library tests next to the components in `components/task-fields/` (`TaskFieldInput`, `TaskFieldChips`, `TaskFieldsDialog`, `ManageTaskFieldsDialog`).

## Known limits
- Fields are per Space, not per project or folder, and are shown on the Tasks page only (not in the hierarchy tree, Gantt, roadmap or the document task lines).
- Task creation does not set field values; edit them after the task exists. There is no filter, sort or group by a field, and no "most votes" ordering.
- No reordering of fields (they show in creation order). A dropdown choice has no color. A dropdown allows one choice; use Tags for several.
- A vote stays when its member leaves the Space.
- Fields cannot be set from the macOS app or the task-file UI.
- Dropdown choices are matched by text: renaming a choice (by editing the list) clears the tasks that used the old text rather than carrying them over.
- The separate "Custom fields on tasks" backlog task (text, number, date, person fields on the same table) is not covered; this feature adds only these five kinds, and a later change can add more kinds to `TaskFieldType`.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/tags-dropdown-checkbox-rating-vote-fields`). Migrations `20261101030001` and `20261101030002`.
- Not implemented: filters and sorting by field, setting values at task creation, reordering fields, colored dropdown choices, multi-select dropdown, other surfaces than the Tasks page, other field kinds.
- Not verified: no Rails test, migration, npm install, ESLint, Stylelint, type-check, Jest run or browser check was possible in the build environment. Only `ruby -c`, the offline SCSS compile and the pure `data/taskField.test.ts` ran. The component tests and the dialog layout at 375px, light and dark, have never been looked at in a browser.
