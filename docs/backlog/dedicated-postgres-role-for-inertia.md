---
priority: p2
depends_on: [remove-mysql-after-postgres-cutover.md]
components: [deploy, docs]
---
# Dedicated PostgreSQL role for Inertia

## Objective
The shared PostgreSQL holds several apps' databases. Inertia connects as the `postgres` superuser, which the one-time MySQL import needed. Give Inertia its own role that can reach only its database.

## Requirements
- After the MySQL import is gone, Alex creates the role in the shared PostgreSQL's terminal in Coolify (sessions don't run commands against production databases), with a generated password: `CREATE ROLE inertia LOGIN PASSWORD '<password>';`, then makes it the owner of `inertia_production` and of every table and sequence in it (`ALTER ... OWNER TO inertia`, one per object; don't use `REASSIGN OWNED BY postgres`, which would also take other apps' objects on this shared server).
- `REVOKE CONNECT ON DATABASE inertia_production FROM PUBLIC; GRANT CONNECT ON DATABASE inertia_production TO inertia;`
- Update `DATABASE_URL` on the Coolify `inertia` resource to use the `inertia` role, redeploy, and update `docs/deployment.md`.

## Acceptance criteria
- Production connects as `inertia`, migrations still run on deploy, and the role can't connect to other apps' databases.
