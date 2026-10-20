---
priority: p1
branch: backlog/cards-gallery-view
depends_on: []
components: [frontend]
---
# Cards / gallery view

## Objective

Cards / gallery view

## Current state

None

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Cards / gallery view works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on `backlog/cards-gallery-view` (see `docs/features/cards_view.md`): tasks as cards on the folder page. Not run (no node_modules offline): `npm run lint`, type-check, Jest, a browser check. Run `npm install`, `npm run lint`, `npx tsc --noEmit`, `npx jest` and open `/folders/:id?view=cards`.
