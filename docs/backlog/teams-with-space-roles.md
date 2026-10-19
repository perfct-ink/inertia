---
priority: p1
depends_on: []
---
# Teams: groups of users that can be granted a role in a Space

## Objective

Teams: groups of users that can be granted a role in a Space

## Requirements / notes

Builds on `workspace_memberships` (see `docs/spaces.md`).

## Context

Section "Frontend conventions follow-up" of the retired shared backlog.

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

## Acceptance criteria

- Teams: groups of users that can be granted a role in a Space works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
