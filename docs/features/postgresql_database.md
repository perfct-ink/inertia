# PostgreSQL database

Inertia's data lives in PostgreSQL 16. Production uses the shared PostgreSQL in Coolify's Shared Infrastructure project; development and CI run a `postgres:16-alpine` container. Users see no change.

## How it works

- `backend/config/database.yml`: the `postgresql` adapter for every environment. In production, `DATABASE_URL` holds the connection; `docker-compose.coolify.yml` requires it (`${DATABASE_URL:?}`), so a deploy without it fails instead of booting against nothing.
- `docker-compose.coolify.yml`: `api` joins Coolify's external `coolify` network, where shared-postgres (`ueatxx7exko0js1mqgkcs0wn`) is reachable by its container name.
- `bin/docker-entrypoint` runs `db:prepare`, which created `inertia_production` on the first boot. The URL uses the instance's `takeover` superuser, which can create databases.
- `Task.title_matching` replaces the raw `LIKE` in the task search, because PostgreSQL's `LIKE` is case-sensitive. It uses ILIKE and escapes `%` and `_`.

Setup and rollback are in `docs/deployment.md` (Database).

## Who can view and change it

Only operators: the connection is a Coolify environment variable on the `inertia` resource.

## Tests

- The whole backend suite runs against PostgreSQL (`bin/rails test`; CI's `postgres` service).
- `test/models/task_test.rb`: title search is case-insensitive and treats `%` literally.

## Known limits

- The MySQL data wasn't copied (Alex's call, 2026-10-29), and the old MySQL database was dropped afterwards, so nothing from before the switch remains.
- Inertia shares the `takeover` superuser with the takeover app's database on the same instance; a dedicated role would isolate it.

## History

- 2026-10-29: switched production to shared-postgres without copying data (Alex: no need to migrate the MySQL data). Removed the MySQL import, the MySQL fallback, the `mysql2` gem and MySQL packages; set `DATABASE_URL` on the Coolify resource; dropped `inertia_production` from the DigitalOcean MySQL cluster after the deploy came up healthy. Deployed (87d675a, healthy; `/features` 200, `/api/v1/workspaces` 401 as expected unauthenticated). Verified: backend suite on PostgreSQL 16, `db:prepare` in production mode creating a fresh database, rubocop, brakeman, compose config.
- 2026-10-28: import moved before `db:prepare` and onto the shared `mysql_import.rb` used by paulandvaos and audiobunny (foreign keys dropped and re-added instead of disabled, so the dedicated `inertia` role suffices). Verified locally: suite on PostgreSQL 16 (148 runs, 0 failures); an import from a MySQL 8 copy of the old schema with a self-referencing task whose parent has a higher id and an emoji title.
- 2026-10-25: first push to main took the API down until 2026-10-27. Coolify adds every variable a compose file mentions to the resource, and passes all of them to every container (`env_file: .env`), so `api` got `DATABASE_URL=""` and Rails refused to boot ("Database URL cannot be empty"). Reverted on main (e581db1) and the empty variable deleted from Coolify. Re-landed with `bin/docker-entrypoint` unsetting an empty `DATABASE_URL`.
- Implemented 2026-10-25: PostgreSQL in dev, CI and code; production switch behind `DATABASE_URL`; one-time MySQL import. Verified locally: full backend suite on PostgreSQL 16 (148 runs, 0 failures), migrations from scratch on PostgreSQL (schema.rb regenerated, only MySQL charset options dropped), the hand-run import above, both compose files with `docker compose config`. Not verified: the Docker images weren't built here (no Docker daemon); whether Coolify keeps `api` on the stack network now that it lists `networks` explicitly (check that `web` reaches `api` after the deploy), and the production copy and cutover depend on `DATABASE_URL` being set in Coolify.
