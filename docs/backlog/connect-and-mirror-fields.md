---
priority: p1
depends_on: []
components: [frontend, backend]
---
# Lookup fields: a Collection shows a field from the linked record

## Objective

Connect / Mirror: link items across boards and show a field from the linked item

## Requirements / notes

`relation` data type exists for tables.

**Collections only** (Alex, 2026-11-09 groom): a Collection gets a **lookup** field that shows a chosen field from the record a relation field links to (e.g. a Song shows its Album's year). Read-only, updates when the linked record changes. Tasks are left out (they have no custom fields yet).

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Connect / Mirror: link items across boards and show a field from the linked item works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Not merged (2026-11-09)

`backlog/connect-and-mirror-fields` was waiting on the collection field types, which merged on 2026-11-09. It now conflicts with main in nine places (`TableField`, `TableCell`, `TableEditor`, the schema). Rebuild the Mirror field on main as a `FieldType` entry rather than merging the old branch.
