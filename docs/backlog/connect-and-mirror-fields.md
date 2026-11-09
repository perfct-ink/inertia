---
priority: p1
depends_on: [collection-field-types]
components: [frontend, backend]
branch: backlog/connect-and-mirror-fields
status: incomplete
---
# Connect / Mirror: link items across boards and show a field from the linked item

## Objective

Connect / Mirror: link items across boards and show a field from the linked item

## Requirements / notes

`relation` data type exists for tables.

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Connect / Mirror: link items across boards and show a field from the linked item works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Built and pushed on `backlog/connect-and-mirror-fields`, but not merged because the full checks could not run here (no `node_modules`, gems, database or network).

Done: the **Mirror** field type for Collections on top of the existing relation (Connect) field. A mirror reads through one relation field and shows one plain field of the linked Collection, read-only, in the Collection editor. Server: migration `20261101170001_add_mirror_to_table_fields.rb` (`mirror_relation_field_id`, `mirror_field_id`, cascade foreign keys), `TableField` validation, `TableMirrors` service, the tables controller (`mirrors` per record, 422 on writes), and `SpaceTransfer` copying mirrors (and now `formula`). Web: `data/mirror.ts`, `MirrorFieldForm.tsx`, `TableEditor.tsx`/`.scss`. Docs: `docs/features/connect_and_mirror_fields.md` and its README row. The branch has `origin/main` (2026-11-02) merged in.

Decision for Alex: Connect keeps its stored and displayed name "Relation" (renaming it would touch the same lines as other field-type work), and mirroring is one level deep (not a relation, mirror, formula or file). Custom fields on tasks are a separate task, so tasks cannot be connected or mirrored yet.

Checks that did not run: `npm run lint`, `tsc`, the full `npm test`, `rails test`, `rails db:migrate` (`schema.rb` was edited by hand, so diff it after migrating), RuboCop, and a browser check.
Checks that ran: the `data/mirror` tests through the offline shim; `MirrorFieldForm.test.tsx` with a sibling checkout's Jest; `TableEditor.test.tsx` and `TableEditor.mirror.test.tsx` with stand-ins for react-query, axios and the API base class (16 tests passed); Ruby syntax checks; the `TableMirrors` logic with plain stand-in objects; `/tmp/runner/all.sh`.

To verify and merge: `cd frontend && npm install && npm run lint && npm test`; `cd backend && rails db:migrate` (diff `db/schema.rb`), `rails test` (new: `table_mirror_test.rb`, `table_mirrors_controller_test.rb`, `space_transfer_mirror_test.rb`); then open a Collection at 375px and desktop, light and dark, add a relation field and a Mirror field through it, link a record and see the value appear. Merge hazards: `TableField`, `TableCell`, `tables_controller.rb`, `schema.rb`, `api/tables.ts`, `TableEditor.tsx` and its SCSS are shared with the open collection-field-types and one-to-many branches; the migration version is `20261101170001`. Remove this file when merged.

## Waiting on collection-field-types (2026-11-08)
The built Mirror field edits `TableField`, `TableCell`, `tables_controller.rb`, `api/tables.ts`, `TableEditor.tsx`/`.scss` and `schema.rb`, the same lines the p0 `collection-field-types` branch rewrites (field types moved to `field_type.rb` / `data/fieldType.ts`). `depends_on` now names it so this branch is picked up again, rebased on main, after that one merges; rebasing it now would only redo the work twice. Migration `20261101170001` is already allocated.
