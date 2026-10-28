# PostgreSQL database

Inertia's data lives in PostgreSQL 16. Production uses the shared PostgreSQL in Coolify's Shared Infrastructure project; development and CI run a `postgres:16-alpine` container. Users see no change.

## How it works

- `backend/config/database.yml`: the `postgresql` adapter for every environment. In production, `DATABASE_URL` holds the connection. While `DATABASE_URL` is unset, production falls back to the old DigitalOcean MySQL cluster from the Rails credentials, so code that supports PostgreSQL could ship before the cutover.
- `docker-compose.coolify.yml`: `api` joins Coolify's external `coolify` network, where the shared PostgreSQL container (`ueatxx7exko0js1mqgkcs0wn`) is reachable by name.
- `backend/app/services/mysql_import.rb` and `bin/rails db:import_mysql`: a one-time copy of every table from MySQL into an empty PostgreSQL database, run by `bin/docker-entrypoint` before `db:prepare` (it loads the schema into an empty database itself, so seeds never land first). It skips when the app isn't on PostgreSQL, when no MySQL source is configured, and after it has run once (`mysql_imported_at` in `ar_internal_metadata`). It refuses to write into tables that already have rows, copies inside one transaction with the foreign keys dropped and re-added at the end (re-adding validates every row; only table ownership is needed), resets id sequences, and stops the boot on any failure. The source is the `mysql_import` entry in `config/database.yml`; `MYSQL_IMPORT_URL` overrides it.
- `Task.title_matching` replaces the raw `LIKE` in the task search, because PostgreSQL's `LIKE` is case-sensitive. It uses ILIKE and escapes `%` and `_`.

Cutover steps and rollback are in `docs/deployment.md` (Database).

## Who can view and change it

Only operators: the connection is a Coolify environment variable on the `inertia` resource, and the import runs inside the `api` container.

## Tests

- The whole backend suite runs against PostgreSQL (`bin/rails test`; CI's `postgres` service).
- `test/models/task_test.rb`: title search is case-insensitive and treats `%` literally.
- `test/services/mysql_import_test.rb`: the import's guards (no source, target already has data, already imported).
- The copy itself needs a MySQL server, so it isn't in the suite. It was checked by hand on 2026-10-25: a MySQL 8 database built from the previous MySQL `schema.rb` and the dev seeds, plus a pinned folder, a task whose parent has a higher id and non-ASCII JSON content, copied into PostgreSQL with all rows, booleans, JSON and accents intact; a new row then got the next id, and a second run was a no-op.

## Known limits

- The production URL uses the dedicated `inertia` role, which owns `inertia_production` and nothing else.
- The `mysql2` gem, the MySQL fallback in `database.yml` and the import stay until the cutover is confirmed. See `docs/backlog/remove-mysql-after-postgres-cutover.md`.
- Writes made to MySQL while the cutover deploy runs (after the copy, before the old containers stop) are not copied.

## History

- 2026-10-28: import moved before `db:prepare` and onto the shared `mysql_import.rb` used by paulandvaos and audiobunny (foreign keys dropped and re-added instead of disabled, so the dedicated `inertia` role suffices). Verified locally: suite on PostgreSQL 16 (148 runs, 0 failures); an import from a MySQL 8 copy of the old schema with a self-referencing task whose parent has a higher id and an emoji title.
- 2026-10-25: first push to main took the API down until 2026-10-27. Coolify adds every variable a compose file mentions to the resource, and passes all of them to every container (`env_file: .env`), so `api` got `DATABASE_URL=""` and Rails refused to boot ("Database URL cannot be empty"). Reverted on main (e581db1) and the empty variable deleted from Coolify. Re-landed with `bin/docker-entrypoint` unsetting an empty `DATABASE_URL`.
- Implemented 2026-10-25: PostgreSQL in dev, CI and code; production switch behind `DATABASE_URL`; one-time MySQL import. Verified locally: full backend suite on PostgreSQL 16 (148 runs, 0 failures), migrations from scratch on PostgreSQL (schema.rb regenerated, only MySQL charset options dropped), the hand-run import above, both compose files with `docker compose config`. Not verified: the Docker images weren't built here (no Docker daemon); whether Coolify keeps `api` on the stack network now that it lists `networks` explicitly (check that `web` reaches `api` after the deploy), and the production copy and cutover depend on `DATABASE_URL` being set in Coolify.
