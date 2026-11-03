#!/bin/bash
# Ensures the tools `make setup` needs are present: Homebrew, Docker, and
# Node/npm. Run automatically as the first step of `make setup`; safe to
# re-run — every check is a no-op once satisfied.
#
# Docker is installed via colima rather than Docker Desktop (no license
# concerns, no GUI app, easy to script) unless Desktop — or some other
# `docker` — is already on PATH, in which case we leave it alone rather
# than assume everyone wants colima.
set -e

if ! command -v brew >/dev/null 2>&1; then
  echo "error: Homebrew not found." >&2
  echo "Install it from https://brew.sh, then re-run 'make setup'." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "==> docker not found, installing colima (Docker without Docker Desktop) via Homebrew..."
  brew install colima docker docker-compose docker-buildx
fi

if command -v colima >/dev/null 2>&1; then
  if ! docker compose version >/dev/null 2>&1 && [ -d /opt/homebrew/lib/docker/cli-plugins ]; then
    # docker-compose/docker-buildx are Homebrew formulae, not Docker
    # Desktop's bundled plugins — the docker CLI won't find `docker compose`
    # or `docker buildx` as subcommands unless it's told where they live.
    # Checked on every run, not only right after installing colima, since an
    # existing Homebrew install can be missing the setting too.
    echo "==> registering docker-compose/docker-buildx as CLI plugins..."
    mkdir -p ~/.docker
    python3 - <<'PY'
import json
import os

path = os.path.expanduser("~/.docker/config.json")
try:
    with open(path) as f:
        config = json.load(f)
except FileNotFoundError:
    config = {}

extra_dirs = config.setdefault("cliPluginsExtraDirs", [])
plugin_dir = "/opt/homebrew/lib/docker/cli-plugins"
if plugin_dir not in extra_dirs:
    extra_dirs.append(plugin_dir)

with open(path, "w") as f:
    json.dump(config, f, indent="\t")
    f.write("\n")
PY
  fi

  if ! colima status >/dev/null 2>&1; then
    echo "==> starting colima..."
    brew services start colima
    echo "==> waiting for docker to respond..."
    for _ in $(seq 1 60); do
      docker info >/dev/null 2>&1 && break
      sleep 2
    done
  fi
fi

if ! docker info >/dev/null 2>&1; then
  echo "error: docker is installed but not responding (docker info failed)." >&2
  echo "If you're on Docker Desktop, make sure it's running. If you're on colima, try 'colima start'." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "==> node not found, installing via Homebrew..."
  brew install node
fi

echo "✓ Dependencies OK ($(docker --version), $(node --version))"
