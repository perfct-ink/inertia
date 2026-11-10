---
priority: p2
depends_on: []
components: [backend, frontend, docs]
branch: backlog/health-and-status-endpoints
status: incomplete
---
# `/health` and `/status` endpoints, and health checks on every dev service

## Objective

The app answers the health URLs the shared rules name (found by the rules audit, see `docs/features/rules_compliance.md`): `/health` for liveness and `/status` for the state of every dependency.

## Context

`docs/rules/backend.md` (Health Checks and Smoke Tests) says a backend exposes `/health` (200, body `OK`) and `/status` (200 when everything is fine, 503 when something is down, every integration, database and internal or external service listed, optionally as a page with green, orange and red dots). Today Rails has only Rails's default `/up` (used by the production `api` health check), and nginx has `/healthz` for the `web` container. There is no `/health` or `/status`.

`docs/rules/code-requirements.md` (Web Applications) wants health checks in the Docker Compose file. `docker-compose.coolify.yml` has them for `web`, `api` and `collab`; `docker-compose.yml` (development) has them only for `postgres` and `redis`, not for `backend`, `frontend` or `collab`.

## Requirements / notes

- `GET /health` returns 200 with the body `OK` and touches nothing else. Keep `/up` as it is (production health checks use it) or point them at `/health` in the same change.
- `GET /status` checks the database (a cheap query), the collab server (its port answers), and each configured external service that can be checked without spending money (for example whether the Google and Apple sign-in settings are present; do not call them). It returns 503 if any check fails and lists each check, with a simple page for people (green, orange, red dots) and JSON for scripts.
- Public routes are decided in `frontend/nginx/default.conf` (see `docs/project/deployment.md`): add `/health` and `/status` locations that reach Rails, and keep `/healthz` for the `web` container.
- Add `healthcheck:` entries for `backend`, `frontend` and `collab` in `docker-compose.yml`.
- Request tests for both endpoints (200, and 503 with the database check stubbed to fail). Update `docs/services.md` and `docs/deployment.md` (the smoke test after a deploy can use `/status`).

## Acceptance criteria

- `/health` and `/status` answer as described, publicly through nginx, with request tests.
- Every service in `docker-compose.yml` has a health check.
- `docs/features/rules_compliance.md` (backend.md rows) is updated.

## Unverified

Built, but no Rails, Docker or nginx here: run `rails test test/controllers/health_controller_test.rb` and `rails test` (the slug test reads the nginx config), `docker compose up` and check `docker compose ps` shows every service healthy, then `curl -i localhost:3847/health` and `/status` (and through nginx on a staging deploy). Delete this file when they pass.
