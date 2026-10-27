## Repo Layout

```
backend/          Rails 8 API (api_only), Ruby 3.3.5, PostgreSQL 16
  app/controllers/api/v1/   all REST endpoints (routes under /api/v1)
  app/channels/             ActionCable: chat, DMs, script_channel (Yjs byte relay)
  app/lib/                  PDF generation (Prawn), screenplay parsing (PDF/FDX/Fountain), storage migrator
  app/services/             Stripe billing, Google ID-token verification, production passes
  lib/active_storage/service/  PrefixedS3Service (Spaces under the pp/ prefix)
  test/                     Minitest: models, requests, channels, integration, mailers, jobs, services
web/              React 19 + TypeScript + Vite 8 + Tailwind v4
  src/api/        one module per resource on top of client.ts (fetch wrapper, JWT in localStorage)
  src/types/models.ts  mirrors the API's as_json shapes, snake_case (no camelCase mapping layer)
  src/pages/      one folder per feature (screenplays, shotlists, budget, callsheets, ...)
  src/lib/productionNav.ts  production sidebar/tabs; BUILT_TABS is the parity checklist
  src/marketing/  static prerendered / and /pricing (see web/README.md "Public pages and SEO")
deploy/           server_setup.sh (creates the app database on the managed cluster)
docs/             rules/ (agent rules), backlog/ (one file per open task), features/ (one doc per shipped feature), pricing-model.md, CLAUDE.md.template (see below)
docker-compose.yml       local dev: db + api + web
docker-compose.coolify.yml  prod on Coolify: web + api + collab (the database is the shared PostgreSQL on Coolify)
Makefile          local-dev wrapper around docker compose
```

`docs/CLAUDE.md.template` is a **reusable template for other projects**, not instructions for this repo. Don't follow or edit it as if it were. The root `AGENTS.md` is a short loader for the agent rules in `docs/rules/`, which are the source of truth; `CLAUDE.md` just imports `AGENTS.md` for Claude Code, so edit the rules (or `AGENTS.md`), not `CLAUDE.md`.

### Web and iOS

Gigs (with reviews and referrals), Collaboration posts, DMs, and Notifications are on both, under the web sidebar's Community section (`web/src/pages/community/`). Contacts, Shot Lists, AV Scripts, Docs, Screenplays, and Stripboards exist only on web. The ranked iOS gap list and its progress are in [docs/mobile-web-parity.md](docs/mobile-web-parity.md); broader gaps against competitors are in [docs/feature-gaps.md](docs/feature-gaps.md).
