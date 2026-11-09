---
priority: p1
depends_on: []
components: [frontend]
---
# Adopt Volta for React frontend components

## Objective

**Adopt Volta for React frontend components**

## Requirements / notes

Token styling is already in place; adoption of the actual Volta components remains.  Use Volta as the shared component foundation through `frontend/src/components/ui`, migrating existing controls and recurring patterns centrally. Preserve HTML props, refs, accessibility, responsive layouts, light/dark themes and the 40-pixel minimum for text fields. Reuse the existing React layout and sidebar across web and the Mac WKWebView shell.

### Decision (Alex, 2026-11-09 groom)

Inertia depends on Volta **pulled from GitHub** (`github:kriogenx0/volta` in `frontend/package.json`), not npm and not copied styles. **Pin to a tagged Volta release** (Alex: "Volta should release a version"), e.g. `github:kriogenx0/volta#v3.0.0`, not a branch.

Blocked on Volta (checked 2026-11-09): Volta's `main` is at 3.0.0 (`master`, the GitHub default branch, is still 2.0.0) and has no tags. `package.json` points at `components/compiled/components.js` and lists it in `files`, but the build output isn't committed and there is no `prepare` script, so a git install gets no components. Volta first needs to cut a release: a `v3.0.0` tag whose install builds (a `prepare` script) or carries the built files.

## Context

Section "Design system: Volta" of the retired shared backlog.

Alex asked (2026-10-17, reiterated 2026-10-18) to use [Volta](https://github.com/kriogenx0/volta) for frontend components and as the design system. For the macOS version, create iOS-style native UI components that match the React versions as closely as possible. Done: the React frontend uses Volta's tokens themed with Inertia's teal palette, 4px radius, motion, SF Pro type, and button/text field styling (`frontend/src/styles/_volta.scss`, see `docs/ui-components.md`).

## Acceptance criteria

- Adopt Volta for React frontend components works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
