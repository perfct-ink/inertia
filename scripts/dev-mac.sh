#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

bash scripts/build-native-mac.sh

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
docker compose exec -T backend bundle exec rails db:migrate
wait_for_service frontend http://localhost:5174

docker compose logs --tail=20 -f &
logs_pid=$!
trap 'kill "$logs_pid" 2>/dev/null || true; wait "$logs_pid" 2>/dev/null || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# LaunchServices needs explicit environment overrides. A fresh instance ensures
# an already-open production app cannot absorb this development launch.
open -n -W \
  --env INERTIA_API_URL=http://localhost:3000 \
  --env INERTIA_WEB_URL=http://localhost:5174 \
  macos/dist/Inertia.app
