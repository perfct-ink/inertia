# Deploying with Coolify

Production runs on a [Coolify](https://coolify.io) server as one Docker Compose resource built from `docker-compose.coolify.yml`. Coolify clones the repo, builds the images on its own server, routes `inertia.it.com` to the stack through its proxy (Traefik) and issues the TLS certificate. The database stays on the DigitalOcean managed MySQL cluster.

```
browser ──https──▶ Coolify proxy (Traefik, TLS)
                        │
                        ▼
                  web (nginx :80) ── static webpack build
                   ├── / /features /pricing /about /robots.txt /sitemap.xml,
                   │   /api/*, /rails/active_storage/*  ──▶ api (Rails :3000) ──▶ managed MySQL
                   └── /collab (WebSocket)              ──▶ collab (Hocuspocus :1234) ──▶ api
```

| Service | Built from | Health check |
| --- | --- | --- |
| `web` | `frontend/Dockerfile` (webpack build served by nginx, config in `frontend/nginx/default.conf`) | `GET /healthz` |
| `api` | `backend/Dockerfile`; `bin/docker-entrypoint` runs `db:prepare` before the server starts, so migrations run on every deploy | `GET /up` |
| `collab` | `collab-server/Dockerfile` | `GET /` on port 1234 |

Only `web` gets a domain. `api` and `collab` are reachable only inside the stack's network. Uploads (Active Storage, disk service) live in the `storage` volume on the Coolify server.

`config.assume_ssl` is on in production: every public request arrives through Coolify's TLS proxy, and the collab service and health checks call `http://api:3000` directly, which `force_ssl` would otherwise redirect.

## Deploys

Every push to `main` runs `.github/workflows/deploy.yml`: the backend test suite, then the `coolify` job calls Coolify's deploy webhook. Coolify builds and starts the new containers and only switches traffic once their health checks pass. Turn Coolify's own **Auto Deploy** off for this resource so nothing deploys without the test gate.

Until the `COOLIFY_DEPLOY_WEBHOOK` repository variable is set, the workflow's `droplet` job keeps deploying to the old droplet with `deploy/deploy.sh` instead. That path is retired after cutover (see `docs/backlog/retire-droplet-deploy.md`).

To deploy by hand, use **Deploy** on the resource in Coolify, or run the workflow from the Actions tab.

## Configuration

Set these in the resource's **Environment Variables** tab in Coolify. Only `RAILS_MASTER_KEY` is required; the rest default to the `inertia.it.com` values in `docker-compose.coolify.yml`.

| Variable | Used by | Notes |
| --- | --- | --- |
| `RAILS_MASTER_KEY` | api | Contents of `backend/config/master.key`. Decrypts `config/credentials.yml.enc` (`secret_key_base`, `jwt_secret_key`, the `database:` connection). Mark it as a secret. |
| `APP_URL` | web (build), api | Public origin. Baked into the frontend bundle as `API_URL`, and used for Active Storage URLs from background jobs. |
| `COLLAB_URL` | web (build) | Public WebSocket URL, `wss://inertia.it.com/collab`. |
| `CORS_ORIGINS` | api | Defaults to the public origin plus `capacitor://localhost` (iOS app). |
| `OAUTH_CALLBACK_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | api | Social sign-in; each provider stays off while its values are empty. |

`APP_URL` and `COLLAB_URL` are build arguments: changing them needs a redeploy, not a restart. Never put a secret in them, since they ship to every browser.

GitHub repository settings used by the workflow:

| Name | Kind | Value |
| --- | --- | --- |
| `COOLIFY_DEPLOY_WEBHOOK` | variable | The resource's deploy webhook URL (Coolify: resource → **Webhooks**), e.g. `https://coolify.example.com/api/v1/deploy?uuid=…&force=false`. Setting it switches deploys from the droplet to Coolify. |
| `COOLIFY_TOKEN` | secret | A Coolify API token with deploy permission (Coolify: **Keys & Tokens** → API tokens). |

## One-time setup

1. **Server.** Install Coolify on a server with ports 80 and 443 free (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash`), or add an existing server to your Coolify instance. Coolify's proxy needs 80/443 to itself, so it can't share the old droplet, whose host nginx serves other sites.
2. **Database access.** In DigitalOcean → Databases → the MySQL cluster → **Trusted Sources**, add the Coolify server's IP. The credentials already in `config/credentials.yml.enc` keep working unchanged.
3. **Repository.** In Coolify: Sources → add a GitHub App with access to `perfct-ink/inertia`.
4. **Resource.** New resource → the GitHub App source → `perfct-ink/inertia`, branch `main`, build pack **Docker Compose**, compose file `/docker-compose.coolify.yml`.
5. **Domain.** On the `web` service, set the domain to `https://inertia.it.com,https://www.inertia.it.com`. Leave `api` and `collab` without a domain.
6. **Environment.** Add `RAILS_MASTER_KEY` (plus any social sign-in values) as above.
7. **Auto Deploy.** Turn it off under the resource's Advanced settings so deploys only come from the tested workflow.
8. **First deploy.** Click Deploy and wait for all three services to report healthy. Before DNS moves, you can check it on a temporary domain (Coolify can generate an sslip.io one) or with `curl -H 'Host: inertia.it.com' http://<server-ip>/healthz`.

## Cutover from the droplet

1. **Copy uploads.** On the droplet, find the old volume (`docker volume ls | grep storage`, likely `inertiaitcom_storage`) and archive it: `docker run --rm -v inertiaitcom_storage:/data -v "$PWD":/out alpine tar -czf /out/storage.tgz -C /data .`. Copy `storage.tgz` to the Coolify server, find the new volume (`docker volume ls | grep storage`; Coolify prefixes it with the resource's ID), and restore it: `docker run --rm -v <new_volume>:/data -v "$PWD":/in alpine sh -c 'tar -xzf /in/storage.tgz -C /data && chown -R 1000:1000 /data'`.
2. **DNS.** Point the `A` records for `inertia.it.com` and `www.inertia.it.com` at the Coolify server. Coolify requests the certificates once the names resolve to it.
3. **Switch deploys.** Add the `COOLIFY_TOKEN` secret and the `COOLIFY_DEPLOY_WEBHOOK` variable in GitHub (Settings → Secrets and variables → Actions). The next push to `main` deploys through Coolify.
4. **Verify** `https://inertia.it.com/` (marketing page), sign in, open a document in two tabs to check live collaboration, and open an existing upload.
5. **Retire the droplet path** per `docs/backlog/retire-droplet-deploy.md`, then stop the old containers and remove the nginx vhost on the droplet.

## Rollback

In Coolify, the resource's **Deployments** tab can redeploy any earlier successful deployment. Migrations don't roll back automatically, so keep schema changes backward compatible or plan their reversal. Before cutover is finished, removing the `COOLIFY_DEPLOY_WEBHOOK` variable sends deploys back to the droplet.

## Running the production stack locally

`make build-coolify` builds the three production images. To run them, supply `RAILS_MASTER_KEY` (or `SECRET_KEY_BASE`, `JWT_SECRET_KEY` and a `DATABASE_URL` for a local MySQL) and publish `web`'s port 80.
