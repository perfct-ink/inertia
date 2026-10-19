---
priority: p2
depends_on: []
components: [backend]
---
# Comments ("Updates") on tasks, epics, initiatives, milestones, with @mentions and replies

## Objective

Comments ("Updates") on tasks, epics, initiatives, milestones, with @mentions and replies

## Current state

File-only extension; no backend Comment model

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Comments ("Updates") on tasks, epics, initiatives, milestones, with @mentions and replies works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
