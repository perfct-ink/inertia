---
branch: backlog/idea-intake-promoted-to-epic-or-initiative
priority: p0
depends_on: []
components: [frontend]
---
# Idea / feature-request intake that can be promoted to an epic or initiative

## Objective

Idea / feature-request intake that can be promoted to an epic or initiative

## Current state

Not present

## Requirements / notes

Monday: WorkForms + intake boards with approval.

## Context

Section "Product roadmap" of the retired shared backlog.

## Acceptance criteria

- Idea / feature-request intake that can be promoted to an epic or initiative works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests (internal intake only, no approval workflow). To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand), `cd frontend && npm install && npm run lint && npm test`, then try /ideas in a browser. None of that could run here (no database, no node_modules, no network). Then remove this file and merge.
