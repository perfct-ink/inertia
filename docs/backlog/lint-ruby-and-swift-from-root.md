---
branch: backlog/lint-ruby-and-swift-from-root
priority: p1
depends_on: []
components: [backend, frontend]
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
