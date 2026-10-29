# Services and configuration

Every internal and external service Inertia uses, why it is used, and the configuration it needs. Keep this file current when adding or removing a service or variable.

## Internal services

| Service | Where | Why |
| --- | --- | --- |
| Rails API | `backend/` (port 3000) | JSON API for workspaces, folders, documents, tasks, epics, events, shares and imports. Authenticates with Devise + JWT. |
| React frontend | `frontend/` (port 5174 in dev) | The workspace UI for the browser, Electron, the Capacitor iOS shell and the Mac app's WKWebView. Built with webpack and SCSS. |
| Collab server | `collab-server/` (port 1234) | Real-time collaborative document editing (Yjs/Hocuspocus). Holds no secrets: it asks Rails (`GET /api/v1/documents/:id`) to authenticate and authorize each connection. |
| AI workers | `backend/app/services/ai_workers/`, `AiWorkerRunJob` | Runs a task through a language model and stores the reply on an `ai_runs` row (see `docs/features/ai_workers.md`). The model call goes through `AiWorkers.client`, which is unset by default, so runs fail with "No AI client is configured" until the Anthropic adapter is added. A run only stores text; it cannot edit tasks or documents. Jobs use the in-process queue, like the Quip import. |
| Native Mac app | `macos/` | SwiftUI shell for native sign-in and local `.inertia-tasks` files; loads the React workspace in WKWebView. |

## Data stores

The Docker frontend starts through `frontend/scripts/start-dev.sh`. It compares the package and lockfile hashes with the dependency volume and runs `npm ci` when they change. Restart the frontend after webpack configuration changes (`docker compose restart frontend`); webpack loads its configuration when the process starts.

| Service | Why | Notes |
| --- | --- | --- |
| PostgreSQL 16 | Primary database for all workspace data. | Dev and CI: `postgres:16-alpine` container. Production: `inertia_production` on the shared PostgreSQL in Coolify's Shared Infrastructure project, via `DATABASE_URL`. |
| Redis 7 | Development container only. | Not used in production: `config/cable.yml` uses the in-process `async` adapter because no feature broadcasts yet. |
| Active Storage (local disk) | File and media uploads attached to documents. | |

## External services

