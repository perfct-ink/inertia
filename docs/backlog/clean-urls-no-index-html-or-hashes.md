---
priority: p1
depends_on: []
components: [frontend, backend, deploy]
branch: backlog/clean-urls-no-index-html-or-hashes
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

## Blocked
Built on branch `backlog/clean-urls-no-index-html-or-hashes`, not merged. See `docs/features/clean_urls.md` (what exists) and `docs/deployment.md` ("URLs and the web server").

Done: `AppRouter` picks `BrowserRouter` or `HashRouter` by platform (`util/route.ts`, one set of routes in `App.tsx`); `redirectLegacyUrl` rewrites `/#/route` and `/index.html` before the router mounts; the Rails marketing layout forwards `/#/route` itself; nginx falls back to the SPA for any non-file path, redirects `/index.html` to `/` and sends `index.html` with `no-cache`; web assets use `publicPath: '/'` and `npm run build:native` keeps `./` for Electron and Capacitor; unknown `/api` paths are a JSON 404; the Mac app opens `/documents`; docs updated.

Ran: `/tmp/runner/all.sh` (static parse of changed files, the pure unit tests including `util/route.test.ts`: 16 pass), `ruby -c` on the changed Ruby, `swift build --target InertiaCore` with warnings as errors, and a scratch script for the Swift URL helper.

Did not run (no network, node_modules, database, nginx): `npm run lint`, `tsc -b`, `npm test` (including `AppRouter.test.tsx`), the production webpack build, `rails test` (new `not_found_controller_test.rb`, `marketing_controller_test.rb`), `nginx -t`, `swift test` (XCTest unavailable), Electron, the iOS app, and a browser at 375px and desktop.

To verify and merge:
1. `cd frontend && npm install && npm run lint && npx tsc -b && npm test`, then `npm run build` and check `dist/index.html` references `/main.<hash>.js` (absolute) and `npm run build:native` references `./main.<hash>.js`.
2. `cd backend && rails test`.
3. `cd macos && swift test`.
4. `docker build -t inertia-web frontend` and `docker run --rm -p 8080:80 inertia-web nginx -t`, or let the stack build on Coolify, then run the curl checks in `docs/deployment.md`.
5. In a browser: `/space`, `/login`, `/shared/<token>` directly and refreshed; `/#/space` and `/index.html` end at `/space` and `/`; no `#` while navigating; try a phone-width window and dark mode (nothing visual changed). Open the packaged Electron app and the iOS simulator build (`npm run build:native`, `npm run cap:sync`) and navigate.

Decision for Alex: how a signed-in visitor reaches the app from `/`. Built the conservative version (Rails still serves `/`; its script sends a signed-in browser to `/space`). Alternatives are in the feature doc ("Open question").

Merge notes: `frontend/ios/README.md`, `docs/features/README.md` (appended row), `macos/.../RequestsTests.swift` and `Models.swift` are shared files. `LoginView.swift` still links `/index.html#/signup`, which works through the redirects; `mac-app-create-account.md` removes it. A Mac app built before this change cannot show the app after deploy and must be rebuilt.
