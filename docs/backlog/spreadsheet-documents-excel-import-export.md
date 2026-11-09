---
priority: p3
depends_on: []
---
# Export and import spreadsheet documents as Excel or CSV

## Objective

A Spreadsheet document can be downloaded as an Excel (.xlsx) or CSV file, and a CSV or Excel file can be imported into a Spreadsheet document.

## Context

Split off `csv-and-excel-import-export.md`, which built CSV and Excel export for Collections and tasks and import into a Collection (`docs/features/csv_and_excel.md`). Spreadsheet documents (`components/editors/SpreadsheetEditor.tsx`, the FortuneSheet `Workbook`) were left out: the saved shape of a sheet (`content.sheets`, FortuneSheet `celldata` or `data` cells with `v`, `m`, `ct` and `f`) could not be inspected where that work was done (no `node_modules`), so the conversion would have been written blind.

## Requirements / notes

- Reuse `util/xlsx.ts` (`buildXlsx` writes one sheet of text, numbers and booleans; extend it to several sheets and to formulas with a cached value) and `util/zip.ts`, and `ExportMenu` for the button.
- Export every sheet of the document as a worksheet of an .xlsx, or the active sheet as CSV. Keep a cell's displayed text for dates and formats, and its formula where the sheet has one.
- Import into a new Spreadsheet document, or replace the open one after a confirmation. Read the first sheet, or all sheets of an .xlsx (`parseXlsx` returns the first only today).
- Check the real saved shape of `content.sheets` (both the `celldata` and the `data` forms FortuneSheet produces) before writing the conversion, and test with a sheet saved by the editor.

## Acceptance criteria

- A member of the Space can download a Spreadsheet document as .xlsx or .csv and import a .csv or .xlsx file into one, in the web app.
- Failed API calls show an error to the user.
- Tests cover the conversion; the existing feature doc `docs/features/csv_and_excel.md` is updated and this file is removed.
