---
branch: backlog/saved-views-per-user-and-shared-views-saved-filters
priority: p1
depends_on: []
components: [frontend]
---
# Saved views per user and shared views, saved filters

## Objective

Saved views per user and shared views, saved filters

## Current state

None

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Saved views per user and shared views, saved filters works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests for the task table only, stacked on `backlog/table-view-inline-editing` (which is stacked on `backlog/pivot-view`); merge those first. Other pages (Workboard filters, Timeline, Calendar) can adopt it by adding their name to `SavedView::PAGES` and mounting `SavedViews`. To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand), `cd frontend && npm install && npm run lint && npm test`, then save and share a view in /task-table in a browser. None of that could run here. Then remove this file and merge.
