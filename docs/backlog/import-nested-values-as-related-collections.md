---
priority: p2
depends_on: [collection-one-to-many-relationships]
components: [backend, frontend]
---
# Import nested values as related collections

## Objective

When a JSON or YAML import (see `docs/features/collection_import.md`) finds a key whose values are objects or lists, offer to create a related Collection for it instead of leaving the key out: each nested object becomes a record of the related Collection, linked to the record it came from.

## Current state

The import leaves nested keys out and lists them in the dialog ("Left out because they hold nested objects or lists"). One-to-many relationships do not exist yet, and a relation field holds one record of another Collection.

## Requirements / notes

- A key holding a list of objects becomes a related Collection (named after the key, in the same folder) with a field per nested key and a link back to the parent record; a key holding a single object does the same with one record per parent.
- The dialog shows each nested key with a choice: related Collection, or leave out (the default, as today). A list of plain values (such as tags) could become a multi-value field once the field types support one; decide with the field types.
- Use `CollectionImport` and `TableCell` for the nested records so the same type rules apply; nest at most a few levels and say so.
- Keep the 1,000-row limit across the parent and all related records, and keep the all-or-nothing rollback.

## Acceptance criteria

- Importing `[{"name": "Ada", "songs": [{"title": "A"}, {"title": "B"}]}]` can produce a Collection with Ada and a related Collection with two songs linked to her.
- Choosing to leave a nested key out behaves as it does today.
- Tests cover it, `docs/features/collection_import.md` is updated and this file is removed.
