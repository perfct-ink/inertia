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
| MCP server and agent API | `backend/app/controllers/mcp_controller.rb`, `backend/app/services/agent_tools.rb` | Lets Claude, Claude Code and other agents read and edit a Space with a revocable per-Space token (`/mcp`, `/api/v1/agent/tools`). Needs no config; the reverse proxy must forward `/mcp` to Rails. Tokens are stored as SHA256 digests. |

## Data stores

The Docker frontend starts through `frontend/scripts/start-dev.sh`. It compares the package and lockfile hashes with the dependency volume and runs `npm ci` when they change. Restart the frontend after webpack configuration changes (`docker compose restart frontend`); webpack loads its configuration when the process starts.

| Service | Why | Notes |
| --- | --- | --- |
| MySQL 8 | Primary database for all workspace data. | Dev: `mysql` container. Production: a DigitalOcean managed MySQL cluster. |
| Redis 7 | Development container only. | Not used in production: `config/cable.yml` uses the in-process `async` adapter because no feature broadcasts yet. |
| Active Storage (local disk) | File and media uploads attached to documents. | |

## External services

| Service | Why | Used by |
| --- | --- | --- |
| Google OAuth | "Continue with Google" sign-in. | `backend/app/services/auth/social_sign_in.rb` |
| Sign in with Apple | "Continue with Apple" sign-in. | `backend/app/services/auth/social_sign_in.rb` |
| Anthropic API (planned) | The AI worker's language model calls, once the adapter exists. Needs the official `anthropic` Ruby gem and `ANTHROPIC_API_KEY`; neither is wired up yet. Default model `claude-opus-5-5`. Task text is sent to Anthropic, so say so wherever workers are shown to users. | `backend/app/services/ai_workers.rb` (the client seam) |
| Quip API | Importing a user's Quip folders and documents. The user supplies their own Quip token per import; it is not stored as app config. | `backend/app/services/quip/` |
| DigitalOcean | Hosting (Ubuntu droplet) and the managed MySQL cluster. | `deploy/` |
| GitHub Actions | CI (`.github/workflows/ci.yml`) and deploys to production on push to `main` (`deploy.yml`). | |
| Public npm registry | Installs frontend and collab dependencies locally and in CI. Lockfile URLs must use `registry.npmjs.org`, with no private registry credentials required. | `frontend/package-lock.json`, `collab-server/package-lock.json` |
| nginx + certbot (Let's Encrypt) | Serves the static frontend, proxies `/api` and `/collab`, terminates TLS. | `deploy/` |

See [Mac social sign-in](mac-social-sign-in.md) for provider setup steps.

## Configuration variables

### Rails API (`backend/`)

| Variable | Purpose | Default / notes |
| --- | --- | --- |
| `RAILS_MASTER_KEY` | Decrypts `config/credentials.yml.enc` (production secrets: `secret_key_base`, `jwt_secret_key`, database credentials). | Required in production. The only secret passed to the production container. |
| `JWT_SECRET_KEY` | Signs auth tokens (Devise JWT). | Required in dev. Tests supply a test-only default before boot. In production it comes from credentials. |
| `DATABASE_HOST`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | MySQL connection. | Dev compose: `mysql` / `root` / `password`. Production: credentials. |
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

### Deployment (GitHub Actions secrets)

| Secret | Purpose |
| --- | --- |
| `RAILS_MASTER_KEY` | Passed to the production container. |
| `DEPLOY_SSH_KEY` | Private key authorized on the server's `deploy` account. |
| `RAILS_ENV` (variable, optional) | Defaults to `production`. |
