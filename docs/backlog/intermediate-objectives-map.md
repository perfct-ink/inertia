---
branch: backlog/intermediate-objectives-map
priority: p0
depends_on: []
---
# Intermediate Objectives Map

## Objective

**Intermediate Objectives Map** (IO Map). **P0**: Alex requested 2026-10-13

## Current state

Not present

## Requirements / notes

A visual goal tree from Goldratt's Thinking Process: one Goal at the top, 3–5 Critical Success Factors under it, Necessary Conditions under those. Drawn as a node-and-arrow map. Each node can link to OKRs (`docs/features/okrs.md`) and initiatives (`docs/features/planning_fields.md`), and shows their progress, so the map is the "why" above the roadmap.

## Context

Section "Portfolio, goals, resources" of the retired shared backlog.

## Acceptance criteria

- Intermediate Objectives Map works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests. To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand), `cd frontend && npm install && npm run lint && npm test`, then look at /objectives-map in a browser: the arrow styling was never seen. Then remove this file and merge.
