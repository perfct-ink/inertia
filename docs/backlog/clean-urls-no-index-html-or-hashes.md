---
priority: p1
depends_on: []
components: [frontend, backend, deploy]
---
# Clean URLs: no index.html, no hashes

## Objective
Web URLs are plain paths on the root (`/space`, `/login`), never `/index.html` and never `/#/...`. A catch-all serves the SPA and the JS router handles the path.

## Context
`frontend/src/main.tsx` wraps the app in `HashRouter`, so every web URL is `/#/route`. `publicPath` is `./` in production (`frontend/webpack.config.js`), which suits Electron and the Capacitor iOS app because they load `frontend/dist/index.html` off disk, where a path router has nothing to resolve. nginx (`deploy/server/sites-available/inertia.it.com.conf`) proxies only the exact public marketing paths to Rails and falls through to the static build for the rest. Dev already has `historyApiFallback: true`.

Related: `hierarchical-urls.md` (folder-tree paths) builds on this.

## Requirements
- Web uses `BrowserRouter` (or the data-router equivalent) so URLs are real paths.
- Visiting `/index.html` redirects to `/`.
- The server falls back to the SPA `index.html` for any path that is not a static asset, an `/api` route, or a Rails marketing page (`/features`, `/pricing`, `/about`, `robots.txt`, `sitemap.xml`). Unknown API paths still return JSON 404, not HTML.
- Production assets load from an absolute `/` public path on web so deep links like `/shared/abc` still find their bundles.
- Electron and the iOS app keep working from `file://`: they keep a hash (or memory) router, chosen at startup by platform. Do not duplicate route definitions between the two.
- Existing `/#/...` links redirect once to the equivalent path, so bookmarks and shared links don't break.
- Share links, OAuth callbacks and any other generated URLs use the new form.
- Marketing root (`/`) still goes to Rails for logged-out visitors; decide and document how a signed-in visitor reaches the app at `/` without a conflict.

## Acceptance criteria
- Loading `/space`, `/login` and `/shared/<token>` directly in a browser renders the right screen, with no `#` in the address bar while navigating.
- Refreshing on any in-app path works.
- `/index.html` ends at `/`.
- An old `/#/space` link lands on `/space`.
- `/api/v1/nope` returns a JSON 404.
- Electron and iOS builds still launch and navigate.
- Tests cover the router selection and the legacy-hash redirect; nginx config change is documented in `docs/` (services/deploy).
