---
priority: p1
depends_on: []
components: [frontend, backend, deploy]
branch: backlog/logged-out-visitors-see-marketing-pages
status: incomplete
---
# Logged-out visitors see the marketing pages

## Objective
A visitor who is not logged in sees the marketing pages (home, features, pricing, about) when they open the site, not the app's login screen or an empty app shell. A logged-in user opening the root goes to the app.

## Context
Rails renders the marketing pages (`backend/app/controllers/marketing_controller.rb`), and nginx proxies the exact paths `/`, `/features`, `/pricing`, `/about`, `robots.txt` and `sitemap.xml` to Rails; everything else is the static SPA. nginx and Rails don't know who is logged in, so the root always shows the same thing, and the SPA decides on the client. This is the open question left in `clean-urls-no-index-html-or-hashes.md`, and why this depends on it.

## Requirements
- Decide how the server learns the session: a session cookie nginx or Rails can see (preferred), or a client-side redirect from the SPA. Document the choice.
- Logged out at `/`: marketing home. Logged in at `/`: redirect to the app (`/space`).
- Logged-out visitors to an app path (e.g. `/space`) still go to login and return to that path afterwards; the marketing pages stay public and indexable.
- Marketing pages link to Login / Sign up, and show an "Open app" link when logged in.
- Logging out lands on the marketing home.
- Electron and iOS builds have no marketing site and keep opening at login or the app.
- Marketing pages stay server-rendered, with no auth call blocking SEO crawlers.

## Acceptance criteria
- Logged out, `/` shows the marketing home; `/features`, `/pricing` and `/about` also render.
- Logged in, `/` ends at the app.
- Logged out, `/space` ends at login, and logging in returns to `/space`.
- After logout the user sees the marketing home.
- `robots.txt` and `sitemap.xml` are unchanged for crawlers.
- Tests cover the redirect rules; the nginx or Rails change is documented in `docs/`.

## Unverified

Most of this task was already on `main` (the marketing root for signed-out visitors, the sign-in redirect on `/` through a script in the page's head, `robots.txt` and `sitemap.xml`). This branch adds what was missing: the decision on how the server learns the session is written down (it doesn't: the token is in the browser, so the check is a script before first paint; see `docs/features/clean_urls.md`), the home now redirects to `/space` (it used the old `/workspace` path and, in development, the wrong origin), every marketing page offers "Open app" to a signed-in visitor, signing in returns the visitor to the page the route guard sent them from, and signing out lands on the marketing home (the sign-in page in the native shells). Tests: `util/router.test.ts` (return path), `LoginScreen.test.tsx`, `marketing_controller_test.rb`.

Ran: the static checker, the pure router tests and the login screen test in a Jest stand-in, `ruby -c`. Not run: `rails test`, `npm run lint`, `tsc -b`, the real Jest suite, and a browser.

To verify: `cd backend && rails test test/controllers/marketing_controller_test.rb && rails test`; `cd frontend && npm install && npm run lint && npx tsc -b && npm test`. Then in a browser: signed out, open `/`, `/pricing`, `/documents/1` (it should go to login and return to the document after signing in); signed in, open `/` (goes to the app) and `/pricing` (shows Open app); sign out (lands on the marketing home); in dev check the `WEB_URL` links; check the Electron, iOS and Mac shells still open at login.
