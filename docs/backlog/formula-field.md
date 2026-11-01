---
priority: p1
depends_on: []
branch: backlog/formula-field
---
# Formula field

## Objective

Formula field

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Formula field works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built and documented in `docs/features/formula_field.md`; this file stays until the branch is merged. Tasks have no custom fields yet (`custom-fields-on-tasks.md`), so the formula field is built on the one place custom fields exist today, Collections (`table_fields`); formulas on tasks are `formula-field-on-tasks.md`, and server-side results are `formula-results-in-the-api.md`.

Done: `table_fields.formula` column and migration `20261101120001`, `schema.rb` edited by hand (check it against a real dump), `TableField` validation and rename rewriting, record writes to a formula field rejected, `formula` in the table API; the pure language in `frontend/src/util/expression.ts` and `frontend/src/data/formula.ts`; the result cell, header and formula box in the Collection editor; tests for all of it.

Decisions for Alex: (1) results are computed in the browser only, to keep one implementation of the language (the API does not return them); (2) `-2^2` is 4 and `^` runs left to right, as in Excel, since Inertia's sheets are Excel-like; (3) a field is referenced by exact name in braces, and renames rewrite formulas on the server.

Ran: `/tmp/runner/all.sh` (static parse of the changed TypeScript and SCSS, `ruby -c` on the changed Ruby, and the offline-shim run of `util/expression.test.ts` and `data/formula.test.ts`: 34 tests passed). Not run (no network, `node_modules`, gems or database): `npm run lint`, the TypeScript type-check, `npm test` (the new `TableEditor.test.tsx` and `FormulaInput.test.tsx` cases have never executed), `rails test`, `rails db:migrate`, and a browser check.

To verify and merge:
1. `cd frontend && npm install && npx tsc --noEmit && npm run lint && npm test`
2. `cd backend && bundle install && rails db:migrate`, then diff `db/schema.rb` against the hand edit (one `t.text "formula"` on `table_fields` after `updated_at`, version `2026_11_01_120001`), then `rails test`.
3. Open a Collection in the browser at 375px and desktop, light and dark: add a Formula field (`{A} * {B}`), check the result updates while typing in another cell, a bad formula is explained under the box, `{Missing}` shows `#REF!` with its reason, the header shows the expression, and renaming a used field keeps the formula working.

Merge hazard: `backlog/collection-field-types` also edits `TableEditor.tsx` (the type list, the input rendering, `FIELD_TYPES`) and `api/tables.ts` (`DataType`). Expect textual conflicts there. After merging both, add `formula` to its `FIELD_TYPES`/type picker (`FieldDataType` here is `DataType | 'formula'`) so indexing `FIELD_TYPES[field.data_type]` still type-checks; `TableCell` already rejects formula values in either version. `table_field.rb` and `table_cell.rb` do not conflict textually.
