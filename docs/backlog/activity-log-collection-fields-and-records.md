---
priority: p3
depends_on: [activity-log-per-item]
components: [backend, frontend]
---
# Activity log for Collection fields and records

## Objective

Give Collections the activity log that tasks, files, epics, initiatives and milestones have (`docs/features/activity_log.md`): who added, renamed or removed a field, and who added, changed or deleted a record, and when.

## Current state

A Collection is a document of type `table`, but its fields and records are edited through `/api/v1/tables/:id/...` and are separate records (`TableField`, `TableRecord`, `TableCell`), so editing them never saves the document and the document's own log shows only renames and moves. The Collection editor (`components/editors/TableEditor.tsx`) has no activity button for that reason.

## Requirements

- Log field create/rename/type change/delete and record create/update/delete against the Collection (the document is the subject), with the record's first value or a field name as the label.
- Decide how a record update with many cells reads (one entry per save, naming the fields that changed) and fold quick consecutive edits as content edits are folded.
- Add the `ActivityButton` to the Collection editor header, and to the uploaded-file viewer (`components/FileViewer.tsx`), whose renames and moves are already logged.

## Acceptance criteria

- A member sees the log from the Collection header; failed calls show an error.
- Tests cover the entries written for fields and records; the feature doc `activity_log.md` is updated and this file is removed.
