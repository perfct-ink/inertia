#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

# The host's dependencies are separate from the frontend container's volume.
(
  cd frontend
  if [ ! -f node_modules/electron/install.js ]; then
    npm install
  fi
  electron_installed() {
    node -e 'const fs = require("fs"); if (!fs.existsSync(require("electron"))) process.exit(1)' >/dev/null 2>&1
  }
  if ! electron_installed; then
    echo "Installing the missing Electron binary..."
    ELECTRON_SKIP_BINARY_DOWNLOAD= node node_modules/electron/install.js || true
    if ! electron_installed; then
      echo "Retrying the Electron installer with Node 22..."
      ELECTRON_SKIP_BINARY_DOWNLOAD= npm exec --yes --package=node@22 -- node node_modules/electron/install.js
    fi
    if ! electron_installed; then
      echo "Electron's binary is still missing after installation." >&2
      exit 1
    fi
  fi
  bash scripts/brand-electron-dev.sh
)

# A persisted bundle volume can lag behind the current Gemfile.lock.
docker compose run --rm --no-deps backend bash -c 'bundle check || bundle install'
docker compose up -d

wait_for_service() {
  local service="$1" url="$2" attempt
  echo "Waiting for $service..."
  for ((attempt = 0; attempt < 120; attempt++)); do
    if curl --connect-timeout 2 --max-time 3 -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    if ! docker compose ps --status running --services | grep -qx "$service"; then
      echo "$service exited before becoming ready." >&2
      docker compose logs --tail=50 "$service"
      return 1
    fi
    sleep 1
  done
  echo "Timed out waiting for $service at $url." >&2
  docker compose logs --tail=50 "$service"
  return 1
}

wait_for_service backend http://localhost:3000/up
wait_for_service frontend http://localhost:5174

docker compose logs --tail=20 -f &
logs_pid=$!
trap 'kill "$logs_pid" 2>/dev/null || true; wait "$logs_pid" 2>/dev/null || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cd frontend
# GUI task runners can inherit this from their own Electron host.
unset ELECTRON_RUN_AS_NODE
ELECTRON_DEV_SERVER_URL=http://localhost:5174 ./node_modules/.bin/electron .
