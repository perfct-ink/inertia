---
priority: p1
depends_on: []
components: [frontend, backend]
---
# Choose which features a Space uses

## Objective

**Choose which features a Space uses** when creating or editing it, e.g. Sprints, Milestones, Initiatives, OKRs, Roadmap, Events

## Current state

Not present. `workspaces` has only name, owner, root folder and `personal`; the sidebar rail shows every section to everyone.

## Requirements / notes

Default: a `features` JSON column on `workspaces` (all on for existing Spaces), a checklist in the New Space dialog and in Space settings, and the rail, quick add and screens hide what's off. Turning a feature off hides it; no data is deleted. Owners/managers edit it.

## Context

Section "Spaces: switcher and features" of the retired shared backlog.

Requested by Alex on 2026-10-18.

## Acceptance criteria

- Choose which features a Space uses works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
