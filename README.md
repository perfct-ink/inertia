# Inertia

An app for documents, spreadsheets and tasks: rich documents, Excel-like sheets with formulas, Collections (typed tables), and tasks that roll up from checklists in documents, with planning views (Gantt, roadmap, sprints, OKRs) on top.

| Folder | What it is |
| --- | --- |
| `backend/` | Rails 8 JSON API (Devise + JWT, PostgreSQL), plus the public marketing pages |
| `frontend/` | React + SCSS web app (also packaged for Electron and a Capacitor iOS shell) |
| `collab-server/` | Real-time collaborative editing (Yjs / Hocuspocus) |
| `macos/` | Native SwiftUI Mac app (sign-in and local `.inertia-tasks` files; loads the web app in a WKWebView) |
| `docs/` | Documentation, rules and the backlog |

## Quick start

```bash
make setup   # install host dependencies, build images, prepare and seed the database
make dev     # rebuild, start attached, and open http://localhost:5174
make test    # every test suite
make help    # every command, grouped
```

Needs Docker. `make dev` uses a local PostgreSQL; `make dev-live` is the one command that points at the live database (see [docs/README.md](docs/README.md#against-the-live-database)).

## Documentation

Start at [docs/README.md](docs/README.md): running locally, services and configuration ([docs/services.md](docs/services.md)), deployment ([docs/deployment.md](docs/deployment.md)), the implemented features ([docs/features/README.md](docs/features/README.md)) and the planned work ([docs/backlog/](docs/backlog/)). Rules for contributors and agents are loaded through [AGENTS.md](AGENTS.md).
