---
priority: p2
depends_on: []
branch: backlog/csv-and-excel-import-export
status: incomplete
---
# Export to CSV / Excel; import from CSV / Excel

## Objective

Export to CSV / Excel; import from CSV / Excel

## Context

Section "Dashboards and reporting" of the retired shared backlog.

## Acceptance criteria

- Export to CSV / Excel; import from CSV / Excel works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Progress (2026-11-09)

Built on branch `backlog/csv-and-excel-import-export`, squashed onto `origin/main` of that day. Feature doc: `docs/features/csv_and_excel.md`.

- Collections: **Export** menu (CSV or Excel) and **Import** dialog (CSV, TSV or `.xlsx`) with per-column mapping to existing or new fields, a pre-check that lists bad values by spreadsheet row, and `POST /api/v1/tables/:id/import` (`app/services/table_csv_import.rb`, all-or-nothing). Formula fields export their calculated value; formula and file fields are never imported into.
- Tasks page: **Export** (CSV or Excel) of the tasks the filters show, with the board's status names, assignees, priority, estimates.
- Excel with no new dependency: `util/zip.ts` and `util/xlsx.ts` write and read `.xlsx` themselves (decision below).
- Left out on purpose, as new backlog files: `import-tasks-from-csv-or-excel.md` and `spreadsheet-documents-excel-import-export.md` (the FortuneSheet saved shape could not be inspected offline).

### Decision for Alex

Excel (.xlsx) is read and written by about 480 lines of our own code (a stored ZIP writer, a ZIP reader that inflates with the browser's `DecompressionStream`, and a SpreadsheetML reader and writer) instead of adding SheetJS or ExcelJS, because the rules say no new dependency without asking. The conservative limits are: first worksheet only, no styles beyond a bold header, values not formulas on export, no `.xls`, and a browser without `DecompressionStream` (before Chrome 80, Safari 16.4, Firefox 113) is told to save as CSV. If you would rather depend on a library, only `util/zip.ts` and `util/xlsx.ts` change.

## Unverified

Nothing here has run against a database, `node_modules` or a browser (the working environment has no network, no Docker and no installed packages).

Ran (offline, stand-ins): `ruby -c` on every changed Ruby file; the Jest stand-in (`JEST_STUB_NET=1 /tmp/runner/jest.sh`) on `util/csv`, `util/zip`, `util/xlsx`, `data/collectionCsv`, `data/taskCsv`, `components/ExportMenu`, `components/ui/Menu`, `components/editors/CollectionCsv` (all pass); the static checks (parse, imports, sass). An `.xlsx` written by `buildXlsx` passes Python's `zipfile.testzip()`, an XML parser on every part, and `unzip -t`; a deflate-compressed workbook made by Python was read back by `parseXlsx` through Node's real `DecompressionStream`.

Not run: `rails db:migrate` (no migration, nothing to run), `rails test` (new `test/services/table_csv_import_test.rb` and `test/controllers/table_csv_import_api_test.rb`), `npm run lint`, `npx tsc -b`, the real Jest run (including `view/tasks/TasksScreen.test.tsx`, which needs `@dnd-kit` and was skipped by the stand-in, and `TableEditor.test.tsx`), the Swift build (`macos/` untouched), and every browser check.

To verify:

```bash
cd backend && rails test test/services/table_csv_import_test.rb test/controllers/table_csv_import_api_test.rb test/controllers/tables_controller_test.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser at 375px and desktop, light and dark:
1. Open a Collection with a text, an integer, a date and a formula field. **Export > CSV** and **Export > Excel**; open both in Excel (and Numbers or LibreOffice): accents intact, the header bold and frozen in the Excel file, a text value starting with `=` shown as text, the formula column holding numbers.
2. **Import** the CSV you just exported (Record ID and the formula column should default to "Don't import"), then an Excel file saved from Excel with date cells, a column of true/false and a new column (it should create the field with the guessed type), then a file with a bad value (the dialog should list `Row N, “Field”: ...` and keep Import off), and an old `.xls` file (message to save as `.xlsx`).
3. Tasks page: set a folder filter, then **Export > Excel**; the status column should show the board's own status names. With no task shown the button is off. The menu must not run past the right edge at 375px.
4. A viewer of the Space opening a Collection: Export works, an import attempt answers 403 and the dialog shows the error.
