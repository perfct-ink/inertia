# Marketing pages: cacheable CSS and JavaScript

## What it does
The Rails-rendered marketing pages (`/`, `/features`, `/pricing`, `/about`) load their styles and script from files the browser caches, not from inline code:
- `backend/app/marketing_assets/marketing.css` and `marketing.js`, served by `MarketingController#asset` at `/marketing-<12 hex digest>.css` and `.js` with `Cache-Control: public, max-age=31536000, immutable`. The address carries a digest of the file (`MarketingAssets`), so a changed file has a new address and a wrong digest is a 404.
- Still inline, because they must run before first paint or are data: the snippet that applies the stored theme, and the JSON-LD structured data. The mailer layout keeps its `<style>` for email clients.
- The signed-in redirect now reads the app address from `<meta name="inertia-redirect">` (home page only), which the script follows for a signed-in visitor.
- nginx forwards the digest addresses to Rails (`frontend/nginx/default.conf`, before the static-file location).
- Pages still work without JavaScript (the CSS follows the system theme with `light-dark()`; the toggle stays hidden).

## API and models
`MarketingAssets` (`app/services/marketing_assets.rb`), route `marketing-:digest.:format`, `MarketingController#asset`.

## Who can view and change
Public.

## Tests
`backend/test/controllers/marketing_controller_test.rb`: no `<style>`, only the theme snippet and JSON-LD inline, the stylesheet and script fetched from their digest addresses with the cache header and content types, a wrong digest is 404.

## Known limits
- `frontend/index.html`'s crash-net script is still inline.
- Not run: the Rails tests, nginx, and a look at the pages at 375px and desktop in light and dark.

## History
- 2026-11-10: built on branch `backlog/marketing-pages-assets-from-files`; unverified; not deployed.
