---
priority: p2
depends_on: [formula-field]
branch: backlog/formula-results-in-the-api
components: [backend, frontend]
---
# Formula results in the API and for sorting

## Objective

Formula fields (see `docs/features/formula_field.md`) are worked out in the browser only. Make the results available wherever the server needs them: the Collection API, exports and imports, and any server-side sort or filter.

## Requirements / notes

- Evaluate on the server with the same language and function table as `frontend/src/util/expression.ts`. Prefer one shared definition (for example a generated function table or a shared test vector file) over two diverging implementations, and add shared test cases both sides must pass.
- Include each record's formula results in `GET /api/v1/tables/:id`, with the same error codes (`#DIV/0!`, `#REF!`, ...).
- Decide whether the browser keeps computing live from unsaved edits (it should) and the server value is the saved one.

## Acceptance criteria

- The Collection API returns formula results that match the web app for the shared test cases.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; the feature doc `docs/features/formula_field.md` is updated and this file is removed.

## Blocked

Built and checked as far as this machine allows; waiting for a run of the real suites before it merges.

Done: `Formula::Parser`, `Formula::Evaluator`, `Formula::Functions`, `Formula::Values`, `Formula::Error` and `Formula::Results` in `backend/app/services/formula/` (plain Ruby, same language as `frontend/src/util/expression.ts`); `formula_results` on every record of `GET /api/v1/tables/:id` (and so on every field and record write); the shared cases in `frontend/src/util/expression.vectors.json` run by both the web and the server tests; five small fixes to the web evaluator found while matching it (listed in `docs/features/formula_field.md`, History); `docs/features/formula_field.md` updated. No migration. Decision for Alex: the editor keeps computing live from unsaved edits and does not read the server's `formula_results` (the saved value); say so if the grid should show the server value for saved rows instead.

Ran (2026-11-03): the shared cases against the TypeScript implementation through the offline shim (464 evaluation cases, 30 record scenarios, plus the existing `expression` and `formula` tests), and against the Ruby implementation with plain `ruby` and a stand-in `test_helper` (`vectors_test.rb`: 50 runs, 505 assertions; `results_test.rb`: 13 runs); a differential fuzz of about 150,000 random formulas, `expression.ts` against the Ruby code, with one difference left (the last binary digit of `^`, which engines do not agree on); `ruby -c` on the changed Ruby; `/tmp/runner/all.sh` (static parse, sass, the pure unit tests).

Not run (no gems, database, `node_modules` or network): `rails test` (the new cases in `backend/test/controllers/tables_controller_test.rb` and the `TableRecord#as_table_json` change have only been read), `npm run lint`, `tsc` (`resolveJsonModule` was added to `frontend/tsconfig.json` for the JSON import), the Jest suites, `rubocop`, `brakeman`.

To verify and merge:
```
cd backend && bin/rails test test/services/formula test/controllers/tables_controller_test.rb test/models/relational_table_test.rb && bin/rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```
Then open a Collection with formula fields in the browser, add a few records, and compare the grid with `GET /api/v1/tables/:id` (`formula_results`). Delete this file when the branch is merged.
