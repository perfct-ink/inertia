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
