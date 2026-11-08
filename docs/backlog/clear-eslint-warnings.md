---
priority: p1
depends_on: []
branch: backlog/clear-eslint-warnings
status: incomplete
---
# Clear ESLint warnings deliberately

## Objective

Clear ESLint warnings deliberately

## Requirements / notes

The React Compiler rules in `react-hooks` v7 (`refs`, `set-state-in-effect`, `static-components`) and `exhaustive-deps` are warnings. Each fix edits working code, so do them one component at a time with tests.

## Context

Section "Frontend conventions follow-up" of the retired shared backlog.

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

## Acceptance criteria

- Clear ESLint warnings deliberately works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Deliberately not started offline. The task is to clear the warnings `npm run lint` reports (the React Compiler rules `refs`, `set-state-in-effect`, `static-components`, and `exhaustive-deps`), one component at a time, each with tests. The warnings can only be listed by running ESLint, and the machine this was groomed on has no `node_modules` and no network, so there is no list to work from, and guessing at fixes to working code without lint, the type-check or the real Jest suite would risk breaking it (the task itself says each fix edits working code).

To pick it up on a machine with the dependencies installed:

```sh
cd frontend && npm install && npm run lint 2>&1 | grep -B1 -E "warning" | head -200
```

Then fix one component at a time (one commit each, with its test), run `npm run lint`, `npx tsc -b` and `npm test` after every fix, and remove this file when no warning from those four rules is left.
