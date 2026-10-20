---
branch: backlog/number-fields-with-units-and-summaries
priority: p1
depends_on: []
components: [backend]
---
# Numbers with unit + column summary (sum, avg, min, max)

## Objective

Numbers with unit + column summary (sum, avg, min, max)

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Numbers with unit + column summary (sum, avg, min, max) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests; the summary maths pass in a stand-in runner. To verify: `cd backend && bundle install && rails db:migrate && rails test` (diff `schema.rb`, edited by hand), `cd frontend && npm install && npm run lint && npm test`, then add a number field with a unit and use the summary row in a browser. None of that could run here. Then remove this file and merge.
