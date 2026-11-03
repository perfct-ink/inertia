# Formula field

## What it does
A Collection can have a **Formula** field: a column whose value is worked out from the record's other fields instead of being typed in. Add or edit a field, choose the data type Formula and write the expression, for example `{Price} * {Quantity}` or `IF({Done}, "shipped", "open")`. Every record then shows the result in that column, and the result updates as soon as another value in the row is edited, before the row is saved. A formula field has no cell to edit and is never sent when a record is saved. The server works out the same result for every saved record and sends it with the record (`formula_results`), so the API, and anything built on it, sees the values the web app shows.

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

`GET /api/v1/tables/:id` and the field endpoints (`POST /fields`, `PATCH /fields/:field_id`) now include `formula` in each field. **Results.** Each record in `GET /api/v1/tables/:id` (and in the answer to every field and record write, which sends the whole Collection) has `formula_results`: an object keyed by formula field id (as text) holding `{ "value": 10 }` or `{ "error": "#DIV/0!", "message": "Cannot divide by zero" }`, the same shapes and error codes as the web app. The value is a number (whole numbers are plain integers), text, `true`, `false` or `null` for a blank. A Collection with no formula fields sends `{}`. Nothing is stored: the server works the results out for each response from the saved values, and the Collection's formulas are parsed once however many records there are. `TODAY()` is the server's date in UTC.

**The browser keeps computing live.** The editor shows its own result for a row being edited, so a typed value updates the formula column before the row is saved; the server's `formula_results` is the saved value (`TableRecord.formula_results` in `frontend/src/api/tables.ts`) and the editor does not read it. Both come from the same language, held to the same answers by shared test cases (below).

