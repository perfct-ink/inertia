---
priority: p3
depends_on: []
---
# Import tasks from a CSV or Excel file

## Objective

Add many tasks to a Space at once from a CSV or Excel (.xlsx) file, with the same column-mapping dialog Collections use.

## Context

Split off `csv-and-excel-import-export.md`, which built export for Collections and tasks and import into a Collection (`docs/features/csv_and_excel.md`). Task import was left out because a task belongs to a document and folder, so it needs product decisions.

## Requirements / notes

- Reuse `util/csv.ts`, `util/xlsx.ts`, `util/download.ts` (`readTableFile`) and the dialog in `components/editors/CollectionCsv.tsx` for reading the file and mapping columns; the task export columns (`data/taskCsv.ts`) are the columns an import should read back (Title, Type, Status, Priority, Assignees by name or email, Start date, Due date, Epic, Sprint, Milestone, Estimate, Story points, Description).
- Decide where the new tasks live (the Tasks page backlog with no document, a chosen folder, or a chosen document) and what happens to an Epic, Sprint or Milestone title that does not exist yet (create it, or leave it blank with a warning).
- A server endpoint that validates every row in one transaction, like `TableCsvImport`, with the same limits (1,000 rows).

## Acceptance criteria

- A member of the Space can import tasks from CSV or Excel from the Tasks page; bad rows are listed by spreadsheet row number and nothing is created until they are fixed.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; the existing feature doc `docs/features/csv_and_excel.md` is updated and this file is removed.
