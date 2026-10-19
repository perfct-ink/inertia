---
branch: backlog/status-change-history
priority: p2
depends_on: []
---
# Status-change history (audit trail per item)

## Objective

Status-change history (audit trail per item)

## Requirements / notes

Prerequisite for `agile-reports.md`.

## Context

Section "Dashboards and reporting" of the retired shared backlog.

## Acceptance criteria

- Status-change history (audit trail per item) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests. To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand; also check the `enum` on TaskStatusChange loads), `cd frontend && npm install && npm run lint && npm test`, then change a task's status and open its history in a browser. None of that could run here. Then remove this file and merge; `agile-reports` is then unblocked.
