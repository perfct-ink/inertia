# Inertia

Document editor, file manager, and task tracker. Rails API + React frontend.

Docs index: [spaces](spaces.md), [services and configuration](services.md), [UI components](ui-components.md), [keyboard shortcuts](keyboard-shortcuts.md), [getting started checklist](onboarding.md), [rules](rules/), [features](features/README.md), [backlog](backlog/) (one file per task).

Create Documents, Sheets, or Collections from the file list, folder overview, or sidebar. Collections have named fields with text, integer, number, boolean, date, datetime, or relation datatypes. Relation fields link to one record in another Space collection using a database foreign key; multiple records can reference the same record. Collection records are saved individually, and dates/times are entered in UTC. Clear a field's values before changing its datatype. Referenced records and collections must be unlinked before deletion.

## Linting and tests

```bash
npm run lint   # ESLint + Stylelint (frontend), ESLint (collab-server)
npm test       # Jest (frontend), Vitest (collab-server)
```

Backend tests: `docker compose run --rm backend bin/rails test`.

Rails migration timestamps must be unique across branches. Keep existing migration versions and assign each new migration an unused timestamp before merging; regenerate `backend/db/schema.rb` after migrating. CI and Deploy both validate the migration list when preparing their test databases.

## Running locally

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5174 |
| API | http://localhost:3000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### Against the live database

`make dev-live` runs the same local stack, but the API uses the production database (`inertia_production` on shared-postgres). Because the database isn't public, `scripts/dev-live-db.sh` opens an SSH tunnel through the server (`ssh general`, which must be in the server's `docker` group), reads `DATABASE_URL` from the running production `api` container, and points the local backend at `host.docker.internal:15432`; `docker-compose.live-db.yml` is layered on top. Nothing is written to disk.

- **Writes are real.** Use `make dev-live-readonly` to open every transaction read-only (anything that saves, signing in included if it writes, will fail).
- Auth bypass is off, so you sign in with your production account rather than acting as `User.first`.
- The backend skips `db:prepare`, so local migrations never run against production. Don't run `make db-migrate` or other `db-*` targets while it's up.
- Uploads live on the server's storage volume, so attachments and file previews don't load locally.
- `make dev-live-down` stops the stack and closes the tunnel; `make dev` switches back to the local database.

Overrides: `LIVE_DB_SSH_HOST` (default `general`) and `LIVE_DB_PORT` (default `15432`).

## Project structure

```
inertia/
├── backend/      # Rails 7 API
├── frontend/     # React + webpack frontend
└── docker-compose.yml
```

### Marketing pages

`/`, `/features`, `/pricing` and `/about` are server-rendered by `MarketingController`
(`backend/app/views/marketing/`, layout `layouts/marketing.html.erb`); nginx forwards only
those exact paths to Rails. Their CSS and the theme script are inline in the layout because
nginx serves every other `.css`/`.js` from the SPA build with a one-year immutable cache, so
an unhashed stylesheet there could never be updated.

Dark mode follows the system setting through CSS `light-dark()` colors. The header toggle
pins light or dark with `data-theme` on `<html>` and remembers it in `localStorage`
(`inertia-marketing-theme`). When the app ships something new, update `features.html.erb`
and the home page grid to match.

## API endpoints

```
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
DELETE /api/v1/auth/logout

GET    /api/v1/workspace        # active workspace (X-Workspace-Id header)
PATCH  /api/v1/workspace
GET    /api/v1/workspaces       # see docs/spaces.md for members and roles

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

GET    /api/v1/tables/:id
POST   /api/v1/tables/:id/fields
PATCH  /api/v1/tables/:id/fields/:field_id
DELETE /api/v1/tables/:id/fields/:field_id
POST   /api/v1/tables/:id/records
PATCH  /api/v1/tables/:id/records/:record_id
DELETE /api/v1/tables/:id/records/:record_id

GET    /api/v1/documents/:document_id/tasks
POST   /api/v1/documents/:document_id/tasks
GET    /api/v1/tasks           # all tasks across workspace
PATCH  /api/v1/tasks/:id         # moving dates obeys the task folder's dependency mode (422 when strict refuses)
DELETE /api/v1/tasks/:id

GET    /api/v1/shares?document_id=:id   # or ?folder_id=:id; the links of one item (writers only)
POST   /api/v1/shares                   # { document_id | folder_id, share: { permission: "view", expires_in_days } }
GET    /api/v1/shares/:id
DELETE /api/v1/shares/:id               # turn a link off
GET    /api/v1/shared/:token            # public, no sign-in: read-only document, folder listing or roadmap
GET    /api/v1/shared/:token/documents/:document_id   # public: a document inside a shared folder
```

## Deploy

Production runs on **Coolify**: one Docker Compose resource (`docker-compose.coolify.yml`) with an nginx `web` service for the frontend, the Rails `api` and the `collab` WebSocket service, behind Coolify's TLS proxy. The database is the shared PostgreSQL in Coolify's Shared Infrastructure project (`DATABASE_URL`), and the other production secret is `RAILS_MASTER_KEY`, which decrypts `backend/config/credentials.yml.enc`. A push to `main` deploys through Coolify once CI passes. Setup, configuration, cutover and rollback are in [deployment.md](deployment.md).

### Native macOS preview (SwiftUI)

Run `make dev-mac` to start the local API and web services, build the native app, and open it connected to localhost. Service logs stream until the app closes; the services stay running afterward. The Mac shell provides native sign-in and file handling, then loads the existing React workspace, including its sidebar and tabs, in WKWebView. Use `make dev-electron` for Electron development, or `make dev-native-mac` to build and open the native app with production endpoints. See [macOS setup and current scope](../macos/README.md) and [UI component organization](ui-components.md); run `make test-native-mac` for its tests.

Native Inertia also opens **`.inertia-tasks` files**: portable local files using the existing Task, Epic, Event, and User entities, with Workboards and optional sprint/comment extensions. Use File → New/Open/Save in the native app. See the [file format](task-file-format.md) and [sample file](examples/Launch.inertia-tasks).

See [Storage options: database, blobs, and user-owned files](storage-options.md) for the proposed storage direction and iCloud Drive/Dropbox tradeoffs.
