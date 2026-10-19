---
branch: backlog/baselines
priority: p0
depends_on: []
---
# Baselines

## Objective

**Baselines**: snapshot planned dates, show planned vs. actual bars

## Current state

Nothing exists yet.

## Context

Section "Gantt chart" of the retired shared backlog.

## Acceptance criteria

- Baselines works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests. To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, which was edited by hand), `cd frontend && npm install && npm run lint && npm test`, then in a browser save a baseline on a folder's Gantt tab, move a bar and check the planned bar stays. None of that could run here (no database, no node_modules, no network). Then remove this file and merge.
