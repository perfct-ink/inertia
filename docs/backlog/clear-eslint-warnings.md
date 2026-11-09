---
priority: p1
depends_on: []
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

- `npm run lint` reports no warnings from the React Compiler rules (`react-hooks` `refs`, `set-state-in-effect`, `static-components`) or `exhaustive-deps`, and those rules are raised from warnings to errors so new code can't add them back.
- Each fixed component keeps its behaviour: its tests pass, and components without tests get one before the fix.
- `make test` and `make typecheck` pass.

## Not started

An earlier session had no `node_modules` or network, so it could not list the warnings and left this alone rather than guess at fixes to working code. With the dependencies installed, `cd frontend && npm run lint` lists them (79 warnings, 0 errors on main on 2026-11-09). Fix one component at a time, one commit each with its test, running `npm run lint`, `npx tsc -b` and `npm test` after every fix, and remove this file when none of those four rules warns.
