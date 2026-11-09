# Clean URLs

## What it does
Web addresses are plain paths: `/login`, `/signup`, `/space`, `/documents/4`, `/shared/<token>`. Opening one directly, or refreshing on it, shows that page. There is no `#` in the address bar.

- **Old links still work.** A `/#/space` or `/index.html#/tasks?view=backlog` link is rewritten once, on load, to `/space` or `/tasks?view=backlog`. `/index.html` on its own goes to `/`. In-page anchors such as `/documents/4#launch-plan` are left alone.
- **Native apps keep hashes.** Electron (`file://`), the Capacitor iOS app (`capacitor://`) and the native Mac shell use a hash router. The Mac shell is recognised by the `inertiaSession` message handler its WKWebView registers, since it only allows its `/index.html` entry. All of them share the one route list in `frontend/src/App.tsx`.
- **Marketing root.** `/` is the Rails marketing page for signed-out web visitors; signed-in people go on to `/space`. In production nginx serves it at `/`; in development the SPA's `/` route does a full page load of the API origin, and the marketing links to Login and Sign up use `WEB_URL` to point back at the SPA. Electron, iOS and the Mac shell have no marketing site and open at login (Mac: the native sign-up form first).
- **How the marketing pages know who is signed in.** They don't, on the server: the sign-in token lives only in the browser (`localStorage`, key `inertia-auth`), there is no session cookie, and the pages stay the same server-rendered, cacheable HTML for everyone (and for crawlers). A small script in the page's head reads the token before the page paints. On `/` it sends a signed-in visitor straight to `/space` (`WEB_URL` + `/space` in development). On every marketing page it marks `<html data-signed-in>`, which swaps the header's Sign in and Sign up for an "Open app" button (CSS only, in the layout). A signed-out visitor, or a crawler, sees the marketing page and its Sign in and Sign up links.
- **Signing in returns you.** A signed-out visitor who opens an app page (say `/documents/4`) is sent to `/login`, and signing in brings them back to that page (`PrivateRoute` keeps the page in the router's location state, `returnPath` in `util/router.ts` reads it). Only a path inside the app counts; anything else, and the sign-in pages themselves, go to `/space`. A visitor whose session expired is handled the same way. Signing up always goes to `/space`, where the getting-started steps are.
- **Signing out** lands on `/`: the marketing home on the web, and the sign-in page in the native shells (the `/` route decides).

## How it works
- `frontend/src/main.tsx` picks `BrowserRouter` or `HashRouter` at startup, using `usesHashRouter` and `cleanPath` in `frontend/src/util/router.ts`.
- Assets load from `/` (`publicPath` in `frontend/webpack.config.js`). The Electron and iOS builds set `PUBLIC_PATH=./` (see `docs/services.md`).
- nginx (`frontend/nginx/default.conf`) sends the marketing paths, `/api/`, Active Storage and `/collab` to their services and everything else to `index.html`. It already did this, so it didn't change. Unknown `/api/...` paths reach Rails and come back as a JSON 404. In development, webpack-dev-server's `historyApiFallback` does the same.

## Who can view and change
Not access-controlled; this is routing only. Pages behind sign-in still go through `PrivateRoute`.

## Tests
`frontend/src/util/router.test.ts`: router choice per platform, old-link rewriting, anchors left alone, and the return path after sign-in (outside addresses refused). `frontend/src/view/login/LoginScreen.test.tsx`: signing in returns to the page the guard sent the visitor from, else `/space`. `backend/test/controllers/marketing_controller_test.rb`: the pages render signed out, the head script and the Open app link, only the home redirects, `WEB_URL` in development, and `robots.txt` and `sitemap.xml`.

## Known limits
- `/index.html` is redirected in the browser, not by nginx, because the Mac shell loads that path.
- Folder and document addresses are hierarchical paths (`/product/requirements`); see `hierarchical_urls.md`. Its catch-all route shows "Page not found" for an unknown path instead of redirecting to `/space`.
- Because the check is in the browser, a signed-in visitor sees the signed-out home for a moment before the redirect on a very slow device (the script runs before first paint, so normally not at all), and a visitor with JavaScript off sees the signed-out header.
- A token that has expired still counts as signed in on the marketing page; the app then sends the visitor to sign-in, which returns them to `/space`.
- `hierarchical-urls.md` in the backlog (folder-tree paths) builds on this.

## History
- Implemented 2026-11-03, fixing `/login` and `/signup` from the marketing site, which opened the app home instead because the web used a hash router.
- Verified in the browser against the local dev server: `/login`, `/signup`, `/#/tasks?view=backlog`, `/index.html`, a direct load of `/documents/1` and sidebar navigation. Not verified: the Electron and iOS builds and the Mac shell were not launched.
- 2026-11-03: signed-out `/` shows marketing on the web; the Mac login screen opens on a native sign-up form (name, email, password, then signs in). Dev boot creates `test@example.com` / `password123` (`backend/db/dev_user.rb`). `tsc -b`, `npm run lint` (warnings only), Jest (660) and `swift build` passed; Rails tests and the browser/Mac app were not run.
- Deployment: on main, which deploys through Coolify once CI passes (see [deployment.md](../deployment.md)); whether this change is live in production was not checked.
- 2026-11-07 (branch `backlog/logged-out-visitors-see-marketing-pages`, not deployed): marketing pages mark a signed-in visitor and offer "Open app", the home redirects straight to `/space` instead of the old `/workspace` path, sign-in returns to the page the guard sent the visitor from, and signing out lands on `/`. Not verified: `rails test` (the new marketing test has only had `ruby -c`), `npm run lint`, `tsc -b`, the real Jest suite, and the pages in a browser (signed in and out, light and dark, 375px, and the Electron, iOS and Mac shells).
