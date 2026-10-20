---
branch: backlog/portfolio-view
priority: p1
depends_on: [project-details-owner-status-dates-and-a-description]
components: [frontend, backend]
---
# Portfolio view

## Objective

**Portfolio view**: every project (folder) with owner, status, health, dates, progress in one table

## Current state

Folders exist, no portfolio rollup

## Requirements / notes

Monday Portfolio (Enterprise).

## Context

Section "Portfolio, goals, resources" of the retired shared backlog.

## Acceptance criteria

- Portfolio view works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch, stacked on `backlog/project-details-owner-status-dates-and-a-description` (merge it first). To verify: `cd backend && bundle install && rails test`, `cd frontend && npm install && npm run lint && npm test`, then open /portfolio in a browser with a few projects. None of that could run here. Then remove this file and merge.
