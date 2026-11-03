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
| Active Storage (local disk) | Files embedded in documents: images, video, audio and any other file type, up to 100 MB each (`POST /api/v1/uploads`, see `features/embedded_files.md`). | Files live in `backend/storage` (the `storage` volume in `docker-compose.coolify.yml`). Its tables come from the `create_active_storage_tables` migration. nginx allows 105 MB request bodies on `/api/` (`frontend/nginx/default.conf`). No virus scanning or quota. |

## External services

| Service | Why | Used by |
| --- | --- | --- |
| Google OAuth | "Continue with Google" sign-in. | `backend/app/services/auth/social_sign_in.rb` |
| Sign in with Apple | "Continue with Apple" sign-in. | `backend/app/services/auth/social_sign_in.rb` |
| Anthropic API (planned) | The AI worker's language model calls, once the adapter exists. Needs the official `anthropic` Ruby gem and `ANTHROPIC_API_KEY`; neither is wired up yet. Default model `claude-opus-5-5`. Task text is sent to Anthropic, so say so wherever workers are shown to users. | `backend/app/services/ai_workers.rb` (the client seam) |
| Quip API | Importing a user's Quip folders and documents. The user supplies their own Quip token per import; it is not stored as app config. | `backend/app/services/quip/` |
| Map tile server (optional, none chosen) | Base-map imagery under the pins of a Collection's Map view. Off unless `MAP_TILE_URL` is set at build time; without it the map is a plain latitude/longitude grid and the browser makes no request to any map server. When set, every visitor's browser requests tiles from that server (it sees their IP address and the area viewed, not the page URL: tiles are fetched with `referrerpolicy="no-referrer"`). Which provider to use, its terms, attribution and cost are undecided. OpenStreetMap's public tile servers are not meant for heavy use; a hosted provider with a key would also need the key handled (a key in `MAP_TILE_URL` ships to every browser). | `frontend/src/components/editors/CollectionMap.tsx` |
| Geocoding service (optional, none chosen) | Turns an address or place name typed into a Collection's text field into latitude and longitude, so the record shows on the Map view (see [features/collection_map_view.md](features/collection_map_view.md)). **Off by default: nothing is sent anywhere until `GEOCODER_PROVIDER` is set.** The Rails API calls it when a record is saved (never when a page loads), only for text fields a person has opted in ("Look up addresses for the Map view"), never for text that is already latitude and longitude, and once per distinct text per Space (answers are cached in `geocoded_places`). **Privacy: the text of those fields leaves the server and goes to the provider** (no user, Space or record identifiers; the request carries the server's IP address and the `GEOCODER_USER_AGENT`). The provider's terms, rate limits, cost and whether it may keep or reuse queries are undecided; choosing one, and any API key, is Alex's call. The one adapter built speaks the Nominatim search protocol (`/search?q=...&format=jsonv2`), so it fits a self-hosted Nominatim or a hosted service with the same API; there is deliberately no default server (the public nominatim.openstreetmap.org is not meant for an app's traffic). Another provider is a small class with `lookup(query)`, installed in `Geocoding.provider`. | `backend/app/services/geocoding.rb`, `backend/app/services/geocoding/` |
| openstreetmap.org (link only) | The "Open in OpenStreetMap" link on a map pin opens the record's coordinates on openstreetmap.org in a new tab. Nothing is called by the app; coordinates leave only when a person clicks. | `frontend/src/util/geo.ts` (`openStreetMapUrl`) |
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
| `LIVE_DB_SSH_HOST`, `LIVE_DB_PORT`, `LIVE_DB_READONLY` | `make dev-live`: SSH host for the tunnel to the live database, the local tunnel port, and `1` for read-only transactions (see [README.md](README.md#against-the-live-database)). | Defaults: `general`, `15432`, off. |
| `RAILS_MAX_THREADS`, `PORT`, `RAILS_LOG_LEVEL` | Puma/Rails runtime tuning. | Optional. |
| `CORS_ORIGINS` | Comma-separated origins allowed to call the API. | Dev: `http://localhost:5174,capacitor://localhost` (the iOS WKWebView origin). |
| `APP_URL` | Public base URL of the API. | Dev: `http://localhost:3000`. |
| `BYPASS_AUTH` | `true` makes every request run as the first seeded user. Never enable in production. | Dev compose defaults to `false`, so the app requires sign up or login. Set `BYPASS_AUTH=true` to skip it. |
| `OAUTH_CALLBACK_BASE_URL` | Public origin that receives OAuth provider callbacks. | Required for social sign-in. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth web client. | Optional; provider is disabled when unset. |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Sign in with Apple (Services ID, team, key ID, `.p8` contents). | Optional; provider is disabled when unset. |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI workers. | Not read yet: the adapter that uses it is not built. Optional; workers stay off without it. |
| `REDIS_URL` | Redis connection (development container). | Not used in production. |
| `GEOCODER_PROVIDER` | Switches on geocoding of Collection addresses. The only value is `nominatim` (a Nominatim-compatible search API). | Unset or anything else: geocoding is off and no request is made. |
| `GEOCODER_URL` | Base address of the search API, for example `https://nominatim.internal.example.com`. Use https, since addresses are sent in the request. | Required with `GEOCODER_PROVIDER=nominatim`; with a missing or non-http(s) value geocoding stays off. No default. |
| `GEOCODER_API_KEY` | Optional key, sent as the `key` query parameter (hosted Nominatim-compatible services). Never logged or shown in an error. | Optional. Server-side only. |
| `GEOCODER_USER_AGENT` | The `User-Agent` sent with each lookup; Nominatim's usage policy asks for one that identifies the app and a contact. | Optional; `Inertia`. |

### Frontend (`frontend/`, read at build time by webpack `DefinePlugin`)

| Variable | Purpose |
| --- | --- |
| `API_URL` | Base URL of the Rails API. |
| `COLLAB_URL` | WebSocket URL of the collab server. |
| `BYPASS_AUTH` | Skips the login screen in development. |
| `ELECTRON_DEV_SERVER_URL` | Dev server the Electron shell loads (`npm run electron:dev`). |
| `PUBLIC_PATH` | Where the bundle loads its assets from. Unset means `/`, which the web needs so deep links like `/shared/abc` find their scripts. `npm run electron:build-mac` and `npm run cap:sync` set `./` because those apps load `dist/index.html` off disk. |
| `MAP_TILE_URL` | Optional. An https tile template with `{z}`, `{x}` and `{y}` for the Collection map's base map, for example `https://tiles.example.com/{z}/{x}/{y}.png`. Unset or invalid means no tiles. Public: baked into the bundle, so never put a secret in it. Read by `webpack.config.js`; the production Dockerfile and `docker-compose.coolify.yml` do not pass it through yet. |
| `MAP_TILE_ATTRIBUTION` | Optional. The credit line the tile provider requires, shown in the corner of the map when tiles are on. |

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
