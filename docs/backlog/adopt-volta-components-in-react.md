---
priority: p1
depends_on: []
components: [frontend]
status: incomplete
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

## Blocked

Deliberately not built yet: importing Volta's components is blocked by how Volta is packaged, not by Inertia's code. `backlog/volta-component-mapping-and-parity` investigated it (`docs/volta_parity.md` on that branch, "Why Volta's components are not imported" and "What importing would take"): Volta is private and unpublished, its `main` is a build output that is not committed and has no `prepare` script, its build injects unlayered CSS from JavaScript (which beats Inertia's cascade layers), it ships one big untyped UMD bundle, only about 15 of its components follow the theme, its `Modal`, `Dialog`, `Dropdown` and `DatePicker` lack keyboard handling that Inertia's wrappers already have, and 42 of its files rely on `defaultProps`, which React 19 ignores.

The conservative path, which is the present one, is tokens only, with wrappers in `components/ui` that borrow Volta's look, migrating one fully themed Volta component at a time once it is installable. Nothing in the repository changes for this task until the packaging is settled (a built package with layered CSS and fixed `defaultProps`; that parity branch files `volta-packaging-for-inertia` for it).

Decision for Alex: keep Volta as tokens plus look-alike wrappers, or invest in packaging Volta so its components can be imported. The migration steps (declare a pinned dependency, build it, load its CSS in a layer, wrap each component in `@/components/ui`, CI and Docker changes) are in that doc.
