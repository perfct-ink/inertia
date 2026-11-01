# Clean URLs

## What it does
The web app lives at plain paths on the site root: `/space`, `/login`, `/documents/7`, `/shared/<token>`. There is never a `#` in the address bar while navigating and no `index.html`.

- **Router per platform.** `components/AppRouter.tsx` is the one place the router is chosen, from `detectRouterKind()` in `util/route.ts`. A page served over `http:`/`https:` (web, webpack dev server, the Mac app's WKWebView, Electron pointed at the dev server) gets `BrowserRouter`. A page loaded off disk (`file:` in Electron, `capacitor:` in the iOS app) or running inside Capacitor gets `HashRouter`, because a path has nothing to resolve there. `App.tsx` holds the only set of route definitions.
- **Old links keep working.** Before the change every web URL was `/#/route`. `redirectLegacyUrl()` (called from `main.tsx` before the router mounts) rewrites `/#/route` and `/index.html#/route` to `/route` with `history.replaceState`, so the back button does not bounce. A bare `/index.html` becomes `/`. In production `/` is a Rails page, which never sees the fragment, so the marketing layout carries the same rule in its inline script (`backend/app/views/layouts/marketing.html.erb`) and forwards `/#/route` links itself. Both only accept a path on this site: `#//host` and `#/\host` are ignored.
- **Server fallback** (`frontend/nginx/default.conf`). Anything that is not a real file in the build, `/api/`, `/rails/active_storage/`, `/collab` or a marketing page is answered with the SPA shell (`index.html`, `Cache-Control: no-cache`) so deep links and refreshes work. The fallback uses a named location (`@spa`) so it does not re-enter the `/index.html` redirect. `/index.html` itself answers `301 /` (relative `Location`; the fragment survives the redirect).
- **Absolute asset paths.** `npm run build` (the web image) uses `publicPath: '/'`, so `/shared/abc` finds `/main.<hash>.js`. `npm run build:native` (`BUILD_TARGET=native`) keeps `./` for the Electron and Capacitor bundles; `electron:build-mac` and `cap:sync` now run it.
- **Unknown API paths are JSON 404.** `match "api/*path"` is the last route in `config/routes.rb` and answers `{"error":"Not found"}` with 404 whatever the verb or `Accept` header (`Api::V1::NotFoundController`).
- **Mac app.** `Requests.workspaceURL` now opens `https://<host>/documents` and `Requests.isWorkspaceURL` decides which same-origin URLs the WKWebView may show: app paths, not `/`, `/index.html`, the marketing pages, `/api/`, `/rails/` or `/collab`.
- **Signed-in visitors at `/`.** Rails still owns `/` (the marketing home) for everyone. Its inline script sends a visitor whose browser holds a login (`inertia-auth` in localStorage) straight to `/space` before the page paints; previously it went to `/workspace`, which the SPA then redirected. Logged-out visitors and crawlers see the marketing HTML. See Open question below.
- **Generated URLs.** There are no frontend-generated share links yet (the share UI does not exist); a share link is `/shared/<token>`, the route `App.tsx` already defines. The social sign-in callback returns to the native custom scheme (`com.inertia.native://auth/callback`), not to a web URL. The marketing pages already linked to `/login` and `/signup`. `robots.txt` now also disallows `/space`.

## Who can view and change
Routing only; permissions are unchanged. `/shared/<token>` is public; every other app path shows the login screen without a token.

## Web entry points
Every route in `frontend/src/App.tsx` at its plain path. The legacy `/workspace` route still redirects to `/space`.

## API endpoints and models
No new models. One new catch-all route: any method on `/api/*` that no other route matches returns 404 JSON.

## Tests
- `frontend/src/util/route.test.ts`: router choice by platform, the legacy-hash rewrite (including open-redirect guards and the hash-router shells being left alone). Run offline with the shim.
- `frontend/src/components/AppRouter.test.tsx`: the browser router writes real paths, the hash router writes `#/path` (RTL; needs `npm test`).
- `backend/test/controllers/not_found_controller_test.rb`: JSON 404 for unknown API paths, any verb or `Accept`; known routes are not swallowed.
- `backend/test/controllers/marketing_controller_test.rb`: the home page's `/space` redirect and legacy-hash forwarding, `robots.txt`.
- `macos/Tests/InertiaCoreTests/RequestsTests.swift`: the Mac workspace URL and which URLs the web view shows.

## Known limits
- The legacy hash rule exists twice, by necessity: in `util/route.ts` (tested) and as a few lines of inline JavaScript in the Rails marketing layout (only checked by a body-contains test). Keep them in step.
- The nginx change cannot be tested offline; see `docs/deployment.md` for the checks to run after deploying.
- A Mac app built before this change loads `/index.html#/documents`, which is now redirected to `/` and is not shown by that build's web view; rebuild the Mac app.
- `LoginView.swift`'s "Create an account" link still points at `/index.html#/signup`. It works through the redirects (`/index.html` to `/`, then `/#/signup` to `/signup`); `docs/backlog/mac-app-create-account.md` removes the link.
- Unknown paths that look like files with a non-listed extension (for example `/favicon.ico`) get the SPA shell with status 200, not a 404.
- The Electron dev shell (`npm run electron:dev`) uses real paths because it loads the dev server over http; only the packaged app and the iOS app use the hash router. The packaged Electron and iOS builds were not run.

## Open question: `/` for signed-in visitors
`/` is the Rails marketing page, and Rails cannot see the JWT (it lives only in localStorage), so a signed-in visitor still gets one marketing response and is bounced by script. The conservative choice is kept: no new cookie, no server-side session state, no flash of marketing content (the script runs in `<head>`). The alternatives are a non-HttpOnly "signed in" cookie that nginx checks (`if ($cookie_inertia_signed_in)` serves the SPA at `/`), or moving the marketing page off `/`. Both change auth storage or the public URL, so they are left for Alex.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/clean-urls-no-index-html-or-hashes`).
- Not implemented: sharing UI that copies a `/shared/<token>` link; a server-side answer for signed-in visitors at `/`; hierarchical folder URLs (`docs/backlog/hierarchical-urls.md`).
- Not verified: the Jest suite (including `AppRouter.test.tsx`), `npm run lint`, `tsc`, the webpack production build, the Rails tests, nginx (`nginx -t` and the redirect and fallback behavior), Electron, the iOS app and a browser at 375px and desktop. Run: the pure `util/route.test.ts` tests with the offline shim, `ruby -c` on the changed Ruby, the ERB and Swift syntax (`swift build --target InertiaCore`). The Swift tests did not run (XCTest is not available here); the URL helper was exercised with a scratch script instead.
