---
branch: backlog/import-yaml-or-json-into-collection
status: incomplete
priority: p0
depends_on: []
components: [backend]
---
# Import YAML or JSON into a collection

## Objective

**Import YAML or JSON into a collection**: an array of objects becomes records; keys become fields, with types guessed from the values and editable before import

## Current state

Not present (Quip import only)

## Requirements / notes

Nested objects or arrays can become a related collection (`collection-one-to-many-relationships.md`). Can import into a new collection or append to an existing one, matching keys to field names. Pairs with CSV import and JSON/YAML export later.

## Context

Section "Collections: field types, relationships, import" of the retired shared backlog.

Requested by Alex on 2026-10-18: tables should be called **Collections**; collections need many field types (see Alex's [kriogenx0/jandi](https://github.com/kriogenx0/jandi)); multiple images should be an option; collections should show one-to-many relationships; and you should be able to import YAML or JSON into a collection.

**Today**: a table document (`doc_type: table`) has fields with `data_type` in `TableField::DATA_TYPES` = text, integer, number, boolean, date, datetime, relation. Each type is validated in `TableCell`. A relation cell points at one record in another table in the same Space (many-to-one); nothing shows the other direction. Import exists only for Quip.

**What jandi has** (`jandi.js`, `jandi-form.js`, checked 2026-10-18): validators for required, empty, person name, alphanumeric, email, phone, password, strict password, credit card (Visa, Mastercard, Amex, Discover, Diners Club, JCB) and CVV; formatters for number, number with commas, money, mileage, phone (plain and with parentheses), VIN and credit card; form field types name, username, email, month, year, card year and CVV. Each type pairs validation with formatting, which matches how Inertia already checks each `data_type`.

## Acceptance criteria

- Import YAML or JSON into a collection works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified
Built (see `docs/features/collection_import.md`): import into a new Collection (`CreateItem`, **Import Collection**) and append to an existing one (`TableEditor`, **Import**) with keys matched to field names, guessed types editable before importing, errors shown in the dialog, and rollback with row-level messages. Left out on purpose: nested objects or arrays as related Collections (the note says "can"; it needs `collection-one-to-many-relationships`, which is not built; follow-up `import-nested-values-as-related-collections.md`). Remove this file when the branch is verified and merged.

**Field types branch.** `origin/backlog/collection-field-types` (validated types and formats) is being reworked at the same time and was not merged into this branch. The import was written to pick its types up when it lands: the type list is `TableField::DATA_TYPES` less `CollectionImport::UNIMPORTABLE` and the select types, and every value is checked and saved through `TableCell`, so new types appear in the dialog and are normalized on save without a change to the import. After that merge:
1. Check `CollectionImport::UNIMPORTABLE` still names every linked, automatic, derived and computed type there (it already names `person`, `auto_number`, `created_time`, `updated_time`).
2. `CollectionImport::Fit#call` runs `TableCell#valid_value` (private) on an unsaved cell; confirm that method still exists and needs no database for the basic types.
3. Replace `importTypeLabel` in `data/collectionImport.ts` with `typeLabel` from `data/fieldType.ts`.
4. Drop `cell_value`'s text conversion if `FieldType.normalize("text", ...)` covers numbers and booleans.

Checks that ran (offline): the pure parts of `CollectionImport` (`parse`, `match_fields`, `guess_type`, `creatable_types`) with `ruby` and a stub; `ruby -c` on the new Ruby; the offline runner (`/tmp/runner/all.sh`; its result is in the commit message).

Checks that did not run (no network, `node_modules`, database or bundle):
- `cd backend && bundle install && rails db:migrate` then diff `db/schema.rb` (no migration was added, so it should not change), and `rails test` (new: `test/services/collection_import_test.rb`, `test/controllers/collection_imports_controller_test.rb`). The guess runs `TableCell#valid_value` on unsaved cells, and the controller relies on `ActiveRecord::Base.transaction` rolling back a new Collection; neither was tried against a real database.
- `cd frontend && npm install && npm run lint && npx tsc -b && npm test` (new and changed tests: `data/collectionImport.test.ts`, `ImportCollection.test.tsx`, `CreateItem.test.tsx`, `TableEditor.test.tsx`).
- A browser look at 375px and desktop, light and dark: open **Import Collection** on a folder and **Import** on a Collection; paste `[{"name":"Ada","age":36,"born":"1990-01-05"}]`, check the guessed types (text, integer, date), change one, leave one out, import; append the same text and confirm matching by name (try `Name` against `name`); paste a list with a bad value and confirm the dialog names the row and nothing is imported; try YAML and a file.
