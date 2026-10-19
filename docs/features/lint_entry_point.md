# One lint command

## What it does
`npm run lint` at the repository root runs `scripts/lint.sh`, which lints everything and exits non-zero if any linter fails (all of them run first so one run shows every problem):
- frontend: ESLint and Stylelint (`npm --prefix frontend run lint`)
- collab-server: ESLint
- backend: RuboCop (`bundle exec rubocop --parallel`, omakase rules from `backend/.rubocop.yml`)
- macos: `swift build --target InertiaCore -Xswiftc -warnings-as-errors`, i.e. the Swift core library must compile with no warnings
`npm run lint:js` is the old JavaScript-only entry. `make lint-backend` no longer ends in `|| true`, so it fails on RuboCop errors.

A linter whose tool is missing counts as a failure, so it can't be skipped by accident. Set `LINT_SKIP_MISSING=1` to skip Ruby or Swift on a machine without them. `SWIFTPM_FLAGS` is passed to `swift build` (for example `--disable-sandbox`).

## Who can run it
Anyone with the tools installed. CI does not run it yet.

## Tests
None; it is a script. Run `sh -n scripts/lint.sh` for a syntax check.

## Known limits
- There is no Swift *style* linter. `swift format lint` (bundled with the toolchain) was tried: its layout rules cannot be switched off, and the existing dense Swift (one-line members, 4-space indent, semicolons) produces over 2,000 warnings, so the Swift step only catches compile warnings in `InertiaCore`. The SwiftUI app target needs full Xcode to build (the Command Line Tools lack the SwiftUI macros), so it is not linted here.
- Whether the repository passes RuboCop, ESLint and Stylelint was not checked (no gems or node modules installed).
- The Swift step on Linux or without the Swift toolchain is skipped only with `LINT_SKIP_MISSING=1`.

## History
- Implemented 2026-10-19 on branch `backlog/lint-ruby-and-swift-from-root`. Not merged or deployed.
- Verified: the Swift step ran and passed; the shell syntax check passed. Not verified: the npm and RuboCop steps.