**One language, two implementations.** The language lives in pure modules with no framework in them:
- Web: `frontend/src/util/expression.ts` (parser, evaluator and function table) and `frontend/src/data/formula.ts` (`computeFormulas` for a record's formula fields, `checkFormula` for the field form, `formatResult`).
- Server: `backend/app/services/formula/`: `Formula::Parser` (text to tree, with `references`), `Formula::Evaluator`, `Formula::Functions` (the function table), `Formula::Values` (conversion, comparison, number and date rules), `Formula::Error` and `Formula::Results` (every formula field of a record, with loops and errors per field). `TableRecord#as_table_json` calls it and `TablesController#show` sends it.
- Shared test cases: `frontend/src/util/expression.vectors.json` holds about 450 formulas with the value or the error code and message each must give, 30 whole-record scenarios (formulas that use formulas, loops, every field type), the references of some formulas and the table of function names and argument counts. The web app's tests and the server's tests both read that file, so changing the language on one side only fails a test. To change the language, change both implementations and add cases to the JSON.

The server matches the browser where JavaScript is particular: text length and slicing count UTF-16 units (an emoji is 2), `LOWER` turns a final capital sigma into `ς`, spaces trimmed are JavaScript's, numbers read as text the way `String(number)` writes them (`1e+21`, `1e-7`), sums add one by one from the left, and positions in error messages are UTF-16 offsets. An unexpected failure while working out one formula (a bug, or one nested too deeply for the stack) gives `#ERROR!` ("The formula could not be worked out") for that field and is logged, rather than failing the whole request.

## Who can view and change
Anyone who can open the Collection sees the results. Members who can edit the Space add, change and delete formula fields through the same endpoints and checks as every other field (a viewer's write is rejected).

## Web entry points
The Collection editor, `frontend/src/components/editors/TableEditor.tsx` (the result cell and the header), with the formula box in `frontend/src/components/editors/FormulaInput.tsx`.

## Tests
- `frontend/src/util/expression.test.ts` and `frontend/src/data/formula.test.ts` (pure; run offline with the shim).
- `frontend/src/util/expression.vectors.test.ts` and `frontend/src/data/formula.vectors.test.ts` run the shared cases in `expression.vectors.json` against the web implementation; `backend/test/services/formula/vectors_test.rb` runs the same file against `Formula::*`. `backend/test/services/formula/results_test.rb` covers what is only the server's (database values, files lists, huge integers, unexpected failures, one parse per formula).
- `frontend/src/components/editors/TableEditor.test.tsx` and `FormulaInput.test.tsx` (results, live recalculation, errors, creating, editing and rejecting a formula field).
- `backend/test/models/relational_table_test.rb` and `backend/test/controllers/tables_controller_test.rb` (validation, no values, rename rewriting, clearing on type change, record writes rejected, `formula_results` after create, update, delete of a field, errors and loops).

## Known limits
- The server's results are for saved values only; it knows nothing of a row being edited. A Collection has no export, import, or server-side sort or filter yet (`docs/backlog/csv-and-excel-import-export.md`, `docs/backlog/import-yaml-or-json-into-collection.md`); when they arrive they should read `Formula::Results` rather than work formulas out again.
- A formula's result is not stored, so it is worked out on every read of the Collection (measured once on a laptop: about 70 ms for 5,000 records with three formulas each); there is no way to index or sort by it in the database.
- Dates before the year 0 or after 9999 are an error (`DATEADD` gives `#NUM!`); the web app and the server both reject them.
- Formulas are for Collections only. Tasks have no custom fields yet (`docs/backlog/formula-field-on-tasks.md`).
- References are by exact field name and case sensitive. A formula inside a quoted text that happens to contain `{Old name}` is rewritten on a rename too.
- A field whose name contains `}` cannot be referred to.
- Relation fields give the linked record's id, not its label. There are no functions that look inside related records.
- Dates are text, so `{Due} - TODAY()` is `#VALUE!`; use `DAYS({Due}, TODAY())`.
- A text, number or other field that already has values cannot be turned into a formula until its values are cleared (the existing rule for any type change).
- Deleting a field does not warn that formulas use it.
- Not designed for the collection-field-types branch yet: when that merges, the type picker, `FIELD_TYPES` and `TableCell` need a `formula` entry (see merge notes in the task file).

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/formula-field`).
- Not implemented: formulas on tasks, aggregates across records or related records, a formula builder UI beyond the field picker, warning before deleting a field that formulas use.
- Not verified: lint, the TypeScript type-check, the Jest tests, the Rails tests, `rails db:migrate` and the screens were not run (no `node_modules`, gems, database or network). What did run: the `util/expression` and `data/formula` tests through a small offline test shim, Ruby syntax checks of the changed Ruby files, and a static parse of the changed TypeScript and SCSS.

- Merged to main 2026-11-02 after running, merged with main: `rails db:migrate` (schema diff clean), `rails test`, `npm run lint`, `tsc -b`, Jest, and the collab-server tests, all passing. Not checked in a browser.

- Implemented 2026-11-03 (not deployed; on branch `backlog/formula-results-in-the-api`): `formula_results` in the Collection API, the plain-Ruby `Formula::*` services, and the shared test cases. The web implementation changed in four small ways so both sides agree and nothing throws: a date before year 100 (`"0099-06-01"`) keeps its year (it used to read as 1999), `DATEADD` outside 0000 to 9999 gives `#NUM!` (it used to throw a `RangeError`), text or a typed number too large for a number (`"1e999"`, `1e999`) gives `#NUM!` (it used to give `Infinity`), and `computeFormulas` itself treats a list of files as blank (the Collection editor used to do this before calling it).
- Not verified (2026-11-03): this machine has no gems, database, `node_modules` or network. What ran: the shared cases against the TypeScript implementation (the offline test shim: all 457 evaluation cases and 30 record scenarios, plus the existing `expression` and `formula` tests) and against the Ruby implementation (plain `ruby` with a stand-in `test_helper`: 50 runs, 498 assertions for `vectors_test.rb`, and `results_test.rb`), `ruby -c` on the changed Ruby, and static parses of the changed TypeScript. Not run: `rails test` (so `tables_controller_test.rb` and the model changes have only been read, not run), `rails db:migrate` (no migration), `npm run lint`, `tsc` (the change adds `resolveJsonModule` to `frontend/tsconfig.json`), the Jest suites and the screens.
