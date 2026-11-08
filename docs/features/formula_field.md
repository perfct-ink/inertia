# Formula field

## What it does
A Collection can have a **Formula** field: a column whose value is worked out from the record's other fields instead of being typed in. Add or edit a field, choose the data type Formula and write the expression, for example `{Price} * {Quantity}` or `IF({Done}, "shipped", "open")`. Every record then shows the result in that column, and the result updates as soon as another value in the row is edited, before the row is saved. A formula field has no cell to edit and is never sent when a record is saved.

How formulas read:
- A field is written as `{Field name}` (exact name, spaces allowed). The field form has an "Insert field" picker that adds `{Name}` for you. A blank field counts as 0, empty text or FALSE.
- Numbers, `"text"` (a doubled quote `""` inside means one quote), `TRUE` and `FALSE`.
- Operators with Excel's precedence, tightest first: unary minus, `^` (left to right, so `-2^2` is 4 and `2^3^2` is 64), `* /`, `+ -`, `&` (join text), then `= <> != < <= > >=`. Text compares ignoring case.
- Functions, not case sensitive: `IF` (only evaluates the branch it uses), `IFERROR`, `AND`, `OR`, `NOT`, `ISBLANK`, `ABS`, `ROUND` (half away from zero, negative digits allowed), `FLOOR`, `CEILING`, `MOD`, `SQRT`, `SUM`, `AVERAGE`, `MIN`, `MAX` (these skip blank values), `CONCAT`, `LEN`, `UPPER`, `LOWER`, `TRIM`, `LEFT`, `RIGHT`, `TODAY`, `DAYS(end, start)`, `DATEADD(date, days)`, `YEAR`, `MONTH`, `DAY`. Dates are `YYYY-MM-DD` text in UTC, the same as Date fields; a longer date-time is cut to its date.
- A formula can use other formula fields, in any order. A loop shows `#CIRC!`, and the field form refuses to save a formula that would make one.
- Floating point noise is rounded away (`0.1 + 0.2` is `0.3`).

When something is wrong the cell shows a short code with the reason under it, in words (so it does not depend on hovering): `#DIV/0!`, `#VALUE!` (for example text used as a number), `#REF!` (a field that does not exist, such as one that was deleted), `#NAME?` (an unknown function or a bare word), `#NUM!`, `#CIRC!` or `#ERROR!` (the formula does not parse). An error in one field carries into formulas that use it, unless wrapped in `IFERROR`.

In the field form the formula is checked as it is written. A problem (a syntax error, an unknown field or function, the field using itself, a loop) is shown under the box once you leave it, and the form will not save until it is fixed. The column header shows the expression under the data type (the full text is in its tooltip).

Renaming a field rewrites `{Old name}` to `{New name}` in the other formula fields of the same Collection. Deleting a field leaves formulas that used it showing `#REF!`. Changing a formula field to another type drops its expression.

## API and models
`table_fields.formula` (text, migration `20261101120001_add_formula_to_table_fields.rb`) holds the expression. `TableField::COMPUTED_TYPES = ["formula"]`; for these the formula is required, at most `MAX_FORMULA_LENGTH` (1000) characters, and may not contain the field's own `{name}`. For any other type the formula is cleared on save. A computed field never has `table_cells`: `TableCell` rejects values for it, and `PATCH`/`POST /api/v1/tables/:id/records` answer 422 ("<name> is calculated from its formula and cannot be edited") if a request includes one.

`GET /api/v1/tables/:id` and the field endpoints (`POST /fields`, `PATCH /fields/:field_id`) now include `formula` in each field. The result of a formula is not in the API: the server stores the expression only, and the web app works the result out.

The language lives in two pure modules so both the browser and later task fields can share it: `frontend/src/util/expression.ts` (parser, evaluator and function table) and `frontend/src/data/formula.ts` (`computeFormulas` for a record's formula fields, `checkFormula` for the field form, `formatResult`).

## Who can view and change
Anyone who can open the Collection sees the results. Members who can edit the Space add, change and delete formula fields through the same endpoints and checks as every other field (a viewer's write is rejected).

## Web entry points
The Collection editor, `frontend/src/components/editors/TableEditor.tsx` (the result cell and the header), with the formula box in `frontend/src/components/editors/FormulaInput.tsx`.

## Tests
- `frontend/src/util/expression.test.ts` and `frontend/src/data/formula.test.ts` (pure; run offline with the shim).
- `frontend/src/components/editors/TableEditor.test.tsx` and `FormulaInput.test.tsx` (results, live recalculation, errors, creating, editing and rejecting a formula field).
- `backend/test/models/relational_table_test.rb` and `backend/test/controllers/tables_controller_test.rb` (validation, no values, rename rewriting, clearing on type change, record writes rejected).

## Known limits
- Results are computed in the browser only. The API, any export and sorting or filtering on the server do not see them (see `docs/backlog/formula-results-in-the-api.md`).
- Formulas are for Collections only. Tasks have no custom fields yet (`docs/backlog/formula-field-on-tasks.md`).
- References are by exact field name and case sensitive. A formula inside a quoted text that happens to contain `{Old name}` is rewritten on a rename too.
- A field whose name contains `}` cannot be referred to.
- Relation fields give the linked record's id, not its label. There are no functions that look inside related records.
- Dates are text, so `{Due} - TODAY()` is `#VALUE!`; use `DAYS({Due}, TODAY())`.
- A text, number or other field that already has values cannot be turned into a formula until its values are cleared (the existing rule for any type change).
- Deleting a field does not warn that formulas use it.
- The field types of [collection_field_types.md](collection_field_types.md) work in formulas as their plain values: money, mileage, percent, rating, month, year and auto-number are numbers, a created or updated time is its ISO text (so `DAYS({Due}, {Created})` works), a person is the member's id and a multi select counts as blank. Results are not written in the field's format.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/formula-field`).
- Not implemented: results on the server or API, formulas on tasks, aggregates across records or related records, a formula builder UI beyond the field picker, warning before deleting a field that formulas use.
- Not verified: lint, the TypeScript type-check, the Jest tests, the Rails tests, `rails db:migrate` and the screens were not run (no `node_modules`, gems, database or network). What did run: the `util/expression` and `data/formula` tests through a small offline test shim, Ruby syntax checks of the changed Ruby files, and a static parse of the changed TypeScript and SCSS.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.
