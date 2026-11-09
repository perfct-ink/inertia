# Clean URLs

## What it does
Web addresses are plain paths: `/login`, `/signup`, `/space`, `/documents/4`, `/shared/<token>`. Opening one directly, or refreshing on it, shows that page. There is no `#` in the address bar.

- **Old links still work.** A `/#/space` or `/index.html#/tasks?view=backlog` link is rewritten once, on load, to `/space` or `/tasks?view=backlog`. `/index.html` on its own goes to `/`. In-page anchors such as `/documents/4#launch-plan` are left alone.
- **Native apps keep hashes.** Electron (`file://`), the Capacitor iOS app (`capacitor://`) and the native Mac shell use a hash router. The Mac shell is recognised by the `inertiaSession` message handler its WKWebView registers, since it only allows its `/index.html` entry. All of them share the one route list in `frontend/src/App.tsx`.
- **Marketing root.** `/` is the Rails marketing page for signed-out web visitors; signed-in people go on to `/space`. In production nginx serves it at `/`; in development the SPA's `/` route does a full page load of the API origin, and the marketing links to Login and Sign up use `WEB_URL` to point back at the SPA. Electron, iOS and the Mac shell have no marketing site and open at login (Mac: the native sign-up form first).

## How it works
- `frontend/src/main.tsx` picks `BrowserRouter` or `HashRouter` at startup, using `usesHashRouter` and `cleanPath` in `frontend/src/util/router.ts`.
- Assets load from `/` (`publicPath` in `frontend/webpack.config.js`). The Electron and iOS builds set `PUBLIC_PATH=./` (see `docs/services.md`).
- nginx (`frontend/nginx/default.conf`) sends the marketing paths, `/api/`, Active Storage and `/collab` to their services and everything else to `index.html`. It already did this, so it didn't change. Unknown `/api/...` paths reach Rails and come back as a JSON 404. In development, webpack-dev-server's `historyApiFallback` does the same.

## Who can view and change
Not access-controlled; this is routing only. Pages behind sign-in still go through `PrivateRoute`.

## Tests
`frontend/src/util/router.test.ts`: router choice per platform, old-link rewriting, and anchors left alone.

## Known limits
- `/index.html` is redirected in the browser, not by nginx, because the Mac shell loads that path.
- `hierarchical-urls.md` in the backlog (folder-tree paths) builds on this.

## History
- Implemented 2026-11-03, fixing `/login` and `/signup` from the marketing site, which opened the app home instead because the web used a hash router.
- Verified in the browser against the local dev server: `/login`, `/signup`, `/#/tasks?view=backlog`, `/index.html`, a direct load of `/documents/1` and sidebar navigation. Not verified: the Electron and iOS builds and the Mac shell were not launched.
- 2026-11-03: signed-out `/` shows marketing on the web; the Mac login screen opens on a native sign-up form (name, email, password, then signs in). Dev boot creates `test@example.com` / `password123` (`backend/db/dev_user.rb`). `tsc -b`, `npm run lint` (warnings only), Jest (660) and `swift build` passed; Rails tests and the browser/Mac app were not run.
- Deployment: on main, which deploys through Coolify once CI passes (see [deployment.md](../deployment.md)); whether this change is live in production was not checked.
