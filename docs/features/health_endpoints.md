# Health and status endpoints

## What it does
- `GET /health` answers `200` with the body `OK` and touches nothing else (no database).
- `GET /status` runs a cheap check of the database (`SELECT 1`), the collab server (an HTTP request to its port) and each sign-in provider's settings (Google, Apple: whether the variables are set; the providers are never called). It answers `200` when nothing required is down and `503` when the database or the collab server is. An unset provider is "not configured" (orange), never down. JSON (`Accept: application/json`) lists each check with `name`, `state` (`ok`, `not_configured`, `down`) and `detail`; otherwise a short page shows 🟢 🟠 🔴 per check.
- Rails's `/up` (the production `api` health check) and nginx's `/healthz` (the `web` container) are unchanged.
- `docker-compose.yml` (development) now has health checks on `backend` (`/health`), `frontend` and `collab`, as production has.

## API and models
`HealthController` (`backend/app/controllers/health_controller.rb`, off `ApplicationController`, so no sign-in), routes `health` and `status`. nginx forwards the exact paths `/health` and `/status` to Rails (`frontend/nginx/default.conf`); both are already in `Slug::RESERVED`. `COLLAB_HEALTH_URL` (default `http://collab:1234`) is documented in `docs/services.md`.

## Who can view and change
Anyone, without signing in. The page shows check names and exception class names only, no secrets or hosts.

## Tests
`backend/test/controllers/health_controller_test.rb`.

## Known limits
Not run: the request tests, the nginx config, the new Compose health checks, and a deploy. `/status` does not check Redis or storage.

## History
- 2026-11-10: built on branch `backlog/health-and-status-endpoints`; unverified (no Rails or Docker here); not deployed.
