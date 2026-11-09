---
priority: p2
depends_on: []
components: [frontend]
branch: backlog/dashboards-across-folders-boards
status: incomplete
---
# Dashboards across folders/boards

## Objective

Dashboards across folders/boards

## Context

Section "Dashboards and reporting" of the retired shared backlog.

## Acceptance criteria

- Dashboards across folders/boards works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Done: the Dashboard page at `/dashboard` (icon rail "Dashboard"), computed in the browser from existing read endpoints, no backend change and no migration. It follows the open project like every page, with a folder picker (`?folder=<id>`) that narrows to a folder inside it; summary tiles, a card per folder (project icon and status), Task board (configured status names and colors), Roadmap board, Sprint board, Milestones and Coming up. Read-only, so it shows only what the lists already return to the signed-in person. Documented in `docs/features/dashboard.md`.

Interpretation (Alex may want something else): the spec was one line, so this is a fixed-layout summary with a single-folder scope, not user-built dashboards. Arranging widgets is `dashboard-widgets.md`, which was not built.

Ran: `JEST_STUB_NET=1 /tmp/runner/all.sh` (static parse and import checks, SCSS compile, the pure data tests including `data/dashboard.test.ts`) and the offline Jest stand-in for `view/dashboard/DashboardScreen.test.tsx`, `SidebarRail.test.tsx`, `data/milestone.test.ts` and `data/roadmap.test.ts`.

Not run (no network, node_modules or database): `npm run lint`, the TypeScript type-check, the real Jest suite, a browser check.

To verify:
```bash
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```
Then open `/dashboard` at 375px and desktop width, in light and dark mode, once with no project open and once inside a project: the tiles wrap two across on a phone with no sideways scroll, the folder picker narrows every section, the links open the folder page, Workboard, roadmap board, sprint and milestones, and stopping the API shows the inline error. Remove this file when merged and verified.
