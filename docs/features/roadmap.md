# Roadmap

## What it does
`/roadmap` (sidebar rail "Roadmap") shows initiatives and epics two ways, switched by tabs (`?view=timeline` default, `?view=board`).

- **Timeline**: one lane per milestone in target-date order (undated last), then a "No milestone" lane if anything is left. Each initiative is followed by its epics; epics under no initiative follow. An epic under an initiative stays in its initiative's lane regardless of its own milestone (`roadmapLanes`, `data/roadmap.ts`). All lanes share one month-aligned axis (`roadmapRange`, passed as the `Timeline` `range` prop) so bars line up. A lane header shows the milestone title, date, health badge and percent; a lane with no rows says nothing is planned. Initiative bars take a yellow (at risk) or red (off track) style from their health. The timeline is read-only (no drag).
- **Now / Next / Later board**: needs no dates. A card's column is its own `horizon` if set; otherwise derived (`effectiveHorizon`): active status or a start date today or earlier is Now, a start within 90 days is Next, anything else or undated is Later. Cards are initiatives plus epics with no initiative; finished work (status done, or all tasks done) is omitted, and an initiative card shows its epic count, target date, task progress and health badge. Drag a card to a column, or use the card's select (keyboard path); "Automatic" clears the hand placement.
- **Health**: `Initiative#health` uses the `PlanningHealth` rule shared with milestones and objectives: on track if done, 100%, or undated; off track if the target date has passed; at risk if the target is within 14 days and under 75% done. Initiative percent is done tasks over tasks under its epics. Shown with the shared `HealthBadge` (`components/ui/HealthBadge.tsx`), which the milestones page also uses.

- **Share read-only link**: a "Share read-only link" button next to the title makes one public link per Space (`/shared/<token>`); it then shows the link and a "Stop sharing" button that revokes it. Anyone with the link, signed in or not, sees the milestone-lane timeline (`RoadmapTimeline`, the same component as the Timeline tab) with the Space name, and cannot edit. The link shows titles, dates, status, health and progress only: no owners, descriptions or folders (`RoadmapSnapshot`). The Now/Next/Later board is not shared.

## API and models
- `initiatives.horizon` and `epics.horizon`: nullable integer enum `now/next/later` (`RoadmapHorizon` concern, prefix `horizon_`, invalid values rejected, null allowed). Permitted in `InitiativesController` and `EpicsController` and returned by their blueprints.
- `InitiativeBlueprint` also returns `health` (and task counts).
- `GET/POST/DELETE /api/v1/roadmap_share` (signed in; POST is idempotent and needs write access) manage the Space's `Share` (polymorphic on the workspace, permission view); `GET /api/v1/shared/:token` (no auth) returns `resource.roadmap` for it. `Epic.with_task_counts` is the shared grouped count query.
- Board moves use `PATCH /api/v1/initiatives/:id` and `PATCH /api/v1/epics/:id`. No new endpoints.

## Who can view and change
Scoped to the current Space. I did not check for role-based limits.

## Web entry points
`/roadmap` (`view/roadmap/RoadmapScreen.tsx`), reachable from the sidebar.

## Tests
- `backend/test/models/initiative_test.rb` (percent, health, horizon values)
- `frontend/src/data/roadmap.test.ts` (effective horizon, board columns, lanes, shared range)
- `frontend/src/view/roadmap/RoadmapScreen.test.tsx` (board placement via picker, timeline lanes with health)
- `frontend/src/view/milestones/MilestonesScreen.test.tsx` (health on the milestones page)
- No test for the `PlanningHealth` concern on its own, or for epic horizon.

## Known limits
- Anyone holding the link can read the roadmap until it is revoked; there is no expiry, password or per-viewer log. Revoking and sharing again makes a new token.
- The shared page has no sign-in prompt, branding or board view.
- Only a month axis. Quarter zoom on the roadmap is not built; the Gantt zoom item (`docs/backlog/gantt-zoom-and-weekends.md`) covers the shared `Timeline`.
- Timeline rows and board cards are not editable beyond the horizon; dates change on the Initiatives and Epics pages.
- Board ordering inside a column is not saved or controllable.

## History
- Implemented 2026-10-17 (timeline lanes, board, health). Committed locally; not pushed or deployed.
- Not implemented: quarter zoom.
- Not verified: no tests, lint, type-check, migration or browser run (no dependencies installed, no network).
- Shareable link added 2026-10-19 on branch `backlog/shareable-read-only-roadmap-link-external-stakeholders`, not merged. Tests: `roadmap_shares_controller_test.rb`, `RoadmapShare.test.tsx`, `SharedScreen.test.tsx`, `data/share.test.ts`. Not verified: Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules).
