---
priority: p2
depends_on: [rule-builder-trigger-condition-action]
---
# Actions: notify, assign, change status, move, create item, set date, create subtask

## Objective

Actions: notify, assign, change status, move, create item, set date, create subtask

## Context

Section "Automations" of the retired shared backlog.

## Acceptance criteria

- Actions: notify, assign, change status, move, create item, set date, create subtask works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
