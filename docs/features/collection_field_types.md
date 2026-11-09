# Collection field types

## What it does
A Collection field has a **type** (Email, Money, Rating, Single select, Auto-number...) and, for types that can be shown more than one way, a **format** for that type. Values are always stored plain; the format only changes how the grid shows them. The field form (Add field, or click a column's name) asks for the name, then the Data type, then a **Format** picker, shown only for a type that has more than one format. A select field also asks for its choices, one per line.

In the grid a typed cell shows the value in the field's format when you are not in it (money `€1,250.00`, a phone `(555) 123-4567`, a rating `★★★★☆`) and the plain text while you edit it. Text typed in any common way is read into the plain value: `$1,250.00` is stored as `1250`, `(555) 123-4567` as `5551234567`, `March` as `3`, `0D9488` as `#0d9488`. A value that does not fit its type marks the cell invalid (red border, `aria-invalid`) and Save shows why ("Email needs an email address like name@example.com.") without calling the server. The server checks again and answers 422 with a message.

### The types
| Type | Stored | Formats (first is the default) | Rule |
| --- | --- | --- | --- |
| Text, Long text | text | none | Long text up to 20,000 characters, edited in a text area |
| Email | text | none | `name@host.tld`, up to 255 characters |
| Phone | digits, optional leading `+` | Parentheses `(555) 123-4567`, Dashes `555-123-4567` | 7 to 15 digits. Ten digits, or a leading 1 (`+1 ...`), are formatted; other numbers are shown as stored |
| URL | text | none | starts with `http://` or `https://` |
| Person name | text | none | letters, spaces, `'` `.` `-`; extra spaces are squeezed |
| Username | text | none | 3 to 30 letters, digits, `.` `_` `-` |
| Code (letters and digits) | text | none | letters and digits only |
| Integer, Number | number | Plain `1234`, With commas `1,234` | the original rules. "Number with commas" is the With commas format of Number, not a separate type. A **unit** (kg, $) is still offered for these two |
| Money | number | US dollars `$1,250.00`, Euros `€1,250.00`, Pounds `£1,250.00`, Yen `¥1,250` | at most two decimals, up to 1,000,000,000,000 |
| Mileage | number | Miles `42,000 mi`, Kilometers `42,000 km` | 0 or more |
| Percent | number | none (`99.5%`) | 0 to 100 |
| Rating | whole number | Stars (five star buttons, `★★★★☆`), Number (a menu, `4 / 5`) | 1 to 5 |
| Boolean, Date, Date and time | as before | none | Date cells now use the styled `DatePicker` |
| Month | whole number | Name `March`, Short name `Mar`, Number `03` | 1 to 12; edited in a menu of month names |
| Year | whole number | none | 1000 to 9999 |
| Single select | text | none | one of the field's choices |
| Multi select | list of text | none | one or more of the field's choices, a checkbox list in the cell. This is the "multi select / tags" of the task: the choices are set on the field |
| Person | user id | none | anyone who can open the Space (its members and team members); the cell is a menu of the Space's members, and a person who left shows as "Member #id" |
| Color | text | none | `#rrggbb`, lower case; the cell shows a swatch beside the hex text |
| Relation, File, Files, Formula | as before | none | see [collections.md](collections.md) and [formula_field.md](formula_field.md) |
| Auto-number | whole number | Plain `1, 2, 3`, Padded `0001, 0002` | filled in by the server (below) |
| Created time, Updated time | not stored | Date and time `2026-11-07 14:30`, Date `2026-11-07` | read from the record, in UTC |

**Auto-number.** Each new record gets the next number. Creating the field numbers the records already there, in the order they were made. A number is never used again, even after its record is deleted (the next number is kept on the field), and an auto-number field cannot be changed to another type (delete it and add a new one). A Collection copy keeps the numbers.

**Created and updated time.** Nothing is stored; the server reads them from the record's timestamps when it sends the Collection. The updated time moves whenever a record is saved through the API.

**Choices.** A select has 1 to 30 choices of 1 to 40 characters, tidied like task tags (trimmed, no blanks, no repeats ignoring case). Taking a choice off the list clears it from the records that used it (a multi select keeps its other choices).

**Format, not value.** Changing a field's format never changes its values, so it is allowed while the field has values. Changing the data type still needs the values cleared first. A type change without a new format goes back to the new type's default. The default format is stored as none.

Left out on purpose (Alex, 2026-11-07): credit card, CVV, password and VIN. A Collection should not store card numbers or passwords, and VIN is not wanted. The 2026-10-19 draft of this task had a VIN type; it is gone.

Summary row: Money, Mileage and Percent columns get the same Sum/Average/Min/Max/Count menu as numbers, and the result is written in the field's format (a Money sum in euros reads `€1,250.50`).

## API and models
- `FieldType` (`backend/app/models/field_type.rb`) is the one place that says what each type stores (`valid?`), how typed or imported text is read into the plain value (`normalize`), which formats it has (`formats`) and how a value reads in a format (`display`). `frontend/src/data/fieldType.ts` is its mirror (labels, `isValidValue`, `normalizeValue`, `formatValue`). Both run the same cases in `frontend/src/data/fieldType.vectors.json`.
- `table_fields` gains `display_format` (string, none for the default format), `options` (json, a select's choices) and `next_number` (integer, an auto-number's next number). Migrations `20261107010001_add_format_and_options_to_table_fields.rb` and `20261107010002_add_next_number_to_table_fields.rb`.
- `TableField`: `DATA_TYPES` is `FieldType::STORED`; `DERIVED_TYPES` (created and updated time) and `COMPUTED_TYPES` (formula) have no cells; `read_only?` is true for those and for auto-number. `display_format` must be one of the type's formats (422 otherwise); a select needs choices; other types keep none. `plain_value(raw)` is the way to read typed text into a stored value.
- `TableCell` reads every value into its plain form before checking it (`before_validation`), so every writer stores plain values, then validates with `FieldType.valid?`; relation, file, files and person are also checked against the database (a person must be able to open the collection's Space).
- `TableRecord#as_table_json(fields)` adds the created and updated times, and a `display` map (field id to text) for the values whose format changes how they read. Auto-numbers are assigned in `after_create`.
- Endpoints (unchanged paths): `GET /api/v1/tables/:id` now returns `display_format` and `options` on each field and `display` on each record. `POST /fields` and `PATCH /fields/:field_id` accept `display_format` and `options`. Writing a value to a formula, auto-number, created time or updated time field answers 422 ("... is filled in automatically and cannot be edited").
- Copying a Collection to another Space (`SpaceTransfer`) keeps each field's format, choices, unit and formula (the old copy dropped unit and formula, so a formula field could not be copied), keeps auto-numbers, and drops a person who cannot open the destination Space.
- Frontend: `components/editors/FieldCell.tsx` (the cell control for each type), `ChoiceList.tsx` (checkbox list shared with the Files field), `TableEditor.tsx` (field form, validation before saving, summary row), `data/location.ts` and `CollectionMap.tsx` (the map's details use each field's format), `data/tableSummary.ts`. The star control is `RatingInput` from `components/task-fields/TaskFieldInput.tsx`.

## Who can view and change
Anyone who can open the Collection sees its values and formats. Members who can edit the Space add, change and delete fields and write values through the same endpoints and checks as before (a viewer's write is rejected).

## Web entry points
`/documents/:id` for a Collection, then Add field, or a column's name, for the type, format and choices.

## Import
There is no import into Collections yet (only the Quip import). `docs/backlog/import-yaml-or-json-into-collection.md` and `csv-and-excel-import-export.md` should write cells through `TableCell` (or call `TableField#plain_value` first): an imported `$1,250.00` or `(555) 123-4567` is then stored plain and shown in the field's format, with the same checks as the editor and the API.

## Tests
- Backend: `backend/test/models/field_type_test.rb` (the shared cases), `table_field_types_test.rb` (formats, choices and pruning, people, auto-numbers, created and updated time), `tables_controller_test.rb` (API round trips, read-only fields, updated time), `services/space_transfer_test.rb` (copying fields, auto-numbers, people).
- Frontend: `data/fieldType.test.ts` (the shared cases, formats, messages), `data/tableSummary.test.ts`, `data/location.test.ts`, and component tests `FieldCell.test.tsx` and `TableEditor.test.tsx` (formatted cells, plain values sent, invalid values blocked, the format picker, choices, people, read-only cells, summaries).

## Known limits
- Formats are per field, not per person or locale. Euros read `€1,250.00`, not `1.250,00 €`. Phone numbers are formatted US style only.
- Percent is limited to 0 to 100 and money to two decimals; both were choices to keep the conservative rule (a growth rate over 100% or a price in thousandths does not fit).
- There are no free-form tags in Collections: a multi select uses the field's choices. Renaming a choice (by editing the list) clears the records that used the old text.
- The person menu lists direct Space members only, although the server also accepts people who can open the Space through a team (`docs/backlog/show-team-members-in-space-member-lists.md`). Moving a Collection to another Space leaves its person cells as they are.
- Date and time still uses the browser's date-time control (the `DatePicker` handles dates only).
- No sorting, filtering or grouping by field exists in the grid yet. Sums and averages are only offered for number-like columns.
- Created and updated times show in UTC. The updated time does not move when a cell is changed some way other than saving a record (deleting an uploaded file that a cell used, deleting a field).
- Contacts, location, country and time zone fields are the separate task `contact-location-and-link-fields`; the map still reads a text field of coordinates.

## History
- Implemented 2026-11-07 on branch `backlog/collection-field-types` (not merged, not deployed). It replaces the 2026-10-19 draft of the same branch, which had 15 validated types and no formats, selects, people, auto-numbers or times.
- Not implemented: free-form tags, contact and location types, import into Collections, sorting and filtering by field, locale-specific number and currency formats.
- Not verified: `rails db:migrate` (the two migrations and `schema.rb` were written by hand), `rails test`, `npm run lint`, `tsc -b`, the real Jest run and the browser (desktop and 375px, light and dark) did not run (no network, `node_modules`, database or gems). What did run: the shared vectors through plain Ruby (`field_type_test.rb` ran under Minitest with a stub test helper: 8 runs, 0 failures) and through the offline test shim (`fieldType.test.ts`), which agree; the other pure data tests, the Jest stand-in for the component tests, Ruby syntax checks, and a static parse and SCSS compile of the changed files. The model, controller and service tests were written but not run.
