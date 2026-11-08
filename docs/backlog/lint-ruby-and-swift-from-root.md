---
branch: backlog/lint-ruby-and-swift-from-root
priority: p1
depends_on: []
components: [backend, frontend]
status: incomplete
---
# Run Ruby and Swift linters from the root npm run lint

## Objective
One command lints the whole repository.

## Context
Root `npm run lint` runs ESLint and Stylelint in `frontend/` and ESLint in `collab-server/`. RuboCop runs only through `make lint-backend`, which ends in `|| true` so it never fails. There is no Swift linter or config.

## Requirements
- Add RuboCop and a Swift linter to the root lint entry point.
- Make failures fail the command.

## Acceptance criteria
- `npm run lint` runs the Ruby and Swift linters and exits non-zero on errors.
- The repository passes it.

## Blocked
Implemented on the branch. The Swift step passes here; RuboCop, ESLint and Stylelint could not run (no gems, no node modules). "The repository passes it" is therefore unconfirmed: run `npm run lint`, fix any RuboCop findings deliberately, and decide whether a Swift style linter is wanted (see the feature doc for why `swift format` was not adopted). Then remove this file and merge.

## Unverified

Built: `npm run lint` at the root runs `scripts/lint.sh`: ESLint and Stylelint (frontend), ESLint (collab-server), RuboCop (backend) and a warnings-as-errors build of the Swift core library, and exits non-zero if any fails; `make lint-backend` no longer ends in `|| true`. Documented in `docs/features/lint_entry_point.md` and `docs/project/checks.md`.

Ran: `sh -n scripts/lint.sh`, and the Swift step (`cd macos && swift build --disable-sandbox --target InertiaCore -Xswiftc -warnings-as-errors`: Build complete). Not run: RuboCop, ESLint and Stylelint, so "the repository passes it" (an acceptance criterion) is not known: RuboCop findings on the backend and ESLint warnings may need fixing before this is green.

To verify and finish: `npm run lint` at the repository root on a machine with the gems and node modules installed (`make setup`), fix what RuboCop reports (the old `|| true` hid it), then decide whether CI should run it (Linux jobs need `LINT_SKIP_MISSING=1` or a Swift step on a macOS runner). Remove this file when the command passes.
