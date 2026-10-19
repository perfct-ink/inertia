---
branch: backlog/reopen-getting-started-checklist
priority: p1
depends_on: []
components: [frontend]
---
# A way to reopen the checklist after hiding it

## Objective

A way to reopen the checklist after hiding it

## Requirements / notes

For example from the account menu.

## Context

Section "Onboarding" of the retired shared backlog.

Alex asked (2026-10-18) for suggestions after signing up: create a Space and learn what Spaces are for, create a document and a Sheet, create tasks, and anything else useful. Done: a getting-started checklist on the Space home for new accounts, which also suggests inviting a teammate and opening the roadmap (see `docs/onboarding.md`).

## Acceptance criteria

- A way to reopen the checklist after hiding it works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch (store action with a test, button in the account dialog without a component test). To verify: `cd frontend && npm install && npm run lint && npm test`, then hide the checklist and reopen it from the account dialog in a browser. None of that could run here. Then remove this file and merge.
