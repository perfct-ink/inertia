---
priority: p3
depends_on: [backlinks-each-document-lists-which-documents-link-to]
components: [frontend]
---
# Backlinks on sheets, Collections and uploaded files

## Objective

Show the "Linked from" panel on every kind of file, not just documents.

## Requirements / notes

`GET /api/v1/documents/:id/backlinks` already answers for any file type, because a link to a sheet, a Collection or an uploaded file is an ordinary `/documents/<id>` address. Only `view/document/DocumentScreen.tsx` shows `DocumentBacklinks`; the sheet, Collection and file screens (`SpreadsheetEditor`, `TableEditor`, `FileViewer`) do not. Place the panel where it does not fight each screen's own scrolling and layout, and check it at 375px.

Whether links written inside a sheet or a Collection should count as backlinks is a separate question for Alex and is not part of this task.

## Acceptance criteria

- Opening a sheet, a Collection or an uploaded file that other documents link to shows "Linked from N documents" with working links; nothing shows when nothing links to it.
- Responsive at 375px, light and dark.
- Tests cover the new placement; `docs/features/document_backlinks.md` is updated and this file is removed.
