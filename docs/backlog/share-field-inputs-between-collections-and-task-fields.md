---
priority: p3
depends_on: [custom-fields-on-tasks]
components: [frontend]
---
# Share the field inputs between Collections and task custom fields

## Objective

Collections (`components/editors/TableEditor.tsx`) and task custom fields edit the same scalar types (text, integer, number, boolean, date, datetime) but implement the controls and the value conversion twice. Make `TableEditor` use the shared pieces so a type is defined once.

## Requirements / notes

- `frontend/src/data/taskField.ts` has the type table (`TASK_FIELD_TYPES`), the stored value to input text and back (`valueToDraft`, `draftToValue`), validation (`fieldDraftError`) and display text (`formatFieldValue`); `components/tasks/TaskFieldInputs.tsx` has the typed controls. `TableEditor.tsx` has its own inline copy of the input type, step and datetime handling in `RecordRow`.
- Move the type-generic parts into a field-neutral data file (for example `data/fieldValue.ts`) that both import, and keep the task-specific parts (draft and change sets for a task, tags) in `data/taskField.ts`. `TableEditor` also needs the `relation` type, which task fields do not have.
- Do this after the open Collection branches (`collection-field-types`, `number-fields-with-units-and-summaries`, `collection-image-and-file-fields`) are merged, since they all edit `TableEditor.tsx` and would conflict.
- The backend is already shared: `FieldValue` (`backend/app/models/field_value.rb`) validates both `TableCell` and `TaskFieldValue`.

## Acceptance criteria

- The Collection editor and the task field editor behave as before, using one definition of each scalar type.
- Existing tests still pass; `TableEditor.test.tsx` and `data/taskField.test.ts` cover the shared code; the feature docs `docs/features/task_custom_fields.md` and `docs/features/collections.md` are updated and this file is removed.
