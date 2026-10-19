---
priority: p2
depends_on: [rule-builder-trigger-condition-action]
---
# Recipe templates (e.g. "when all subtasks done, mark parent done"; "when epic done, update milestone health")

## Objective

Recipe templates (e.g. "when all subtasks done, mark parent done"; "when epic done, update milestone health")

## Requirements / notes

Rollup recipes tie into `docs/features/milestones_and_rollups.md`.

## Context

Section "Automations" of the retired shared backlog.

## Acceptance criteria

- Recipe templates (e.g. "when all subtasks done, mark parent done"; "when epic done, update milestone health") works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
