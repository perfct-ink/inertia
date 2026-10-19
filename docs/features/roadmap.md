# Roadmap

## What it does
`/roadmap` (sidebar rail "Roadmap") shows initiatives and epics two ways, switched by tabs (`?view=timeline` default, `?view=board`).

- **Timeline**: one lane per milestone in target-date order (undated last), then a "No milestone" lane if anything is left. Each initiative is followed by its epics; epics under no initiative follow. An epic under an initiative stays in its initiative's lane regardless of its own milestone (`roadmapLanes`, `data/roadmap.ts`). All lanes share one month-aligned axis (`roadmapRange`, passed as the `Timeline` `range` prop) so bars line up. A lane header shows the milestone title, date, health badge and percent; a lane with no rows says nothing is planned. Initiative bars take a yellow (at risk) or red (off track) style from their health. The timeline is read-only (no drag).
- **Now / Next / Later board**: needs no dates. A card's column is its own `horizon` if set; otherwise derived (`effectiveHorizon`): active status or a start date today or earlier is Now, a start within 90 days is Next, anything else or undated is Later. Cards are initiatives plus epics with no initiative; finished work (status done, or all tasks done) is omitted, and an initiative card shows its epic count, target date, task progress and health badge. Drag a card to a column, or use the card's select (keyboard path); "Automatic" clears the hand placement.
- **Health**: `Initiative#health` uses the `PlanningHealth` rule shared with milestones and objectives: on track if done, 100%, or undated; off track if the target date has passed; at risk if the target is within 14 days and under 75% done. Initiative percent is done tasks over tasks under its epics. Shown with the shared `HealthBadge` (`components/ui/HealthBadge.tsx`), which the milestones page also uses.

## API and models
- `initiatives.horizon` and `epics.horizon`: nullable integer enum `now/next/later` (`RoadmapHorizon` concern, prefix `horizon_`, invalid values rejected, null allowed). Permitted in `InitiativesController` and `EpicsController` and returned by their blueprints.
- `InitiativeBlueprint` also returns `health` (and task counts).
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
- Only a month axis. Quarter zoom on the roadmap is not built; the Gantt zoom item (`docs/backlog/gantt-zoom-and-weekends.md`) covers the shared `Timeline`.
- Timeline rows and board cards are not editable beyond the horizon; dates change on the Initiatives and Epics pages.
- Board ordering inside a column is not saved or controllable.

## History
- Implemented 2026-10-17 (timeline lanes, board, health). Committed locally; not pushed or deployed.
- Not implemented: quarter zoom.
- Not verified: no tests, lint, type-check, migration or browser run (no dependencies installed, no network).
