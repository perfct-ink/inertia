---
branch: backlog/checklist-progress-on-server
priority: p1
depends_on: []
components: [macos]
---
# Store checklist progress on the server

## Objective

Store checklist progress on the server

## Requirements / notes

Today it lives in `localStorage`, so it doesn't follow the user to another device or the Mac app.

## Context

Section "Onboarding" of the retired shared backlog.

Alex asked (2026-10-18) for suggestions after signing up: create a Space and learn what Spaces are for, create a document and a Sheet, create tasks, and anything else useful. Done: a getting-started checklist on the Space home for new accounts, which also suggests inviting a teammate and opening the roadmap (see `docs/onboarding.md`).

## Acceptance criteria

- Store checklist progress on the server works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests. To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand), `cd frontend && npm install && npm run lint && npm test`, then sign up on one browser and open the checklist in another. None of that could run here. Then remove this file and merge.
