# Inertia

Document editor, file manager, and task tracker. Rails API + React frontend.

## Running locally

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5174 |
| API | http://localhost:3000 |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

## Project structure

```
inertia/
├── backend/      # Rails 7 API
├── frontend/     # React + webpack frontend
└── docker-compose.yml
```

## API endpoints

```
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
DELETE /api/v1/auth/logout

GET    /api/v1/workspace
PATCH  /api/v1/workspace

GET    /api/v1/folders
POST   /api/v1/folders
GET    /api/v1/folders/:id
PATCH  /api/v1/folders/:id
DELETE /api/v1/folders/:id

GET    /api/v1/folders/:folder_id/documents
POST   /api/v1/folders/:folder_id/documents
GET    /api/v1/documents/:id
PATCH  /api/v1/documents/:id
DELETE /api/v1/documents/:id

GET    /api/v1/documents/:document_id/tasks
POST   /api/v1/documents/:document_id/tasks
GET    /api/v1/tasks           # all tasks across workspace
PATCH  /api/v1/tasks/:id
DELETE /api/v1/tasks/:id

POST   /api/v1/shares
GET    /api/v1/shares/:id
DELETE /api/v1/shares/:id
GET    /shared/:token
```

## Deploy

Deploys via **GitHub Actions** (`.github/workflows/deploy.yml`) to `inertia.it.com`, a shared Ubuntu box (`104.131.183.186`) that also hosts several other sites under the same `deploy` account (see `~/Sites/pocketproducer-web` for another app on the same host — this setup mirrors it). Every push to `main`: runs the full backend test suite, builds the webpack frontend, builds both the Rails API's Docker image (`backend/Dockerfile`) and the real-time collaboration service's image (`collab-server/Dockerfile`), streams both compressed images over SSH into `docker load` on the host, then runs `deploy/deploy.sh`. The script copies the frontend build for nginx to serve and starts Rails behind `/api` and Active Storage, plus the collab service behind `/collab` (WebSocket). The database is a **DigitalOcean managed MySQL cluster** (not co-located with the app). No container registry, Kamal, Capistrano, or building on the server itself.

No Redis and no `/cable` route in production: `app/channels` is unused rails-new boilerplate (no real-time feature anywhere in the app), so `config/cable.yml`'s production adapter is `async`, not `redis`.

All production secrets come from Rails' encrypted credentials (`config/credentials.yml.enc`), not plain environment variables: `secret_key_base`, `jwt_secret_key` (what `config/initializers/devise.rb` signs auth tokens with), and `database.{host,port,username,password}` (what `config/database.yml`'s `production` block connects with) all live in that one encrypted file. The **only** secret actually passed into production is `RAILS_MASTER_KEY`, which decrypts it. Verified end-to-end locally: built the production image, ran it with only `RAILS_MASTER_KEY` set against a real MySQL container, and completed a real signup that returned a valid JWT.

`~/Sites/server-config` is **bootstrapping-only** — it installs Docker/nginx/certbot, creates the shared `deploy` account and its narrow sudoers grant, and ships the nginx snippets every vhost includes. It never touches this app's own directory, nginx vhost, or certs; `deploy/deploy.sh` in this repo owns all of that (compose file, `.env`, container lifecycle, this app's nginx vhost, its own `certbot` call), per that repo's README "Conventions for per-app deploy scripts".

### One-time setup

1. `inertia.it.com` (and `www.inertia.it.com`) already resolve to `104.131.183.186`.
2. `deploy/server_setup.sh` — creates this app's database on the managed MySQL cluster (needs a `mysql` client locally; no SSH/sudo required). Requires the machine running it to be in the cluster's **Trusted Sources** in the DigitalOcean control panel, or it'll hang trying to connect. Prompts for the cluster host/port — same cluster as `~/Sites/pocketproducer-web` if this is sharing that infrastructure. Prints the exact `database:` block to add to credentials afterward — see the next step.
3. Put the real database host/port/username/password from step 2 into `config/credentials.yml.enc`: `RAILS_MASTER_KEY=$(cat backend/config/master.key) bin/rails credentials:edit` (run from `backend/`). `secret_key_base` and `jwt_secret_key` are already populated with generated values — nothing to do there.
4. Install this app's narrow sudoers grant on the server, by hand, as `admin` — see `deploy/server/sudoers.d/inertia-web`'s own header for the exact commands. This is on top of the shared grant `~/Sites/server-config`'s `bootstrap.sh` installs for `deploy`, and covers only this app's own vhost content and its one `certbot` invocation.
5. In Settings → Secrets and variables → Actions, add the repository secrets `RAILS_MASTER_KEY` (the contents of `backend/config/master.key` — **not committed to git**, so this is the only place it needs to be copied to) and `DEPLOY_SSH_KEY` (a private key whose public half is authorized on the `deploy` account). Optionally add `RAILS_ENV` as a repository variable (defaults to `production`).
6. Push to `main` (or run the workflow manually) — this first run transfers the image, brings up the container, picks and persists a `HOST_PORT`, installs an HTTP-only vhost, requests the TLS cert via `certbot certonly --webroot`, then swaps in the full HTTPS vhost. See `deploy/deploy.sh`'s own header for the exact bootstrap order and why it matters (nginx can't reload with a vhost pointing at cert files that don't exist yet).

### Ongoing deploys

Just push to `main` — the workflow transfers `inertia-backend:latest` and the frontend build, then `deploy/deploy.sh` re-runs in full. To run the script by hand, first load that image onto the host and build `frontend/dist`, then run:
```
RAILS_MASTER_KEY=$(cat backend/config/master.key) deploy/deploy.sh
```

Useful host-level one-offs from `~/Sites/server-config` (bootstrapping/inspection only — never this app's deploy):
```
./site.sh list                  # every site on the host, its port, its cert expiry
./site.sh logs inertia.it.com   # tail container logs
./site.sh pull-nginx            # mirror the server's /etc/nginx into that repo's nginx/, to check for drift
```

### Native macOS preview (SwiftUI)

Run `make dev-native-mac` to build and open the native app. This first migration stage provides native project dashboards, task management, and an event agenda, with the existing document/spreadsheet editors embedded in WKWebView. Electron remains available through the existing targets. See [macOS setup and current scope](macos/README.md); run `make test-native-mac` for its tests.
