---
priority: p1
depends_on: []
components: [frontend]
---
# Reconcile the "UI component organization" section of `AGENTS.md` with the Views rules

## Objective

Reconcile the "UI component organization" section of `AGENTS.md` with the Views rules

## Requirements / notes

Pages now live in `frontend/src/view/<name>/` per "Views" and "Frontend Views". The UI-component section still says React screens belong in `components/screens/` and auth UI in `components/auth/`; update that text.

## Context

Section "Frontend conventions follow-up" of the retired shared backlog.

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

## Acceptance criteria

- Reconcile the "UI component organization" section of `AGENTS.md` with the Views rules works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
