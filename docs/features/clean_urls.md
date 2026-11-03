# Clean URLs

## What it does
Web addresses are plain paths: `/login`, `/signup`, `/space`, `/documents/4`, `/shared/<token>`. Opening one directly, or refreshing on it, shows that page. There is no `#` in the address bar.

- **Old links still work.** A `/#/space` or `/index.html#/tasks?view=backlog` link is rewritten once, on load, to `/space` or `/tasks?view=backlog`. `/index.html` on its own goes to `/`. In-page anchors such as `/documents/4#launch-plan` are left alone.
- **Native apps keep hashes.** Electron (`file://`), the Capacitor iOS app (`capacitor://`) and the native Mac shell use a hash router. The Mac shell is recognised by the `inertiaSession` message handler its WKWebView registers, since it only allows its `/index.html` entry. All of them share the one route list in `frontend/src/App.tsx`.
- **Marketing root.** `/` is the Rails marketing page for everyone, signed in or not. Its Sign in and Sign up links go to `/login` and `/signup`, and signed-in people reach the app at `/space`. Inside the app, a link to `/` goes to `/space` without a page load.

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
- The Mac app's "Create an account" link still points at `/index.html#/signup`. It works through the rewrite.
- `hierarchical-urls.md` in the backlog (folder-tree paths) builds on this.

## History
- Implemented 2026-11-03, fixing `/login` and `/signup` from the marketing site, which opened the app home instead because the web used a hash router.
- Verified in the browser against the local dev server: `/login`, `/signup`, `/#/tasks?view=backlog`, `/index.html`, a direct load of `/documents/1` and sidebar navigation. Not verified: the Electron and iOS builds and the Mac shell were not launched.
