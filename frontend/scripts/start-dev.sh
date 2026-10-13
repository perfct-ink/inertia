#!/bin/sh
set -eu

# Docker keeps node_modules in a persistent volume, independent of rebuilt images.
dependency_stamp=node_modules/.inertia-dependencies
current_dependencies=$(sha256sum package.json package-lock.json)
installed_dependencies=$(cat "$dependency_stamp" 2>/dev/null || true)

if [ "$current_dependencies" != "$installed_dependencies" ]; then
  echo "Syncing frontend dependencies with the lockfile..."
  npm ci --no-audit --no-fund
  printf '%s\n' "$current_dependencies" > "$dependency_stamp"
fi

exec npm run dev
