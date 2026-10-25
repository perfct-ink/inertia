---
priority: p1
depends_on: []
components: [backend, deploy, docs]
---
# Remove MySQL after the PostgreSQL cutover

## Objective
Once production runs on the shared PostgreSQL (`docs/features/postgresql_database.md`) and Alex has confirmed the data looks right, drop everything that only existed for MySQL.

## Requirements
- Confirm first: `DATABASE_URL` is set on the Coolify `inertia` resource, and `ar_internal_metadata` in `inertia_production` has a `mysql_imported_at` row (Alex checks this; sessions don't query production).
- Remove the `mysql2` gem, the MySQL `production` branch in `backend/config/database.yml`, `MysqlImport` and its rake task, test and entrypoint call, the `default-mysql-client`/`default-libmysqlclient-dev` packages in the Dockerfiles and CI, and `MYSQL_IMPORT_URL` from `docs/services.md`.
- Make `DATABASE_URL` required in `docker-compose.coolify.yml` (`${DATABASE_URL:?}`).
- Retire `deploy/server_setup.sh` (MySQL database setup) and the `database:` block in the Rails credentials.
- Revisit comments that explain MySQL workarounds (`epics_controller.rb` CASE/SUM, `document.rb` JSON default, `workspaces_controller.rb` and `milestone_rollup.rb` reorder) and the JSON-default rule in `docs/rules/conventions.md`.
- Tell Alex the DigitalOcean MySQL cluster can be deleted once a final backup is kept; deleting it is Alex's call.

## Acceptance criteria
- No `mysql` references remain outside the History sections of docs.
- Backend suite passes; production boots with only PostgreSQL.
