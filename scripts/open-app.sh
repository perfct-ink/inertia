#!/usr/bin/env bash
# Opens the web app once the frontend dev server answers. Right after
# `compose up` it may still be syncing node_modules or compiling, so a fixed
# sleep opens the browser on a connection error.
set -euo pipefail

URL="${APP_URL:-http://localhost:5174}"
TIMEOUT="${OPEN_TIMEOUT:-300}"

printf 'Waiting for %s' "$URL"
for _ in $(seq "$TIMEOUT"); do
  if curl -fs -o /dev/null --max-time 2 "$URL"; then
    echo " ready"
    open "$URL"
    exit 0
  fi
  printf '.'
  sleep 1
done

echo
echo "The frontend didn't answer within ${TIMEOUT}s; check \`make logs-frontend\`. Opening anyway." >&2
open "$URL"
