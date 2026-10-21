---
priority: p1
depends_on: []
branch: backlog/cross-project-dependencies
---
# Cross-project dependencies

## Objective

Cross-project dependencies

## Current state

Not present

## Requirements / notes

Builds on `docs/features/task_dependencies.md`.

## Context

Section "Portfolio, goals, resources" of the retired shared backlog.

## Acceptance criteria

- Cross-project dependencies works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch (see `docs/features/task_dependencies.md`): links to other projects are listed and can be created, but they are not drawn on the chart and do not affect the critical path or dependency modes (the other end's dates are not loaded by the folder). Not run (no node_modules): `cd frontend && npm install && npm run lint && npm test`, and a look at a folder's Gantt tab in a browser. Then remove this file and merge.
