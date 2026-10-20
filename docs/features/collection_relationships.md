# Collection relationships (one-to-many)

## What it does
A relation field links a record to records in another Collection in the same Space. Two additions:
- **Many**: when adding or editing a relation field, "Links per record" can be "Many records". Its cell then holds a list, picked in a multi-select. "One record" (the default) behaves as before.
- **Reverse list**: a Collection automatically shows a read-only column for each relation field elsewhere in the Space that points at it, listing the linking records. If every Song links to an Album, the Albums collection shows each album's Songs without any setup. This works for one-record and many relation fields. A linking record is shown as its collection's first text value, or `#id`.

## API and models
- `GET /api/v1/tables/:id` returns `fields` (each with `allow_many`), `reverse_fields` (`id`, `name`, `source_table_id`; the name is the linking collection's title, plus the field name when it links here more than once) and `records` (each with `values` and `reverse`). A many cell's value is a sorted array of record ids.
- Writing a record: a many relation takes an array of ids (`[]` or `null` clears it); a list for a one-record relation is rejected with 422; ids from another collection return 404.
- `table_fields.allow_many`, table `table_cell_links` (`TableCellLink`: a cell and a linked record, unique together, foreign keys to both). `TableBackrefs` builds the reverse columns. A record that is linked from a many cell cannot be deleted (same as one-record links). `allow_many` is only for relation fields and cannot change once the field has values.

## Who can view and change
Same as Collections: members of the Space can read, writers can change.

## Web entry point
The Collection editor (`components/editors/TableEditor.tsx`); pure helpers in `data/collection.ts`.

## Tests
`backend/test/controllers/tables_controller_test.rb` (many relations, scoping, reverse lists), `frontend/src/data/collection.test.ts`, `components/editors/TableEditor.test.tsx`.

## Known limits
Reverse columns are read-only, and cannot be edited from the Album side. Lookup and rollup fields (count, sum across a link) are not built. Many cells show as a multi-select, which is awkward with very large related collections. The reverse list loads every linking record with the collection.

## History
- Implemented 2026-10-19 on branch `backlog/collection-one-to-many-relationships`; not merged or deployed.
- Not verified: `rails test`, migration 20261019000028 (diff `db/schema.rb`, which was edited by hand), Jest, lint, type-check, the screen in a browser. Only `ruby -c` and a static import/syntax check ran.
