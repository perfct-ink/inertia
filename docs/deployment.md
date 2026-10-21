# Deploying with Coolify

Production runs on a [Coolify](https://coolify.io) server as one Docker Compose resource built from `docker-compose.coolify.yml`. Coolify clones the repo, builds the images on its own server, routes `inertia.it.com` to the stack through its proxy (Traefik) and issues the TLS certificate. The database stays on the DigitalOcean managed MySQL cluster.

Cutover finished on 2026-10-21: `inertia.it.com` and `www.inertia.it.com` are served by the `inertia` resource (Inertia project, `production` environment, uuid `smu9zcyqqxhwhd7fybqqmn7j`) on `https://coolify.homecloud.one`.

The Coolify proxy's `--providers.docker.constraints` setting (Servers → localhost → Proxy) lists the app uuids Traefik routes; hosts it doesn't route fall through to the host nginx. Keep Inertia's uuid in that list.

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

Only `web` gets a domain. `api` and `collab` are reachable only inside the stack's network. Uploads (Active Storage, disk service) live in the `inertiaitcom_storage` Docker volume, the one the old droplet stack created; the compose file mounts it as an external volume, so it must exist before the first deploy.

`config.assume_ssl` is on in production: every public request arrives through Coolify's TLS proxy, and the collab service and health checks call `http://api:3000` directly, which `force_ssl` would otherwise redirect.

## Deploys

Coolify's **Auto Deploy** is on for this resource: every push to `main` reaches Coolify through its GitHub App and deploys right away. Coolify builds and starts the new containers and only switches traffic once their health checks pass. CI (`.github/workflows/ci.yml`) runs the tests on the same push in parallel, so a failing test does not stop a deploy (Alex's choice, 2026-10-21); check CI before pushing.

To deploy by hand, use **Deploy** on the resource in Coolify.

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

No GitHub secrets or variables are needed for deploys. To deploy by API instead, `POST https://coolify.homecloud.one/api/v1/deploy?uuid=smu9zcyqqxhwhd7fybqqmn7j&force=false` with a Coolify API token (Keys & Tokens).

## One-time setup

1. **Server.** Coolify (`https://coolify.homecloud.one`) runs on the droplet itself (104.131.183.186) as the `localhost` server; its Traefik proxy holds ports 80/443 and passes hosts it doesn't route on to the host nginx, which still serves other sites. The resource lives in the **Inertia** project, `production` environment.
2. **Database access.** Nothing to add: the droplet's IP is already in the MySQL cluster's Trusted Sources, and the credentials in `config/credentials.yml.enc` keep working unchanged.
3. **Repository.** In Coolify: Sources → add a GitHub App with access to `perfct-ink/inertia`.
4. **Resource.** New resource → the GitHub App source → `perfct-ink/inertia`, branch `main`, build pack **Docker Compose**, compose file `/docker-compose.coolify.yml`.
5. **Domain.** On the `web` service, set the domain to `https://inertia.it.com,https://www.inertia.it.com`. Leave `api` and `collab` without a domain.
6. **Environment.** Add `RAILS_MASTER_KEY` (plus any social sign-in values) as above.
7. **Auto Deploy.** Turn it on under the resource's Advanced settings so pushes to `main` deploy.
8. **First deploy.** Click Deploy and wait for all three services to report healthy. Before DNS moves, you can check it on a temporary domain (Coolify can generate an sslip.io one) or with `curl -H 'Host: inertia.it.com' http://<server-ip>/healthz`.

## Cutover from the droplet (done 2026-10-21)

Both stacks mounted the same `inertiaitcom_storage` volume, so no uploads were copied. The `web` domain moved from a test sslip.io address to `inertia.it.com`, and the droplet deploy (`deploy/deploy.sh`, `docker-compose.prod.yml`, the host nginx vhost) was removed from the repo. What's left on the droplet is a one-time cleanup by hand, in Coolify → Servers → localhost → Terminal or over SSH:

```
sudo rm /etc/nginx/sites-enabled/inertia.it.com /etc/nginx/sites-available/inertia.it.com && sudo nginx -t && sudo systemctl reload nginx
cd /var/www/inertia.it.com && docker compose down
```

Keep the `inertiaitcom_storage` volume: Coolify uses it.

## Rollback

In Coolify, the resource's **Deployments** tab can redeploy any earlier successful deployment. Migrations don't roll back automatically, so keep schema changes backward compatible or plan their reversal.

## Running the production stack locally

`make build-coolify` builds the three production images. To run them, supply `RAILS_MASTER_KEY` (or `SECRET_KEY_BASE`, `JWT_SECRET_KEY` and a `DATABASE_URL` for a local MySQL) and publish `web`'s port 80.
