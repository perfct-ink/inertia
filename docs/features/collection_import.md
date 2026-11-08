# Collection import (JSON and YAML)

## What it does
A list of objects in JSON or YAML becomes the records of a Collection. Each key becomes a field and each object a record. It works two ways:

- **New Collection.** **Import Collection** in the new-item bar (`CreateItem`, on the Space home, project and folder pages) imports into a new Collection in the chosen folder and opens it.
- **Append.** **Import** beside "Add field" in a Collection's header adds the records to that Collection. Keys are matched to its field names: an exact match first, then ignoring case and surrounding spaces, each field used once. A matched key fills that field and keeps the field's own type; a key with no match makes a new field.

The dialog (`components/ImportCollection.tsx`, a shared `Modal`): choose a `.json`, `.yaml` or `.yml` file or paste the text, then **Check fields**. It shows how many records were found, a note for any keys left out, the Collection's name (new Collection only), and one line per key with a note ("New field", "Existing field", or why it cannot be imported) and a type select. Every type can be changed, or the key left out with "Don't import", before **Import**. Editing the text asks for a new check. Errors show inside the dialog (the client's separate error notice is off for these two calls).

Details of what is read:
- JSON is tried first, then YAML (safe load: no aliases, no custom objects; dates and times are read as ISO text). The text is a list of objects, or an object with one key holding that list (`{"people": [...]}`).
- Types are guessed per key from its values, first fit wins: boolean, integer, number, date and time, date, else text. Empty values (`null`, `""`) are ignored when guessing and left empty in the record. A key whose values are mixed (for example numbers and words) is text, and its numbers and booleans are saved as their text.
- A key holding a nested object or list in any row is left out and reported; see Known limits.
- Limits: 5 MB of text, 1,000 rows and 100 fields per import.
- If any value does not fit its field's type, **nothing is imported** (a new Collection made for the import is removed too) and the error names up to 10 rows and fields: "Nothing was imported, because 2 values do not fit: row 2, age: Value must match age's integer type; ...".

## Field types: one place for the rules
The import has no type rules of its own. What a field type accepts is `TableCell`'s validation, and the import asks it: a guess is the first type whose `TableCell` rule every value passes (`CollectionImport::Fit` builds an unsaved cell and runs its value check), and each value is then saved as a real `TableCell`, which rejects what does not fit. The types a new field can be given are `TableField::DATA_TYPES` less the ones an import cannot fill (`CollectionImport::UNIMPORTABLE`: relation, file, files, person, auto number, created and updated time, formula) and the select types, which need their choices defined first. The server sends this list with the preview and the dialog shows it, labelled by `data/collectionImport.ts`. So when the validated field types on `backlog/collection-field-types` (email, phone, money, and so on) merge, they appear in the import's type list without a change here, and their normalizing on save (a phone saved as its digits) applies to imported values. Matching an existing field of an unfillable type (a relation, a formula) shows it as "Can't import into a ... field" and leaves it out.

## API and models
- `POST /api/v1/collection_imports/preview` with `text` and `folder_id` (new Collection) or `document_id` (append): `{ row_count, columns: [{ key, data_type, field_id, field_name, importable }], skipped_keys, types }`. Saves nothing.
- `POST /api/v1/collection_imports` with `text`, `folder_id` and `title` (default "Imported collection") or `document_id`, and `columns: [{ key, data_type }]` (the keys to import; without it every importable guess is used): `201 { id, row_count }`. One transaction. 422 with `errors` for unreadable text, a bad shape, too many rows, a type that cannot be made, or values that do not fit.
- `CollectionImport` (`app/services/collection_import.rb`): `parse`, `preview`, `import!`, `match_fields`, `guess_type`, `creatable_types`. It saves through `TableField` and `TableCell` only. `CollectionImportsController` is a thin wrapper.
- Frontend: `api/collectionImport.ts` (`CollectionImportApi`, `usePreviewImport`, `useRunImport`; refetches the Space tree, folder lists and open Collections), `data/collectionImport.ts` (type labels and options, the choices to send, counts and notes).

## Who can view and change
A member of the Space with write access (member, admin or owner) can preview and import; a viewer gets 403, and a folder or Collection in a Space the user is not in is 404. The role is checked against the Space of the folder or Collection, not the Space in the request header, like `TablesController`.

## Web entry points
`components/CreateItem.tsx` (**Import Collection**) and `components/editors/TableEditor.tsx` (**Import**) open `components/ImportCollection.tsx`. The dialog is as wide as the screen less its margins (up to 36rem) and scrolls when tall, and on a phone each key's type select drops under its name; nothing depends on hover (not checked in a browser).

## Tests
- Rails: `test/services/collection_import_test.rb` (parsing, guessing through `TableCell`, creating, appending and matching, unfillable fields, refused types, rollback with row-level errors, text columns) and `test/controllers/collection_imports_controller_test.rb` (preview, new and append, defaults, errors leaving nothing behind, other Space 404, viewer 403).
- Frontend: `data/collectionImport.test.ts`, `components/ImportCollection.test.tsx` (check, change a type, leave a key out, create; append; file input; errors in the dialog; nothing to import) and cases in `CreateItem.test.tsx` and `TableEditor.test.tsx` that the buttons open the dialog.

## Known limits
- Nested objects and arrays are left out and reported, not turned into a related Collection: that needs one-to-many relationships (`docs/backlog/collection-one-to-many-relationships.md`); the follow-up is `docs/backlog/import-nested-values-as-related-collections.md`.
- Values are not converted between types on main: a column of numbers written as strings (`"36"`) is guessed as text, and choosing Integer for it fails with the row-level error. The field types branch normalizes on save (numbers as text, phone digits) and will change this.
- The select types (single and multiple choice) are not offered for new fields because they need choices; an existing select field can be filled with values that match its choices.
- Imports are limited to 1,000 rows because each cell is validated and saved one by one; there is no progress bar and the request is one call. CSV and Excel import and JSON/YAML export are separate backlog tasks (`csv-and-excel-import-export.md`).
- Field names come from the keys as written (up to 255 characters); they cannot be renamed in the dialog.

## History
- Started 2026-10-19 on `backlog/import-yaml-or-json-into-collection` (new Collection only).
- 2026-11-07: rebased onto main, reworked: append to an existing Collection with key matching, the type list from the server, all value rules through `TableCell`, row-level errors with rollback, service in `app/services/`, write access checked in the Space of the target. Not merged; not deployed.
- Not implemented: nested values as related Collections, renaming fields in the dialog, CSV or export.
- Not verified: Rails tests, `rails db:migrate` (no migration was added), lint, type-check, the Jest suite (only the offline stand-in), and the browser at 375px and desktop in light and dark. See the task file's Unverified section.
