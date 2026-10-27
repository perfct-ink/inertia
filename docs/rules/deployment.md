## Production and deployment

Production runs on Coolify from `docker-compose.coolify.yml`; [docs/deployment.md](../deployment.md) is the runbook.

### Hands off production

- A push to `main` deploys once CI passes: CI's last job, `deploy`, tells Coolify to deploy (Auto Deploy is off). A red CI run means nothing ships.
- **Do not SSH to the server, run commands against the production database, or change GitHub secrets, variables or DNS.** Hand those steps to the user as exact instructions.
- Sessions that have `COOLIFY_API_TOKEN` may use Coolify's API to check the `inertia` resource and its deployments (Alex asked for this on 2026-10-21). Change its settings or start a deploy by hand only when the user asks.
- Secrets live in the encrypted Rails credentials (`backend/config/credentials.yml.enc`, key in the gitignored `backend/config/master.key`), in Coolify's environment variables. Never print or commit them, and never pass one as a frontend build argument (`APP_URL`, `COLLAB_URL` and anything else webpack's `DefinePlugin` reads ship to every browser).

### Changing the stack

- Each production service has its own Dockerfile and a health check in `docker-compose.coolify.yml`; a new service needs both. Only `web` gets a public domain; everything else is reached over the stack's network by service name.
- Public routes are decided in `frontend/nginx/default.conf`. A new Rails-rendered page or API prefix needs a location there.
- A new runtime setting goes in `docker-compose.coolify.yml` (as `${NAME:-default}` so it appears in Coolify), in `docs/deployment.md`'s configuration table and in `docs/services.md`, in the same commit.
- Rails runs `db:prepare` on every boot, so migrations deploy with the code. Keep them backward compatible with the previous release, since Coolify rollbacks don't reverse them.
- The database is the shared PostgreSQL in Coolify's Shared Infrastructure project (Alex, 2026-10-25), reached through `DATABASE_URL`. Don't add a database container to the production stack unless the user asks.
