# Collections (naming)

## What it does
Users see table documents as **Collections**, never "Tables" (see `docs/project/product.md`). The code, API paths and database keep `table` (`doc_type: table`, `TableField`, `TableCell`, `/api/v1/tables`).

User-visible text now says Collection in: the new-item buttons and menus (`DOC_TYPE_LABELS` in `data/document.ts`, the sidebar button and "Untitled Collection" default title, the folder context menu), the folder overview heading ("Documents, Sheets & Collections"), the Projects empty state, the collection editor (title field, "Related collection", field-form hints), API error and validation messages for collections, and the public marketing pages and meta description.

## Editor layout
A Collection always opens as a table (`components/editors/TableEditor.tsx`), even before it has fields: the header row has Record ID, a **+** column button ("New field") and Actions, and the body says "Add a field to start" until the first field exists. The add-record row appears once there is a field. "Add field" in the header, the **+** column button and clicking a column's name all open the same field form in a modal (the shared `Modal`): Field name, Data type, the related Collection or formula when needed, Cancel and Create field (Save field when editing). Errors from saving a field show inside the modal. Covered by `TableEditor.test.tsx`; browser-checked 2026-11-03.

"Table" is kept where it means a table inside a rich-text document ("Insert table", the Quip table converter) because that is a different thing.

## Who can view and change
Naming only; permissions are unchanged.

## Tests
`frontend/src/data/document.test.ts` checks the label. No test covers the other strings.

## Known limits
Field types, one-to-many relationships, multiple images and YAML or JSON import are separate backlog tasks (`docs/backlog/collection-*.md`, `import-yaml-or-json-into-collection.md`). Rails model names are not yet translated in `backend/config/locales/en.yml`. A search found no remaining user-facing "Table" text in `frontend/src`, `backend/app` or the marketing views, but screens built later could reintroduce it.

## History
- 2026-11-03: a Collection always shows its table, and adding or editing a field opens a modal instead of an inline form.
- Implemented 2026-10-19.
- Not verified: lint, type-check, the Jest and Rails tests and the screens were not run (no dependencies installed, no network). Only Ruby syntax was checked.

## File and Files fields
A field of type **File** holds one uploaded file item of the Space, and **Files** holds up to 50 (for several images). In the grid a File cell is a menu of the Space's uploaded files (with a "No file" choice); a Files cell is a "Choose files" list of checkboxes. Chosen images show as thumbnails in the cell, other files by name. The cell value is the file item's id, or a list of ids (`TableCell` checks they are uploaded file items in the collection's Space, no duplicates; 422 otherwise). Deleting a file item removes it from any cell that held it (an emptied cell is cleared). Upload the files first (see [uploaded_files.md](uploaded_files.md)); there is no upload inside the cell, and no gallery when a cell is opened. Code: `FileCell.tsx`, `TableCell`, `Document#remove_from_collection_cells`; tests `relational_table_test.rb`, `FileCell.test.tsx`.
- Added 2026-10-19 on branch `backlog/collection-image-and-file-fields`, stacked on `backlog/file-previews-and-gallery` (it needs the uploaded-file items). Not merged. Not verified: Rails tests, lint, type-check, the component test and the browser did not run (no database, no node_modules). Import (JSON/YAML) does not create file fields.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
## Number units and column summaries
An integer or number field can have a **unit** ("kg", "$", "%", up to 20 characters; the field form shows "Unit (optional)" for number types only). The unit shows beside the type in the column header, and `$ € £ ¥` lead the value in summaries while other units follow it. A **Summary** row at the bottom of the grid has a menu under each number column (No summary, Sum, Average, Min, Max, Count) and shows the result in the unit; it ignores blank cells, rounds to two decimals, and is chosen per visit (not saved). `table_fields.unit` (nullable string; rejected on non-number fields, 422). Code: `data/tableSummary.ts` (`columnSummary`, `withUnit`; stand-in runner: pass), `TableEditor.tsx`, `TablesController`. Tests: `relational_table_test.rb`, `tableSummary.test.ts`, `TableEditor.test.tsx`.
- Limits: summaries cover the records on screen only (all of them, there is no paging yet) and are not saved with the collection; values in cells are not formatted with the unit, only the summary and header are; types added on `backlog/collection-field-types` (money, percent...) are not wired to summaries.
- Added 2026-10-19 on branch `backlog/number-fields-with-units-and-summaries`, not merged. Not verified: migration, Rails tests, lint, type-check, the component tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand.

- Merged to main 2026-11-05 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