| Service | Why | Used by |
| --- | --- | --- |
| Google OAuth | "Continue with Google" sign-in. | `backend/app/services/auth/social_sign_in.rb` |
| Sign in with Apple | "Continue with Apple" sign-in. | `backend/app/services/auth/social_sign_in.rb` |
| Anthropic API (planned) | The AI worker's language model calls, once the adapter exists. Needs the official `anthropic` Ruby gem and `ANTHROPIC_API_KEY`; neither is wired up yet. Default model `claude-opus-5-5`. Task text is sent to Anthropic, so say so wherever workers are shown to users. | `backend/app/services/ai_workers.rb` (the client seam) |
| Quip API | Importing a user's Quip folders and documents. The user supplies their own Quip token per import; it is not stored as app config. | `backend/app/services/quip/` |
| Coolify | Builds and runs the production stack from `docker-compose.coolify.yml`, routes the domain and issues TLS certificates (Traefik + Let's Encrypt). | `docker-compose.coolify.yml`, [deployment.md](deployment.md) |
| DigitalOcean | The droplet Coolify runs on. Inertia no longer uses the managed MySQL cluster; its database there was dropped on 2026-10-29. | |
| GitHub Actions | CI (`.github/workflows/ci.yml`). Its last job deploys `main` through Coolify's API once every other job passes; Coolify's Auto Deploy is off. | |
| Public npm registry | Installs frontend and collab dependencies locally and in CI. Lockfile URLs must use `registry.npmjs.org`, with no private registry credentials required. | `frontend/package-lock.json`, `collab-server/package-lock.json` |
| nginx | Serves the static frontend and proxies the marketing pages, `/api`, Active Storage and `/collab` (the `web` service). | `frontend/nginx/default.conf` |

See [Mac social sign-in](mac-social-sign-in.md) for provider setup steps.

## Configuration variables

### Rails API (`backend/`)

| Variable | Purpose | Default / notes |
| --- | --- | --- |
| `RAILS_MASTER_KEY` | Decrypts `config/credentials.yml.enc` (production secrets: `secret_key_base`, `jwt_secret_key`, database credentials). | Required in production. The only secret passed to the production container. |
| `JWT_SECRET_KEY` | Signs auth tokens (Devise JWT). | Required in dev. Tests supply a test-only default before boot. In production it comes from credentials. |
| `DATABASE_HOST`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | PostgreSQL connection in dev and test. | Dev compose: `postgres` / `postgres` / `password`. |
| `DATABASE_URL` | Production PostgreSQL connection (shared PostgreSQL on Coolify). | Required in production. |
| `RAILS_MAX_THREADS`, `PORT`, `RAILS_LOG_LEVEL` | Puma/Rails runtime tuning. | Optional. |
| `CORS_ORIGINS` | Comma-separated origins allowed to call the API. | Dev: `http://localhost:5174,capacitor://localhost` (the iOS WKWebView origin). |
| `APP_URL` | Public base URL of the API. | Dev: `http://localhost:3000`. |
| `BYPASS_AUTH` | `true` makes every request run as the first seeded user. Never enable in production. | Dev compose defaults to `true`. Set `false` to test real accounts. |
| `OAUTH_CALLBACK_BASE_URL` | Public origin that receives OAuth provider callbacks. | Required for social sign-in. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth web client. | Optional; provider is disabled when unset. |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Sign in with Apple (Services ID, team, key ID, `.p8` contents). | Optional; provider is disabled when unset. |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI workers. | Not read yet: the adapter that uses it is not built. Optional; workers stay off without it. |
| `REDIS_URL` | Redis connection (development container). | Not used in production. |

### Frontend (`frontend/`, read at build time by webpack `DefinePlugin`)

| Variable | Purpose |
| --- | --- |
| `API_URL` | Base URL of the Rails API. |
| `COLLAB_URL` | WebSocket URL of the collab server. |
| `BYPASS_AUTH` | Skips the login screen in development. |
| `ELECTRON_DEV_SERVER_URL` | Dev server the Electron shell loads (`npm run electron:dev`). |

### Collab server (`collab-server/`)

| Variable | Purpose |
| --- | --- |
| `RAILS_INTERNAL_URL` | Rails base URL used to authenticate and authorize connections. |
| `PORT` | WebSocket listen port (1234). |

### Native Mac app

| Variable | Purpose |
| --- | --- |
| `INERTIA_API_URL`, `INERTIA_WEB_URL` | API and web origins. `make dev-mac` sets them to localhost. |

### Deployment (GitHub Actions secrets and variables)

| Secret | Purpose |
| --- | --- |
| `COOLIFY_WEBHOOK`, `COOLIFY_TOKEN` | CI's deploy job: the resource's deploy URL and a Coolify API token with deploy permission. Coolify still pulls the repo through its GitHub App. |

Production runtime variables on Coolify (`RAILS_MASTER_KEY`, `APP_URL`, `COLLAB_URL`, `CORS_ORIGINS`, social sign-in) are listed in [deployment.md](deployment.md#configuration).


## Dependency integration (2026-10-29)

Dependabot branches were consolidated, retaining newer versions already present on main and keeping removed workflows and Tailwind removed. React and React DOM move together to 19.3.1. Tiptap stays on its shared v2 schema across the web editor and collaboration server. The `image_processing` 2 update requires an explicit `ruby-vips` dependency; Docker images already install libvips.

Two major updates remain deferred: TypeScript 7 is outside `typescript-eslint` 8.72's supported range (`<6.1`), and Babel 8 left TypeScript generic syntax in the existing Jest transform, failing the test suites. The supported TypeScript 5 and Babel 7 toolchains remain in use. Their historical Dependabot branches are integrated in Git ancestry, but these incompatible version changes are deliberately not activated.

Older bot branches that proposed versions below those already in main do not downgrade installed versions. No backlog feature branch is included in this dependency integration.
