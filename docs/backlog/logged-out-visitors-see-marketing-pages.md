---
priority: p1
depends_on: [clean-urls-no-index-html-or-hashes]
components: [frontend, backend, deploy]
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
