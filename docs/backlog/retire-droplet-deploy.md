---
priority: p1
components: [deploy, ci]
depends_on: []
---

# Retire the droplet deploy after the Coolify cutover

Production is moving to Coolify (`docs/deployment.md`). While the cutover is in progress, `.github/workflows/deploy.yml` keeps a `droplet` job that ships to the old shared droplet whenever the `COOLIFY_DEPLOY_WEBHOOK` repository variable is unset.

**Blocked until** `inertia.it.com` is served from Coolify: DNS points at the Coolify server, uploads are copied, and a deploy has gone through the `coolify` job. Check with the user before starting; nothing in the repo can confirm DNS.

## Requirements

- Delete the `droplet` job from `.github/workflows/deploy.yml` and drop the `if:` on the `coolify` job, so a missing webhook fails the deploy instead of silently skipping it.
- Delete `deploy/deploy.sh`, `deploy/server/` (nginx vhosts, sudoers grant) and `docker-compose.prod.yml`. Keep `deploy/server_setup.sh` (it creates the app database on the managed cluster) or move it under `scripts/`.
- Remove the droplet notes from `docs/deployment.md`, `docs/README.md`'s Deploy section, `docs/services.md` (`DEPLOY_SSH_KEY`, `RAILS_ENV`, the droplet rows) and `docs/rules/deployment.md`.
- Tell the user they can delete the `DEPLOY_SSH_KEY` and `RAILS_MASTER_KEY` GitHub secrets, stop the old containers on the droplet, and remove its `inertia.it.com` nginx vhost and certificate.

## Acceptance criteria

- Pushing to `main` deploys only through Coolify.
- No file in the repo references the droplet, `deploy@inertia.it.com` or `deploy.sh`.
