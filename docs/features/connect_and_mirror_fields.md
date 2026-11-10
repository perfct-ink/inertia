# Connect and lookup (mirror) fields

## What it does
Collections can link records across Collections and show a field from the linked record.

**Connect** is the existing `relation` field type, listed as "Relation" in the field form: a cell holds one record of another Collection in the same Space.

**Lookup** (stored as the type `mirror`) shows a value from the record a Connect field points at (Alex, 2026-11-09: Collections only; e.g. a Song shows its Album's year). Add a field, choose the data type Lookup, then choose two things:
- Connected through: one of this Collection's relation fields.
- Field to show: a field of the Collection that relation field links to. Only fields with a value of their own are offered: not another relation, another lookup, a formula, a File or Files field, or a created or updated time.

Each record then shows the linked record's value in that column, read-only, in the shown field's own format (money in its currency, a person by name, a date as the date field shows it), with a dash when the record has no link or the linked record has no value. The column header shows `Lookup → <Collection> · <Field>`. The value follows the linked record: edit it in the other Collection and every mirror of it shows the change the next time the Collection loads.

A mirror holds no data of its own, so it is never sent when a record is saved, and nothing can be written to it.

Rules the server enforces:
- The mirror's relation field must be in the same Collection, and the shown field must belong to the Collection that relation links to.
- While a mirror depends on them, the relation field's data type and related Collection cannot change, and the shown field cannot become a relation or mirror. Delete the mirror first (the message says so).
- Deleting the relation field or the shown field deletes the mirror (a database cascade, so no mirror is left pointing at nothing). Deleting a field in one Collection can therefore remove a mirror column in another.
- Changing a mirror to another type drops what it pointed at.
- Copying a Collection (see [space_transfer.md](space_transfer.md)) copies its mirrors and re-points them at the copied fields; a mirror survives a copy inside the same Space, and copying across Spaces needs the linked Collections copied together, as relations already do.

## API and models
`table_fields` gains `mirror_relation_field_id` and `mirror_field_id` (migration `20261110100001_add_mirror_to_table_fields.rb`, both foreign keys to `table_fields` with `on_delete: :cascade`). `FieldType::MIRRORED` is `mirror` (a field type with no cells, beside the stored, derived and computed ones); `TableField#read_only?` includes it; `TableField::UNMIRRORABLE_TYPES` is `relation mirror formula file files created_time updated_time`. Validation lives in `TableField#valid_mirror`, `#mirrors_still_valid` and `#clear_mirror_targets` (the two ids are cleared on any other type).

`GET /api/v1/tables/:id` and the field endpoints (`POST /fields`, `PATCH /fields/:field_id`) take and return `mirror_relation_field_id` and `mirror_field_id`. Each record in the response gains `mirrors`: `{ "<mirror field id>": [value, ...] }`, a list per mirror field (empty when nothing is linked; a list so a relation that holds several records can fill it later). It is `{}` for a Collection without mirrors. The values come from `TableMirrors#values_for` (`backend/app/services/table_mirrors.rb`), one extra query however many records there are. Writing a value to a mirror in `POST`/`PATCH /records` answers 422 ("<name> mirrors a field of the linked record and cannot be edited"), as for formulas; `TableCell` also rejects a value for a mirror field.

Frontend: types in `frontend/src/api/tables.ts` (`FieldDataType` includes `mirror`, `TableRecord.mirrors`); `FIELD_TYPES.mirror` in `data/fieldType.ts` (label Lookup, kind `mirrored`, read-only); pure helpers in `frontend/src/data/mirror.ts` (offered fields, header summary, the cell text through `fieldType.displayValue`, request body); the two choices in `frontend/src/components/editors/MirrorFieldForm.tsx`; the cell and header in `TableEditor.tsx` (the cell uses the editor's read-only style).

## Who can view and change
Anyone who can open the Collection sees mirrored values (they come from a Collection in the same Space, which a relation already shows). Members who can edit the Space add, change and delete mirror fields through the same endpoints and role checks as every other field. A mirror cannot point outside the Space because its relation field cannot.

## Web entry points
The Collection editor (`TableEditor.tsx`): Add field or a column header, then Data type Lookup.

## Tests
- `frontend/src/data/mirror.test.ts` (pure; run offline with the shim).
- `frontend/src/components/editors/MirrorFieldForm.test.tsx` and `TableEditor.mirror.test.tsx` (the cell, the header, the field form and a failed save showing its error).
- `backend/test/models/table_mirror_test.rb` (the values, validation, dependencies, cascade), `backend/test/controllers/table_mirrors_controller_test.rb` (the API, other Spaces, read-only), `backend/test/services/space_transfer_mirror_test.rb` (copying).

## Known limits
- Connect keeps its stored name: the type is still labelled "Relation" in the field form, and a cell holds one record (many-record relations and an automatic reverse list are `docs/backlog/collection-one-to-many-relationships.md`).
- A mirror shows one field, one level deep: it cannot show a relation, another mirror, a formula or uploaded files, and there is no rollup (count, sum) across links yet.
- Mirrored values are not editable from the mirror column, not usable in a formula (a formula that names a mirror field reads it as blank), and not yet in sorting, filtering or the map view.
- Tasks are left out (Alex, 2026-11-09): task fields cannot be a relation or a lookup.
- Mirrors appear in the Collection editor only; there is no import or export of them.
- While the linked Collection is still loading the cell can read as a dash and the header says "Loading…".

## History
- Rebuilt on main 2026-11-10 on top of the Collection field types (`FieldType::MIRRORED`, the label Lookup, values shown in the shown field's format). Verified: `rails test`, RuboCop, Brakeman, `tsc -b`, Jest, ESLint, the migration, and in the browser a Contacts lookup of a company's Revenue showing €1,250,000.00.
- First implemented 2026-11-01 on branch `backlog/connect-and-mirror-fields` (not merged). Merged with `origin/main` of 2026-11-02 on the branch; `TableField`, the tables controller, `schema.rb`, `api/tables.ts` and `TableEditor.tsx` conflicted with the formula and file field work and were resolved by keeping main's code and re-applying the mirror hunks.
- `space_transfer.rb` now also passes a field's `formula` when copying a Collection (it was dropped, which would have made a copy of a Collection with a formula field fail validation); that is a one-line fix beside the mirror change.
- Not implemented: see Known limits.
