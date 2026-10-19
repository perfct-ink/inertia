---
priority: p1
depends_on: []
components: [backend]
---
# Appearance settings: light/dark/system and accent color, as Volta's `Theme` API does

## Objective

Appearance settings: light/dark/system and accent color, as Volta's `Theme` API does

## Requirements / notes

The tokens already support `data-theme` on `<html>` and a runtime `--v-accent`.

## Context

Section "Design system: Volta" of the retired shared backlog.

Alex asked (2026-10-17, reiterated 2026-10-18) to use [Volta](https://github.com/kriogenx0/volta) for frontend components and as the design system. For the macOS version, create iOS-style native UI components that match the React versions as closely as possible. Done: the React frontend uses Volta's tokens themed with Inertia's teal palette, 4px radius, motion, SF Pro type, and button/text field styling (`frontend/src/styles/_volta.scss`, see `docs/ui-components.md`).

## Acceptance criteria

- Appearance settings: light/dark/system and accent color, as Volta's `Theme` API does works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
