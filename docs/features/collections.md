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

## Number units and column summaries
An integer or number field can have a **unit** ("kg", "$", "%", up to 20 characters; the field form shows "Unit (optional)" for number types only). The unit shows beside the type in the column header, and `$ € £ ¥` lead the value in summaries while other units follow it. A **Summary** row at the bottom of the grid has a menu under each number column (No summary, Sum, Average, Min, Max, Count) and shows the result in the unit; it ignores blank cells, rounds to two decimals, and is chosen per visit (not saved). `table_fields.unit` (nullable string; rejected on non-number fields, 422). Code: `data/tableSummary.ts` (`columnSummary`, `withUnit`; stand-in runner: pass), `TableEditor.tsx`, `TablesController`. Tests: `relational_table_test.rb`, `tableSummary.test.ts`, `TableEditor.test.tsx`.
- Limits: summaries cover the records on screen only (all of them, there is no paging yet) and are not saved with the collection; values in cells are not formatted with the unit, only the summary and header are; types added on `backlog/collection-field-types` (money, percent...) are not wired to summaries.
- Added 2026-10-19 on branch `backlog/number-fields-with-units-and-summaries`, not merged. Not verified: migration, Rails tests, lint, type-check, the component tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand.
