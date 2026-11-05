#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

bash scripts/build-native-mac.sh

# LaunchServices needs explicit environment overrides. A fresh instance ensures
# an already-open production app cannot absorb this development launch.
# Start the local server separately (`make up-d`) or use `make dev-all`.
open -n -W \
  --env INERTIA_API_URL=http://localhost:${API_PORT:-3847} \
  --env INERTIA_WEB_URL=http://localhost:5174 \
  macos/dist/Inertia.app
