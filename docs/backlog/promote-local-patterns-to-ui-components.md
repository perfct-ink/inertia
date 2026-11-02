---
priority: p1
depends_on: []
components: [frontend, backend]
branch: backlog/promote-local-patterns-to-ui-components
---
# Promote repeated local patterns into `components/ui`

## Objective

Promote repeated local patterns into `components/ui`

## Requirements / notes

Underline-only input/select, muted-text link, icon-size helper, danger-hover icon button, tab/segmented control, sortable table header, save-status indicator.

## Context

Section "Frontend conventions follow-up" of the retired shared backlog.

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

## Acceptance criteria

- Promote repeated local patterns into `components/ui` works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Incomplete. The agent working on this task was stopped before it finished, so the work so far is committed as it stood. Nothing was run beyond what the commit message lists. To finish: read the diff against main (`git diff origin/main...backlog/promote-local-patterns-to-ui-components`), complete the requirements and acceptance criteria above, write or update the feature doc in `docs/features/` and its README row, merge the current main in, run the checks (`cd frontend && npm install && npm run lint && npm test`, `cd backend && rails db:migrate && rails test`), then remove this file.
