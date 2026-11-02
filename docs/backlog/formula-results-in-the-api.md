---
priority: p2
depends_on: [formula-field]
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
