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

## File and Files fields
A field of type **File** holds one uploaded file item of the Space, and **Files** holds up to 50 (for several images). In the grid a File cell is a menu of the Space's uploaded files (with a "No file" choice); a Files cell is a "Choose files" list of checkboxes. Chosen images show as thumbnails in the cell, other files by name. The cell value is the file item's id, or a list of ids (`TableCell` checks they are uploaded file items in the collection's Space, no duplicates; 422 otherwise). Deleting a file item removes it from any cell that held it (an emptied cell is cleared). Upload the files first (see [uploaded_files.md](uploaded_files.md)); there is no upload inside the cell, and no gallery when a cell is opened. Code: `FileCell.tsx`, `TableCell`, `Document#remove_from_collection_cells`; tests `relational_table_test.rb`, `FileCell.test.tsx`.
- Added 2026-10-19 on branch `backlog/collection-image-and-file-fields`, stacked on `backlog/file-previews-and-gallery` (it needs the uploaded-file items). Not merged. Not verified: Rails tests, lint, type-check, the component test and the browser did not run (no database, no node_modules). Import (JSON/YAML) does not create file fields.
