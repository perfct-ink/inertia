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

## Field types (branch `backlog/collection-field-types`, not merged)
Beyond text, integer, number, boolean, date, datetime and relation, a field can be long text, email, phone, URL, username, person name, alphanumeric code, VIN, color, money, mileage, percent, rating (1 to 5), month (1 to 12) or year. The rule for each lives in `FieldType` (`backend/app/models/field_type.rb`); `TableField::DATA_TYPES` and `TableCell` use it, so the API and the editor agree. The frontend mirror is `frontend/src/data/fieldType.ts` (label, input kind, min/max, display format). Tests: `field_type_test.rb`, `fieldType.test.ts`.
- Not built: single select, multi select/tags, person (Space member), created/updated time and auto-number (they need options or system values), and the display formatters are not yet used in the grid (inputs show the raw value). Credit card, CVV and password are left out on purpose.
- Not verified: Rails tests, migration (none needed), lint, type-check, frontend tests and the browser did not run (no database, no node_modules); only `ruby -c` passed.
