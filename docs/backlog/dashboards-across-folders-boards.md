---
priority: p2
depends_on: []
branch: backlog/dashboards-across-folders-boards
components: [frontend]
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

## Blocked

Done: the Dashboard screen at `/dashboard` (sidebar rail "Dashboard") summarizing the Space, or one folder and its subfolders, as tiles, a per-folder list, task board / roadmap board / milestone cards and the next due tasks, all computed in the browser from existing endpoints (no backend change, no migration). Documented in `docs/features/dashboard.md`. This branch also resolves the conflict markers that main's `docs/features/README.md` carries from the merge wave (every row kept).

Interpretation (Alex may want something else): the spec was one line, so this is a fixed-layout summary with a single-folder scope, not user-built dashboards. Arranging widgets is `dashboard-widgets.md`.

Ran: `/tmp/runner/all.sh` (static parse/import checks, SCSS compile, the pure data tests including `data/dashboard.test.ts`) and the offline Jest stand-in for `view/dashboard/DashboardScreen.test.tsx`.

Not run (no network, node_modules or database): `npm run lint`, the TypeScript type-check, the full Jest suite, a browser check.

To verify and merge:
```bash
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```
Then open `/dashboard` at 375px and desktop width, in light and dark mode: check the tiles wrap two across on a phone with no sideways scroll, the folder picker narrows every section, the links open the folder page, Workboard, roadmap board and milestones, and that stopping the API shows the inline error. `git merge origin/main` first; the only shared files edited are `App.tsx` (one route), `components/file-manager/Sidebar.tsx` (one rail button), `data/task.ts`, `data/milestone.ts`, `data/roadmap.ts` (functions appended), `docs/features/README.md`.
