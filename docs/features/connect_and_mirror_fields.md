# Connect and mirror fields

## What it does
Collections can link records across Collections and show a field from the linked record.

**Connect** is the existing `relation` field type, listed as "Relation" in the field form: a cell holds one record of another Collection in the same Space.

**Mirror** is a field type that shows a value from the record a Connect field points at. Add a field, choose the data type Mirror, then choose two things:
- Connected through: one of this Collection's relation fields.
- Field to show: a field of the Collection that relation field links to. Only plain value fields are offered: not another relation, another mirror, a formula, or a File or Files field.

Each record then shows the linked record's value in that column. The cell is read-only text (shaded to show it cannot be edited) with a dash when the record has no link or the linked record has no value. Booleans read True or False and date-times read as UTC, like the rest of the editor. The column header shows `mirror → <Collection> · <Field>`. The value follows the linked record: edit it in the other Collection and every mirror of it shows the change the next time the Collection loads.

A mirror holds no data of its own, so it is never sent when a record is saved, and nothing can be written to it.

Rules the server enforces:
- The mirror's relation field must be in the same Collection, and the shown field must belong to the Collection that relation links to.
- While a mirror depends on them, the relation field's data type and related Collection cannot change, and the shown field cannot become a relation or mirror. Delete the mirror first (the message says so).
- Deleting the relation field or the shown field deletes the mirror (a database cascade, so no mirror is left pointing at nothing). Deleting a field in one Collection can therefore remove a mirror column in another.
- Changing a mirror to another type drops what it pointed at.
- Copying a Collection (see [space_transfer.md](space_transfer.md)) copies its mirrors and re-points them at the copied fields; a mirror survives a copy inside the same Space, and copying across Spaces needs the linked Collections copied together, as relations already do.

## API and models
`table_fields` gains `mirror_relation_field_id` and `mirror_field_id` (migration `20261101170001_add_mirror_to_table_fields.rb`, both foreign keys to `table_fields` with `on_delete: :cascade`). `TableField::DATA_TYPES` includes `mirror`; `UNMIRRORABLE_TYPES` is `relation mirror formula file files`. Validation lives in `TableField#valid_mirror`, `#mirrors_still_valid` and `#clear_mirror_targets` (the two ids are cleared on any other type).

`GET /api/v1/tables/:id` and the field endpoints (`POST /fields`, `PATCH /fields/:field_id`) take and return `mirror_relation_field_id` and `mirror_field_id`. Each record in the response gains `mirrors`: `{ "<mirror field id>": [value, ...] }`, a list per mirror field (empty when nothing is linked; a list so a relation that holds several records can fill it later). It is `{}` for a Collection without mirrors. The values come from `TableMirrors#values_for` (`backend/app/services/table_mirrors.rb`), one extra query however many records there are. Writing a value to a mirror in `POST`/`PATCH /records` answers 422 ("<name> mirrors a field of the linked record and cannot be edited"), as for formulas; `TableCell` also rejects a value for a mirror field.

Frontend: types in `frontend/src/api/tables.ts` (`FieldDataType` includes `mirror`, `TableRecord.mirrors`); pure helpers in `frontend/src/data/mirror.ts` (offered fields, header summary, value formatting, request body); the two choices in `frontend/src/components/editors/MirrorFieldForm.tsx`; the cell and header in `TableEditor.tsx`, styles `.table_editor-mirror` in `TableEditor.scss` (theme tokens, so light and dark mode; the field form wraps and the grid scrolls, so it fits 375px).

## Who can view and change
Anyone who can open the Collection sees mirrored values (they come from a Collection in the same Space, which a relation already shows). Members who can edit the Space add, change and delete mirror fields through the same endpoints and role checks as every other field. A mirror cannot point outside the Space because its relation field cannot.

## Web entry points
The Collection editor (`TableEditor.tsx`): Add field or a column header, then Data type Mirror.

## Tests
- `frontend/src/data/mirror.test.ts` (pure; run offline with the shim).
- `frontend/src/components/editors/MirrorFieldForm.test.tsx` and `TableEditor.mirror.test.tsx` (the cell, the header, the field form and a failed save showing its error).
- `backend/test/models/table_mirror_test.rb` (the values, validation, dependencies, cascade), `backend/test/controllers/table_mirrors_controller_test.rb` (the API, other Spaces, read-only), `backend/test/services/space_transfer_mirror_test.rb` (copying).

## Known limits
- Connect keeps its stored name: the type is still labelled "Relation" in the field form, and a cell holds one record (many-record relations and an automatic reverse list are `docs/backlog/collection-one-to-many-relationships.md`).
- A mirror shows one field, one level deep: it cannot show a relation, another mirror, a formula or uploaded files, and there is no rollup (count, sum) across links yet.
- Mirrored values are not editable from the mirror column, not usable in a formula (a formula that names a mirror field reads it as blank), and not yet in sorting, filtering or the map view.
- Tasks do not have custom fields yet, so tasks cannot be connected or mirrored; that depends on `docs/backlog/custom-fields-on-tasks.md`.
- Mirrors appear in the Collection editor only; there is no import or export of them.
- While the linked Collection is still loading the cell can read as a dash and the header says "Loading…".

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/connect-and-mirror-fields`). Merged with `origin/main` of 2026-11-02 on the branch; `TableField`, the tables controller, `schema.rb`, `api/tables.ts` and `TableEditor.tsx` conflicted with the formula and file field work and were resolved by keeping main's code and re-applying the mirror hunks.
- `space_transfer.rb` now also passes a field's `formula` when copying a Collection (it was dropped, which would have made a copy of a Collection with a formula field fail validation); that is a one-line fix beside the mirror change.
- Not implemented: see Known limits.
- Not verified: lint, the TypeScript type-check, `rails test`, `rails db:migrate` (the `schema.rb` edit was made by hand) and the screens in a browser. What did run: the `data/mirror` tests through the offline shim, the new component tests with Jest from a sibling checkout (`MirrorFieldForm.test.tsx` directly; `TableEditor.test.tsx` and `TableEditor.mirror.test.tsx` with stand-ins for react-query, axios and the API base class), Ruby syntax checks, and the `TableMirrors` logic against plain stand-in objects.
