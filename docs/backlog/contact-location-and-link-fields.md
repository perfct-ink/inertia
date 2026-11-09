---
priority: p1
depends_on: [collection-field-types]
branch: backlog/contact-location-and-link-fields
status: incomplete
---
# Files, link, email, phone, location, country, world clock

## Objective

Files, link, email, phone, location, country, world clock

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Files, link, email, phone, location, country, world clock works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Waiting on collection-field-types (2026-11-08)
Partial: only the backend half exists (`location`, `country` and `timezone` validated in `FieldType`, with examples); the type picker entries, country and time zone selects and the world clock display are not built. Email, phone and link now ship with `collection-field-types` (`docs/features/collection_field_types.md`), which also reworked `field_type.rb`, `data/fieldType.ts`, `TableEditor.tsx` and `api/tables.ts`. This branch is stacked on the old 2026-10-19 commit of that work, so it is rebased and finished after `collection-field-types` merges: its three types become entries in `FieldType`, `FIELD_TYPES` and `fieldType.vectors.json`, and the frontend half is built then. `depends_on` names it so the work is picked up in that order.
