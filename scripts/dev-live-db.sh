#!/usr/bin/env bash
# Runs the local dev stack against the live (production) database.
#
# shared-postgres isn't public, so this opens an SSH tunnel to the server,
# forwarding a local port to the database container on Coolify's `coolify`
# network, reads DATABASE_URL from the running production `api` container
# (so no secret is copied by hand or written to disk), points it at the
# tunnel, and starts docker compose with docker-compose.live-db.yml on top.
#
#   bash scripts/dev-live-db.sh        start (or restart) against the live DB
#   bash scripts/dev-live-db.sh down   stop the stack and close the tunnel
#
# Variables: LIVE_DB_SSH_HOST (default `general`, a user in the docker group
# on 104.131.183.186), LIVE_DB_PORT (local tunnel port, default 15432),
# LIVE_DB_READONLY=1 to open every transaction read-only.
set -euo pipefail

cd "$(dirname "$0")/.."

SSH_HOST="${LIVE_DB_SSH_HOST:-general}"
LOCAL_PORT="${LIVE_DB_PORT:-15432}"
DB_CONTAINER="ueatxx7exko0js1mqgkcs0wn"    # shared-postgres
APP_UUID="smu9zcyqqxhwhd7fybqqmn7j"        # the inertia Coolify resource
SOCKET="/tmp/inertia-live-db.sock"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.live-db.yml)

close_tunnel() {
  if [ -S "$SOCKET" ]; then
    ssh -S "$SOCKET" -O exit "$SSH_HOST" 2>/dev/null || rm -f "$SOCKET"
  fi
}

if [ "${1:-}" = "down" ]; then
  LIVE_DATABASE_URL=unused "${COMPOSE[@]}" down --remove-orphans
  close_tunnel
  echo "✓ Stopped; tunnel closed"
  exit 0
fi

echo "Looking up the live database on $SSH_HOST..."
DB_IP=$(ssh "$SSH_HOST" "docker inspect -f '{{(index .NetworkSettings.Networks \"coolify\").IPAddress}}' $DB_CONTAINER")
API_CONTAINER=$(ssh "$SSH_HOST" "docker ps --format '{{.Names}}' | grep '^api-$APP_UUID' | head -n1")
if [ -z "$DB_IP" ] || [ -z "$API_CONTAINER" ]; then
  echo "Couldn't find the database container or the production api container on $SSH_HOST." >&2
  exit 1
fi
REMOTE_URL=$(ssh "$SSH_HOST" "docker exec $API_CONTAINER printenv DATABASE_URL")

# Same credentials and database, but through the tunnel on the host.
LIVE_DATABASE_URL=$(printf '%s' "$REMOTE_URL" | sed -E "s#@[^@]*/([^/]*)\$#@host.docker.internal:$LOCAL_PORT/\1#")
if [ "${LIVE_DB_READONLY:-}" = "1" ]; then
  LIVE_DATABASE_URL="$LIVE_DATABASE_URL?options=-c%20default_transaction_read_only%3Don"
fi
export LIVE_DATABASE_URL

close_tunnel
ssh -f -N -M -S "$SOCKET" -o ExitOnForwardFailure=yes \
  -L "127.0.0.1:$LOCAL_PORT:$DB_IP:5432" "$SSH_HOST"
echo "✓ Tunnel open: localhost:$LOCAL_PORT → $DB_CONTAINER ($DB_IP)"

"${COMPOSE[@]}" down --remove-orphans
"${COMPOSE[@]}" build
"${COMPOSE[@]}" up -d
sleep 3

echo
echo "⚠ Local dev is using the LIVE database${LIVE_DB_READONLY:+ (read-only)}. Changes you make are real."
echo "  Stop with: make dev-live-down"
open http://localhost:5174
