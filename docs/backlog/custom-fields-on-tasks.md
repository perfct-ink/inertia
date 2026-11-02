---
priority: p1
depends_on: []
components: [backend]
branch: backlog/custom-fields-on-tasks-v2
---
# Custom fields on tasks

## Objective

**Custom fields on tasks**, reusing the `table_fields` type system

## Requirements / notes

Pushback in the Jira doc still applies; Monday parity requires it.

## Context

Section "Item fields (Monday "column types")" of the retired shared backlog.

Today a task has a fixed field set: title, description, status, due date, assignee, epic, folder, parent, position. The relational tables feature (`table_fields`, `DATA_TYPES = text integer number boolean date datetime relation`) is the natural base for custom fields on tasks.

## Acceptance criteria

- Custom fields on tasks works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Incomplete. The agent working on this task was stopped before it finished, so the work so far is committed as it stood. Nothing was run beyond what the commit message lists. To finish: read the diff against main (`git diff origin/main...backlog/custom-fields-on-tasks-v2`), complete the requirements and acceptance criteria above, write or update the feature doc in `docs/features/` and its README row, merge the current main in, run the checks (`cd frontend && npm install && npm run lint && npm test`, `cd backend && rails db:migrate && rails test`), then remove this file.
