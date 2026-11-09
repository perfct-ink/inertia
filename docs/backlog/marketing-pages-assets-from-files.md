---
priority: p3
depends_on: []
components: [backend, frontend]
---
# Serve the marketing pages' CSS and JavaScript from cacheable files

## Objective

The Rails-rendered marketing pages load their styles and scripts from files the browser can cache, as `docs/rules/frontend.md` (Styles, Loading Scripts) asks, apart from the snippets that must run before first paint.

## Context

The rules audit (see `docs/features/rules_compliance.md`) found inline code in HTML:

- `backend/app/views/layouts/marketing.html.erb` carries a `<style>` block with all of the marketing CSS (about 130 lines) and two inline `<script>` blocks: the signed-in redirect and the light/dark toggle. The theme snippet that applies the stored theme before first paint may stay inline (the rule allows a snippet that must be inline); the rest of the CSS and the toggle logic should be files.
- `frontend/index.html` has two inline `<script>` blocks: the stored-theme snippet (must stay inline) and the last-resort crash net that paints an error when the bundle fails to load. The crash net could be a small separate file loaded first.
- `backend/app/views/layouts/mailer.html.erb` has a `<style>` block; email clients need inline or embedded CSS, so leave it.

## Requirements / notes

- Public routes are decided in `frontend/nginx/default.conf` (see `docs/project/deployment.md`): the marketing CSS and JS need a location there (or a Rails asset path nginx forwards), and the cache headers should match the other static assets.
- Keep the pages working without JavaScript (the layout already follows the system theme through CSS `light-dark()`).
- Check the marketing pages at 375px and desktop, light and dark, before and after.

## Acceptance criteria

- No `<style>` block and no non-essential inline `<script>` in the marketing layout; the files are served with long-lived cache headers and fingerprinted names (or a documented cache-busting rule).
- A request test fetches the marketing page and the stylesheet it links to.
- `docs/features/rules_compliance.md` (frontend.md rows) is updated.
