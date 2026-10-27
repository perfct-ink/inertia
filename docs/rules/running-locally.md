## Running locally

Everything runs in Docker (Colima, not Docker Desktop). You don't need Ruby or MySQL on the host.

```sh
make up            # db + api (:3000) + web (:5173); dev startup runs db:prepare + idempotent seeds
make test          # full backend suite (docker compose exec api bin/rails test)
make test-fast     # model tests only
docker compose exec -T api bin/rails db:migrate
docker compose exec -T api bin/rails test test/models/shot_test.rb
```

Web checks (same as CI), run in `web/`: `npm ci`, `npm run lint` (oxlint), `npm run build`. `build` runs `tsc -b`, the Vite build, and the marketing-page generation plus its checks.

A gitignored root `.env` may set `DB_HOST_PORT` / `API_HOST_PORT`, so the API might not be on :3000. Port 3000 on this machine is sometimes an SSH tunnel. Check `docker compose ps` for the real port before hitting the API or browser-testing.

### Container gotchas (all hit for real)

- **New gem:** `docker compose exec -T api bundle install`, then `docker compose restart api`. The running server won't load a gem it booted without, but `bin/rails test` will, so tests pass while the dev server 500s. If another session added gems, tests fail with `Bundler::GemNotFound` until you run `bundle install`.
- **New migration:** after migrating, run `docker compose restart api`. The running server caches column lists.
- **New test database** (for example after the Solid Queue addition): `docker compose exec -T -e RAILS_ENV=test api bin/rails db:prepare`.
- **New npm package:** `web/node_modules` is a named Docker volume, so installing on the host doesn't reach the container. Run `docker compose exec web npm install`, then `docker compose restart web`. Restart `web` after adding new route or page files too.
- **Stale containers or port squatters:** if a service is "healthy" but unreachable, run `docker compose rm -sf <svc> && docker compose up -d <svc>`. Check `lsof -nP -iTCP:5173 -sTCP:LISTEN` for a stray native Vite process.
