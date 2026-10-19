# Collections (naming)

## What it does
Users see table documents as **Collections**, never "Tables" (see `docs/rules/product.md`). The code, API paths and database keep `table` (`doc_type: table`, `TableField`, `TableCell`, `/api/v1/tables`).

User-visible text now says Collection in: the new-item buttons and menus (`DOC_TYPE_LABELS` in `data/document.ts`, the sidebar button and "Untitled Collection" default title, the folder context menu), the folder overview heading ("Documents, Sheets & Collections"), the Projects empty state, the collection editor (title field, "Related collection", field-form hints), API error and validation messages for collections, and the public marketing pages and meta description.

"Table" is kept where it means a table inside a rich-text document ("Insert table", the Quip table converter) because that is a different thing.

## Who can view and change
Naming only; permissions are unchanged.

## Tests
`frontend/src/data/document.test.ts` checks the label. No test covers the other strings.

## Known limits
Field types, one-to-many relationships, multiple images and YAML or JSON import are separate backlog tasks (`docs/backlog/collection-*.md`, `import-yaml-or-json-into-collection.md`). Rails model names are not yet translated in `backend/config/locales/en.yml`. A search found no remaining user-facing "Table" text in `frontend/src`, `backend/app` or the marketing views, but screens built later could reintroduce it.

## History
- Implemented 2026-10-19.
- Not verified: lint, type-check, the Jest and Rails tests and the screens were not run (no dependencies installed, no network). Only Ruby syntax was checked.

## Import JSON or YAML
"Import JSON/YAML" next to the New buttons (`components/ImportCollection.tsx`) opens a dialog: upload a `.json`/`.yaml` file or paste text (an array of objects, or an object holding a single array), press "Check fields" to see the guessed field types and any skipped keys, change types if needed, name the collection and Import; it opens the new collection. Types are guessed per key from all values: boolean, integer, number, datetime or date (ISO strings), else text. Nested objects and arrays are skipped and listed, not flattened. Numeric strings are coerced into integer/number fields; any other invalid value fails the whole import (nothing is created, the error shows).
- API: `POST /api/v1/collection_imports/preview` `{ text }` → `{ fields, row_count, skipped_keys }`; `POST /api/v1/collection_imports` `{ text, fields?, folder_id + title | document_id }` creates a collection or appends to one (keys matched to existing field names; an existing field keeps its own type). At most 5,000 rows. Code: `CollectionImport`, `CollectionImportsController`, `api/collectionImport.ts`.
- Tests: `collection_import_test.rb`, `collection_imports_controller_test.rb`, `ImportCollection.test.tsx`, `data/importFields.test.ts`.
- Not built: the dialog only creates new collections (the API appends, but there is no append UI), nested objects as related collections (`docs/backlog/collection-one-to-many-relationships.md`), CSV, JSON/YAML export, and the field types of `collection-field-types` are not offered in the type picker.
- Added 2026-10-19 on branch `backlog/import-yaml-or-json-into-collection`, not merged. Not verified: Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules).
