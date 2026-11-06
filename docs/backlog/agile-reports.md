---
priority: p2
depends_on: [status-change-history]
branch: backlog/agile-reports
---
# Agile reports: burndown, velocity, cumulative flow, planned vs. unplanned

## Objective

Agile reports: burndown, velocity, cumulative flow, planned vs. unplanned

## Requirements / notes

Needs Sprints + status history.

## Context

Section "Dashboards and reporting" of the retired shared backlog.

## Acceptance criteria

- Agile reports: burndown, velocity, cumulative flow, planned vs. unplanned works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Incomplete. The agent working on this task was stopped before it finished, so the work so far is committed as it stood. Nothing was run beyond what the commit message lists. To finish: read the diff against main (`git diff origin/main...backlog/agile-reports`), complete the requirements and acceptance criteria above, write or update the feature doc in `docs/features/` and its README row, merge the current main in, run the checks (`cd frontend && npm install && npm run lint && npm test`, `cd backend && rails db:migrate && rails test`), then remove this file.
