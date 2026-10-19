---
priority: p1
depends_on: [task-priority-effort-and-story-points]
components: [frontend]
---
# Workload view

## Objective

**Workload view**: assigned effort per person per week, over-allocation warnings

## Current state

`assignee_id` exists, no effort field

## Requirements / notes

Needs `task-priority-effort-and-story-points.md` (effort).

## Context

Section "Portfolio, goals, resources" of the retired shared backlog.

## Acceptance criteria

- Workload view works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
