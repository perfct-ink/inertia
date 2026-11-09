---
priority: p1
depends_on: []
---
# Cross-project dependencies

## Objective

Cross-project dependencies

## Current state

Partly there (checked 2026-11-09): the API already allows a link between any two tasks in the same Space, across projects (`TaskDependency` checks only the workspace). The UI doesn't: a folder's Gantt only draws links with both tasks in the folder, and the dependency editor's task pickers list only that folder's tasks.

## Requirements / notes

Builds on `docs/features/task_dependencies.md`.

## Context

Section "Portfolio, goals, resources" of the retired shared backlog.

## Acceptance criteria

- Cross-project dependencies works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
