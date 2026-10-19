---
priority: p1
depends_on: []
components: [frontend, backend]
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
