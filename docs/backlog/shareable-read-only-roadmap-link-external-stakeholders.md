---
branch: backlog/shareable-read-only-roadmap-link-external-stakeholders
priority: p0
depends_on: []
components: [backend]
---
# Shareable read-only roadmap link (external stakeholders)

## Objective

Shareable read-only roadmap link (external stakeholders)

## Current state

`shares` table exists for documents

## Requirements / notes

Reuse the share mechanism.

## Context

Section "Product roadmap" of the retired shared backlog.

## Acceptance criteria

- Shareable read-only roadmap link (external stakeholders) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests; the default chosen is a conservative public payload (titles, dates, status, health, progress; no owners or descriptions) and no expiry. To verify: `cd backend && bundle install && rails test`, `cd frontend && npm install && npm run lint && npm test`, then share the roadmap and open the link in a private window. None of that could run here (no database, no node_modules, no network). A product call remains: whether the link should expire or support a password. Then remove this file and merge.
