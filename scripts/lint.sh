#!/bin/sh
# One command that lints the whole repository: ESLint and Stylelint (frontend),
# ESLint (collab-server), RuboCop (backend) and a warnings-as-errors build of
# the Swift core library (macos). Every linter runs; the exit status is non-zero
# if any of them fails.
#
# A tool that isn't installed counts as a failure so it can't be skipped by
# accident. Set LINT_SKIP_MISSING=1 to skip Ruby or Swift on a machine that
# doesn't have them (for example a JavaScript-only CI job). SWIFTPM_FLAGS is
# passed to `swift build` (for example --disable-sandbox in a sandbox).

cd "$(dirname "$0")/.." || exit 1
status=0

step() {
  echo "==> $1"
  shift
  "$@" || status=1
}

missing() {
  if [ "${LINT_SKIP_MISSING:-0}" = 1 ]; then
    echo "==> skipped $1: $2 is not installed (LINT_SKIP_MISSING=1)"
  else
    echo "==> $1 failed: $2 is not installed (set LINT_SKIP_MISSING=1 to skip)"
    status=1
  fi
}

step "frontend (ESLint, Stylelint)" npm --prefix frontend run lint
step "collab-server (ESLint)" npm --prefix collab-server run lint

if command -v bundle >/dev/null 2>&1; then
  step "backend (RuboCop)" sh -c 'cd backend && bundle exec rubocop --parallel'
else
  missing "backend (RuboCop)" bundler
fi

if command -v swift >/dev/null 2>&1; then
  # shellcheck disable=SC2086
  step "macos (Swift core, warnings as errors)" swift build --package-path macos --target InertiaCore -Xswiftc -warnings-as-errors ${SWIFTPM_FLAGS:-}
else
  missing "macos (Swift)" swift
fi

exit "$status"
